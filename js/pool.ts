type AccountId = string;

class MintableFungibleToken {
  accounts: Map<AccountId, number>;
  totalSupply: number;
  outcomeId: number;

  constructor(outcomeId: number, initialSupply: number) {
    this.outcomeId = outcomeId;
    this.totalSupply = initialSupply;
    this.accounts = new Map<AccountId, number>();
  }

  getBalance(accountId: AccountId): number {
    return this.accounts.get(accountId) ?? 0;
  }

  mint(accountId: AccountId, amount: number): void {
    this.totalSupply += amount;
    const accountBalance = this.accounts.get(accountId) ?? 0;
    const newBalance = accountBalance + amount;
    this.accounts.set(accountId, newBalance);

    console.log(`minted ${amount} new tokens for id=${this.outcomeId}`);
    console.log(
      `user ${accountId} new balance for id=${this.outcomeId} is ${newBalance}`
    );
  }

  deposit(receiverId: AccountId, amount: number): void | Error {
    if (amount <= 0) {
      return new Error("Cannot deposit 0 or lower");
    }

    const receiverBalance = this.accounts.get(receiverId) ?? 0;
    const newBalance = receiverBalance + amount;

    this.accounts.set(receiverId, newBalance);
  }

  withdraw(senderId: AccountId, amount: number): void | Error {
    const senderBalance = this.accounts.get(senderId) ?? 0;

    if (amount <= 0) {
      return new Error("Cannot withdraw 0 or lower");
    }
    if (amount > senderBalance) {
      return new Error("Not enough balance");
    }

    const newBalance = senderBalance - amount;
    this.accounts.set(senderId, newBalance);
  }

  safeTransferInternal(
    senderId: AccountId,
    receiverId: string,
    amount: number
  ): void {
    this.withdraw(senderId, amount);
    this.deposit(receiverId, amount);
  }
}

class Account {
  entries: Map<number, number>;
  lpEntries: Map<number, number>;

  constructor() {
    this.entries = new Map<number, number>();
    this.lpEntries = new Map<number, number>();
  }
}

class Pool {
  outcomes: number;
  outcomeTokens: Map<number, MintableFungibleToken>;
  poolToken: MintableFungibleToken;
  collateralDenomination: number;
  accounts: Map<string, Account>;
  withdrawnFees: Map<AccountId, number>;
  feePoolWeight: number;
  totalWithdrawnFees: number;

  constructor(collateralDecimals: number, outcomes: number) {
    this.outcomes = outcomes;
    this.outcomeTokens = new Map<number, MintableFungibleToken>();
    this.poolToken = new MintableFungibleToken(outcomes, 0);
    this.collateralDenomination = Math.pow(10, collateralDecimals);
    this.accounts = new Map<string, Account>();
    this.withdrawnFees = new Map<AccountId, number>();
    this.feePoolWeight = 0;
    this.totalWithdrawnFees = 0;
  }

  getOwnAccount(): AccountId {
    // on NEAR, would be this contract's address
    return "poolOwner";
  }

  /**
   * number of shares currently owned by `accountId` for given `outcome` token
   * @param {string} accountId: name of account holder
   * @param {number} outcome: index of outcome of interest
   * @returns {number}: current balance of `outcome` tokens owned by `accountId`
   */
  getShareBalance(accountId: AccountId, outcome: number): number {
    if (outcome in this.outcomeTokens) {
      return this.outcomeTokens[outcome].getBalance(accountId);
    }
    return 0;
  }

  /**
   * number of pool tokens owned by `accountId`
   * @param {string} accountId: name of account holder
   * @returns {number}: current balance of pool tokens owned by `accountId`
   */
  getPoolTokenBalance(accountId: AccountId): number {
    return this.poolToken.getBalance(accountId);
  }

  /**
   * array of outcome token balances currently in the pool
   * @returns {number[]}: number of each outcome token held by the pool
   */
  getPoolBalances(): number[] {
    return Array.from(this.outcomeTokens.values()).map(
      (token: MintableFungibleToken) => {
        return token.getBalance(this.getOwnAccount());
      }
    );
  }

  addLiquidity(sender: AccountId, totalIn: number): Error | void {
    if (totalIn < this.minLiquidityAmount()) {
      return new Error(`Must add at least ${this.minLiquidityAmount()}`);
    }
    const outcomeTokensToReturn: number[] = [];

    // Assume the pool is already created, otherwise would need to create starting weights
    const outcomeBalances: number[] = this.getPoolBalances();
    const highestOutcomeBalance: number = Math.max(...outcomeBalances);
    const poolSupply: number = this.poolToken.totalSupply;

    outcomeBalances.forEach((outcomeBalance) => {
      const remaining = (totalIn * outcomeBalance) / highestOutcomeBalance;
      // for highest balance outcome token, remaining === totalIn, so outcomeTokensToReturn[highestBalanceOutcome] === 0
      // for the other outcome token, return totalIn(1 - thisOutcomeTokens/otherOutcomeTokens), for 2-outcome pool
      // no outcome tokens will be returned if the outcomes are evenly matched, otherwise some of the more
      // likely outcome token(s) will be returned
      outcomeTokensToReturn.push(totalIn - remaining);
    });

    const toMint = (totalIn * poolSupply) / highestOutcomeBalance;

    this.mintAndTransferOutcomeToken(sender, totalIn, outcomeTokensToReturn);
    this.mintInternal(sender, toMint);
  }

  mintAndTransferOutcomeToken(
    sender: AccountId,
    totalIn: number,
    outcomeTokensToReturn: number[]
  ): void {
    // create new account if accountId isn't already known
    let account = this.accounts.get(sender) ?? new Account();

    outcomeTokensToReturn.forEach((tokenAmt: number, outcomeIdx: number) => {
      // incoming liquidity is split across outcome tokens
      // tokenAmt will be 0 for the token with highest number of tokens remaining in the
      //   pool (lowest probability outcome)
      // tokenAmt for the other outcome will be totalIn(1 - tokenAmt/otherTokenAmt)

      const spentOnOutcome = totalIn / this.outcomes; // (totalIn / 2) for 2-outcome case
      const spentOnAmountOut =
        tokenAmt > 0 ? (spentOnOutcome * tokenAmt) / totalIn : 0; // === tokenAmt / this.outcomes

      const lpEntryAmount = spentOnOutcome - spentOnAmountOut;
      const prevLpEntries = account.lpEntries.get(outcomeIdx) ?? 0;
      account.lpEntries.set(outcomeIdx, prevLpEntries + lpEntryAmount);

      const prevSpent = account.entries.get(outcomeIdx) ?? 0;
      const spent = prevSpent + spentOnAmountOut;
      account.entries.set(outcomeIdx, spent);

      // mint `totalIn` new tokens for EACH possible outcome
      let outcomeToken =
        this.outcomeTokens.get(outcomeIdx) ??
        new MintableFungibleToken(outcomeIdx, 0);
      outcomeToken.mint(this.getOwnAccount(), totalIn);

      if (tokenAmt > 0) {
        outcomeToken.safeTransferInternal(
          this.getOwnAccount(),
          sender,
          tokenAmt
        );
      }

      this.accounts.set(sender, account);
      this.outcomeTokens.set(outcomeIdx, outcomeToken);
    });

    this.accounts.set(sender, account);
  }



  mintInternal(to: AccountId, amount: number): void {
    this.beforePoolTokenTransfer(null, to, amount);
    this.poolToken.mint(to, amount);
  }

  beforePoolTokenTransfer(
    from: AccountId | null,
    to: AccountId | null,
    amount: number
  ): number {
    let fees = 0;
    if (from != null) {
      // on transfer or burn pool tokens
      fees = this.withdrawFees(from);
    }

    const totalSupply = this.poolToken.totalSupply;
    // ineligible fees are those that are specifically associated with this transaction (?)
    // if there are no pool tokens, there are no eligible fees, hence total amount is ineligible
    // otherwise, this transaction's fraction of the total pool supply is the fraction of total fees ineligible
    const ineligibleFeeAmt =
      totalSupply === 0 ? amount : this.feePoolWeight * (amount / totalSupply);

    if (from != null) {
      // on transfer or burn pool tokens
      const withdrawnFees = this.withdrawnFees.get(from);
      if (withdrawnFees == null) {
        throw new Error(`Cannot transfer/burn pool tokens for ${from}`);
      }

      // as part of the burn/transfer, the `from` account's fees will be withdrawn
      // (not including the fees generated from this transaction's amount)
      // TODO: this essentially undoes `withdrawFees()` earlier for the ineligible amount...
      this.withdrawnFees.set(from, withdrawnFees - ineligibleFeeAmt);
      this.totalWithdrawnFees -= ineligibleFeeAmt;
    } else {
      // on mint pool tokens
      // the fees from this transaction are added to total pool fees collected
      this.feePoolWeight += ineligibleFeeAmt;
    }

    if (to != null) {
      // on transfer or mint
      const withdrawnFees = this.withdrawnFees.get(to) ?? 0;
      this.withdrawnFees.set(to, withdrawnFees + ineligibleFeeAmt);

      this.totalWithdrawnFees += ineligibleFeeAmt;
    } else {
      // on burn pool tokens
      // LP tokens were burned, and ineligible fees for this transaction are being returned
      this.feePoolWeight -= ineligibleFeeAmt;
    }

    return fees;
  }

  /**
   * withdraws and returns `accountId`s portion of collected fees
   * @param {AccountId} accountId: account that is withdrawing fees
   * @returns {number}: portion of the fees in the pool that belong to `accountId`
   */
  withdrawFees(accountId: AccountId): number {
    const accountPoolTokens = this.poolToken.getBalance(accountId);
    const totalPoolTokens = this.poolToken.totalSupply;
    const poolRatio = accountPoolTokens / totalPoolTokens;

    const totalFeesForThisAccount = this.feePoolWeight * poolRatio;

    const previouslyWithdrawn = this.withdrawnFees.get(accountId) ?? 0;
    const withdrawableAmount = totalFeesForThisAccount - previouslyWithdrawn;

    if (withdrawableAmount > 0) {
      this.withdrawnFees.set(accountId, totalFeesForThisAccount);
      this.totalWithdrawnFees += withdrawableAmount;
    }

    return withdrawableAmount;
  }

  minLiquidityAmount(): number {
    return this.collateralDenomination / 1_000_000;
  }
}
