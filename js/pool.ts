import { MintableFungibleToken } from "./tokens";
import { AccountId, OptionalAccount } from "./types";
import { ResolutionEscrows } from "./resolutionEscrow";
import { newtonRaphson } from "@fvictorio/newton-raphson-method";
import { Big } from "big.js";
import { logger } from "./logger";

export const MIN_OUTCOMES = 2;
export const MAX_OUTCOMES = 3; // may increase this later

export class Pool {
  outcomes: number; // number of outcomes for this pool
  outcomeTokens: Map<number, MintableFungibleToken>; // map of outcomeId -> Token for each outcome
  poolToken: MintableFungibleToken; // the liquidity pool token
  swapFee: number; // transaction fee associated with buying/selling outcome tokens (between 0-1)
  withdrawnFees: Map<AccountId, number>; // pool fees already withdrawn on a per-liquidity-provider basis
  totalWithdrawnFees: number; // total of all fees withdrawn by liquidity providers from the pool
  feePoolWeight: number; // TODO: need to figure out precisely what this is and probably name it better
  resolutionEscrow: ResolutionEscrows; // details about users of this pool

  constructor(outcomes: number, swapFee: number) {
    // bounds-check outcomes
    if (outcomes < MIN_OUTCOMES || outcomes > MAX_OUTCOMES) {
      throw new RangeError(
        `must have between ${MIN_OUTCOMES} and ${MAX_OUTCOMES} outcomes for a pool`
      );
    }
    // bounds-check swapFee
    if (swapFee < 0 || swapFee >= 1) {
      throw new RangeError(`invalid swap fee ${swapFee}. Must be in [0, 1)`);
    }

    this.swapFee = swapFee;
    this.outcomes = outcomes;
    this.outcomeTokens = new Map<number, MintableFungibleToken>(
      [...Array(outcomes).keys()].map((outcomeId) => [
        outcomeId,
        new MintableFungibleToken(outcomeId, 0),
      ])
    );
    this.poolToken = new MintableFungibleToken(outcomes, 0);
    this.withdrawnFees = new Map<AccountId, number>();
    this.feePoolWeight = 0;
    this.totalWithdrawnFees = 0;
    this.resolutionEscrow = new ResolutionEscrows();
    logger.logPool(this);
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
  getOutcomeBalance(accountId: AccountId, outcome: number): number {
    return this.outcomeTokens.get(outcome)?.getBalance(accountId) ?? 0;
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
  getOutcomeBalances(): number[] {
    return Array.from(
      this.outcomeTokens.values()
    ).map((token: MintableFungibleToken) =>
      token.getBalance(this.getOwnAccount())
    );
  }

  /**
   *
   * @param {AccountId} sender
   * @param {number} collateralIn
   * @param {number[]} weightIndication: higher weight implies lower probability
   */
  addLiquidity(
    sender: AccountId,
    collateralIn: number,
    weightIndication?: number[]
  ): void {
    if (collateralIn < this.minLiquidityAmount()) {
      throw new RangeError(`Must add at least ${this.minLiquidityAmount()}`);
    }
    const outcomeTokensToReturn: number[] = [];

    let toMint: number;
    if (this.poolToken.totalSupply === 0) {
      // new pool, need to set weights
      if (!weightIndication) {
        throw new Error("must provide weights for new pool");
      }
      if (weightIndication.length !== this.outcomes) {
        throw new Error(
          `invalid weights - expected ${this.outcomes} but got ${weightIndication.length}`
        );
      }

      // for the highest weight (least likely outcome), return no tokens
      // if tokens are equally weighted at the start, also return no tokens
      // return a portion of more likely outcome tokens to the liquidity provider
      const maxWeight = Math.max(...weightIndication);
      weightIndication.forEach((weight) => {
        const leaveInPool = collateralIn * (weight / maxWeight);
        const returnToSender = collateralIn - leaveInPool;
        outcomeTokensToReturn.push(returnToSender);
      });
      toMint = collateralIn;
    } else {
      // the pool is already created
      if (weightIndication) {
        throw new Error(
          "pool is already initialized, cannot set weight indications"
        );
      }
      const outcomeBalances = this.getOutcomeBalances();
      const maxOutcomeBalance = Math.max(...outcomeBalances);
      const poolSupply = this.poolToken.totalSupply;

      outcomeBalances.forEach((outcomeBalance) => {
        // when providing liquidity, don't want to change the odds of the pool, so need to
        // return some of the less-likely token(s) to maintain the same ratio
        const leaveInPool = collateralIn * (outcomeBalance / maxOutcomeBalance);
        const returnToSender = collateralIn - leaveInPool;
        // for highest balance outcome token, remaining === totalIn, so outcomeTokensToReturn[highestBalanceOutcome] === 0
        // for the other outcome token, return totalIn(1 - thisOutcomeTokens/otherOutcomeTokens), for 2-outcome pool
        // no outcome tokens will be returned if the outcomes are evenly matched, otherwise some of the more
        // likely outcome token(s) will be returned
        outcomeTokensToReturn.push(returnToSender);
      });

      // TODO: I think this is essentially tracking how far the pool has drifted
      //       from initial weights, but need to investigate further.
      //       From initial run-through, it's worse to provide liquidity later
      //       in pool life if the pool resolves at the higher probability outcome
      toMint = (collateralIn * poolSupply) / maxOutcomeBalance;
    }

    this.mintAndTransferOutcomeToken(
      sender,
      collateralIn,
      outcomeTokensToReturn
    );
    this.mintPoolTokens(sender, toMint);

    logger.logPool(this);
    logger.logTransaction(
      logger.TransactionType.AddLiquidity,
      sender,
      collateralIn,
      toMint,
      this.outcomes
    );
  }

  mintAndTransferOutcomeToken(
    sender: AccountId,
    totalIn: number,
    outcomeTokensToReturn: number[]
  ): void {
    const escrowAccount = this.resolutionEscrow.getOrNew(sender);

    outcomeTokensToReturn.forEach((tokenAmt: number, outcomeIdx: number) => {
      // in theory, the LP is spending totalIn/numOutcomes per outcome, for a total provided (but not received back
      // as outcome tokens) of totalIn
      const spentOnThisOutcome = totalIn / this.outcomes; // (totalIn / 2) for 2-outcome case
      // since the LP is providing liquidity, they don't receive their totalIn back as outcome tokens - some is
      // kept locked as liquidity. `spentOnReturnedTokens` is the amount from `totalIn` which has actually
      // gone to purchasing `tokenAmt` of this outcome token that will be returned at the end of this transaction
      const spentOnReturnedTokens =
        tokenAmt > 0 ? (spentOnThisOutcome / totalIn) * tokenAmt : 0; // === tokenAmt / this.outcomes

      // keep track of how much this liquidity provider has provided as liquidity, and how much of that
      // they already received back as outcome tokens
      escrowAccount.lpOnJoin(
        outcomeIdx,
        spentOnThisOutcome,
        spentOnReturnedTokens
      );

      const outcomeToken = this.outcomeTokens.get(outcomeIdx);
      if (!outcomeToken) {
        throw new Error(`expected to already have a token for ${outcomeIdx}`);
      }

      // adding $10 liquidity means 10 tokens for each outcome are minted
      outcomeToken.mint(this.getOwnAccount(), totalIn);

      // some of the newly minted outcome tokens may be transferred to the liquidity provider
      if (tokenAmt > 0) {
        outcomeToken.safeTransferInternal(
          this.getOwnAccount(),
          sender,
          tokenAmt
        );
      }
      this.outcomeTokens.set(outcomeIdx, outcomeToken);
    });
  }

  exitPool(sender: AccountId, poolTokensToExit: number): number {
    const balances = this.getOutcomeBalances();
    const poolTokenSupply = this.poolToken.totalSupply;
    const senderPoolTokenBalance = this.poolToken.getBalance(sender);

    if (poolTokensToExit > senderPoolTokenBalance) {
      throw new Error(
        `cannot exit pool for ${poolTokensToExit}, only have ${senderPoolTokenBalance}`
      );
    }

    const escrowAccount = this.resolutionEscrow.getOrFail(sender);

    const lpTokenExitRatio = poolTokensToExit / senderPoolTokenBalance; // fraction of this account's tokens to exit

    balances.forEach((outcomeBalance: number, outcomeIdx: number) => {
      // amount of collateral spent on liquidity tokens
      const currentLpSpent = escrowAccount.getLpSpent(outcomeIdx);
      // amount of collateral spent on liquidity tokens that are being taken out here
      const spentOnExitShares = lpTokenExitRatio * currentLpSpent;
      // since liquidity tokens are being converted to outcome tokens, update for collateral spent on outcome tokens
      escrowAccount.lpOnExit(outcomeIdx, spentOnExitShares);

      // TODO: just before resolution, is it possible to add a bunch of liquidity, assuming there is
      //       a non-negligible of the expected winning outcome left, to receive the majority
      //       of the remaining winning outcome tokens?
      //       A: probably not, because $1 doesn't get 1 LP token (although $1 should get some of the
      //       winning outcome token when provided as liquidity)
      const sendOut = (poolTokensToExit / poolTokenSupply) * outcomeBalance;

      // transfer the outcome token to the user in return for their liquidity tokens
      const token = this.outcomeTokens.get(outcomeIdx);
      // token must exist because it was retrieved in `this.getPoolBalances()`
      token!.safeTransferInternal(this.getOwnAccount(), sender, sendOut);
    });

    // burn liquidity tokens that are exited
    return this.burnPoolTokensReturnFees(sender, poolTokensToExit);
  }

  burnOutcomeTokensRedeemCollateral(sender: AccountId, toBurn: number): number {
    const escrowAccount = this.resolutionEscrow.getOrFail(sender);

    // TODO: this is actually sum of prices paid for each outcome...?
    const avgPricePaid = Array.from(this.outcomeTokens.entries()).reduce(
      (sum: number, [outcomeId, token]): number => {
        // balance of this outcome token held by this account
        const outcomeBalance = token.getBalance(sender);
        // total collateral spent on this outcome token by this account
        const outcomeSpent = escrowAccount.getSpent(outcomeId);

        const avgPricePaid = outcomeSpent / outcomeBalance;

        // calculate how much of this account's spend on this outcome should be subtracted because of this redemption
        const spentOnRedeemedShares = (toBurn / outcomeBalance) * outcomeSpent;

        escrowAccount.subFromSpent(outcomeId, spentOnRedeemedShares);

        // burn the outcome tokens that have been redeemed for collateral
        token.burn(sender, toBurn);

        return sum + avgPricePaid;
      },
      0
    );

    // if user paid less than 1, they have the right to claim the difference if the market turns out valid
    // if user paid more than 1, they have the right to claim the difference if the market turns out invalid
    let inEscrow: number;
    if (avgPricePaid > 1) {
      const lossPerShare = avgPricePaid - 1;
      // escrow the loss - this will be claimable if the market is invalid
      escrowAccount.addToEscrowInvalid(lossPerShare * toBurn); // TODO: previously this had -1... why?
      inEscrow = 0;
    } else if (avgPricePaid < 1) {
      const profitPerShare = 1 - avgPricePaid;
      const toEscrow = profitPerShare * toBurn; // TODO: previously this had -1, why?
      escrowAccount.addToEscrowValid(toEscrow);
      inEscrow = toEscrow;
    } else {
      inEscrow = 0;
    }

    this.resolutionEscrow.set(sender, escrowAccount);

    return inEscrow;
  }

  getAndClearBalances(accountId: AccountId): number[] {
    return Array.from(this.outcomeTokens.entries()).map(
      ([_outcomeId, token]) => {
        return token.removeAccount(accountId);
      }
    );
  }

  mintPoolTokens(to: AccountId, amount: number): void {
    this.beforePoolTokenTransfer(null, to, amount);
    this.poolToken.mint(to, amount);
  }

  burnPoolTokensReturnFees(from: AccountId, amount: number): number {
    const fees = this.beforePoolTokenTransfer(from, null, amount);
    this.poolToken.burn(from, amount);
    return fees;
  }

  beforePoolTokenTransfer(
    from: OptionalAccount,
    to: OptionalAccount,
    amount: number
  ): number {
    let fees = 0;
    if (from) {
      // on transfer or burn pool tokens
      fees = this.withdrawFees(from);
    }

    const totalSupply = this.poolToken.totalSupply;
    // ineligible fees are those that are specifically associated with this transaction (?)
    // if there are no pool tokens, there are no eligible fees, hence total amount is ineligible
    // otherwise, this transaction's fraction of the total pool supply is the fraction of total fees ineligible
    const ineligibleFeeAmt =
      totalSupply === 0 ? amount : this.feePoolWeight * (amount / totalSupply);

    if (from) {
      // on transfer or burn pool tokens
      const withdrawnFees = this.withdrawnFees.get(from);
      if (withdrawnFees == null) {
        throw new Error(`Cannot transfer/burn pool tokens for ${from}`);
      }

      // as part of the burn/transfer, the `from` account's fees will be withdrawn
      // (not including the fees generated from this transaction's amount)
      // TODO: this essentially undoes `withdrawFees()` earlier for the ineligible amount...
      this.withdrawnFees.set(from, withdrawnFees - ineligibleFeeAmt);

      logger.logWithdrawnFees(
        this.poolToken,
        from,
        withdrawnFees - ineligibleFeeAmt
      );

      this.totalWithdrawnFees -= ineligibleFeeAmt;
    } else {
      // on mint pool tokens
      // the fees from this transaction are added to total pool fees collected
      this.feePoolWeight += ineligibleFeeAmt;
    }

    if (to) {
      // on transfer or mint
      const withdrawnFees = this.withdrawnFees.get(to) ?? 0;
      this.withdrawnFees.set(to, withdrawnFees + ineligibleFeeAmt);

      logger.logWithdrawnFees(
        this.poolToken,
        to,
        withdrawnFees + ineligibleFeeAmt
      );

      this.totalWithdrawnFees += ineligibleFeeAmt;
    } else {
      // on burn pool tokens
      // LP tokens were burned, and ineligible fees for this transaction are being returned
      this.feePoolWeight -= ineligibleFeeAmt;
    }

    logger.logPool(this);

    return fees;
  }

  getFeesWithdrawable(accountId: AccountId): number {
    const poolTokenBal = this.poolToken.getBalance(accountId);
    const poolTokenTotalSupply = this.poolToken.totalSupply;
    const rawAmount =
      this.feePoolWeight * (poolTokenBal / poolTokenTotalSupply);

    const ineligibleFeeAmount = this.withdrawnFees.get(accountId) ?? 0;
    // TODO: this seems like you can join a pool with fees already collected, then
    //       immediately leave and withdraw to keep some of the fees
    return rawAmount - ineligibleFeeAmount;
  }

  /**
   * withdraws and returns `accountId`s portion of collected fees
   * @param {AccountId} accountId: account that is withdrawing fees
   * @returns {number}: portion of the fees in the pool that belong to `accountId`
   */
  withdrawFees(accountId: AccountId): number {
    const theirPoolTokens = this.poolToken.getBalance(accountId);
    const totalPoolTokens = this.poolToken.totalSupply;
    const poolRatio = theirPoolTokens / totalPoolTokens;

    const totalFeesForThisAccount = this.feePoolWeight * poolRatio;

    const previouslyWithdrawn = this.withdrawnFees.get(accountId) ?? 0;
    const withdrawableAmount = totalFeesForThisAccount - previouslyWithdrawn;

    if (withdrawableAmount > 0) {
      this.withdrawnFees.set(accountId, totalFeesForThisAccount);
      this.totalWithdrawnFees += withdrawableAmount;
      logger.logWithdrawnFees(
        this.poolToken,
        accountId,
        totalFeesForThisAccount
      );
    }

    // TODO: this seems like you can join a pool with fees already collected, then
    //       immediately leave and withdraw to keep some of the fees
    return withdrawableAmount;
  }

  /**
   * X0 * Y0 = K
   * When buying C amount of X, generate C number of new tokens on each side
   * This would no longer satisfy K, so figure out how many X tokens must be returned to maintain K invariant
   * (X0 + C - R)*(Y0 + C) = K, so
   * R = X0 + C - K/(Y0 + C), where K = X0 * Y0, so
   * R = X0 + C - X0 * (Y0 / (Y0 + C))
   * @param {number} collateralIn
   * @param {number} targetOutcomeId
   * @returns {number}
   */
  calcBuyAmount(collateralIn: number, targetOutcomeId: number): number {
    this.assertValidOutcome(targetOutcomeId);

    const outcomeBalances = this.getOutcomeBalances();
    if (collateralIn === 0 || outcomeBalances.every((x) => x === 0)) {
      return 0;
    }

    const token = this.outcomeTokens.get(targetOutcomeId);
    if (!token) {
      throw new Error(`token ${targetOutcomeId} not found`);
    }
    const targetTokenBal = token.getBalance(this.getOwnAccount());

    const investmentAmountMinusFees = collateralIn * (1 - this.swapFee);
    const newOutcomeBalance = outcomeBalances.reduce(
      (ac, outcomeBalance, outcomeId) =>
        outcomeId !== targetOutcomeId
          ? (ac * outcomeBalance) / (outcomeBalance + investmentAmountMinusFees)
          : ac * outcomeBalance,
      1
    );

    return targetTokenBal + investmentAmountMinusFees - newOutcomeBalance;
  }

  calcCollateralReturnedForSellingOutcome(
    tokensToSell: number,
    outcomeId: number
  ): number {
    this.assertValidOutcome(outcomeId);
    const token = this.outcomeTokens.get(outcomeId);
    if (!token) {
      throw new Error(`outcome '${token}' does not exist - cannot sell`);
    }
    const outcomeBalances = this.getOutcomeBalances();
    const tokensToSellBig = new Big(tokensToSell.toString());
    const sellTokenBalanceBig = new Big(outcomeBalances[outcomeId].toString());
    const otherTokenBalancesBig = outcomeBalances
      .filter((_, i) => i !== outcomeId)
      .map((x) => new Big(x.toString()));

    /**
     * For example, with three outcomes, f(r) = (y-R)*(z-R)*(x+a-R) - x*y*z = 0
     * Invariant before the sale === x * y * z
     * Invariant after the sale === (y-R)(z-R)(x-R+a)
     * , where R is collateral received + fees collected, and
     * a is the number of shares of x outcome that are being sold
     *
     * @param {} r
     * @returns {}
     */
    const f = (r: Big): Big => {
      const R = r.div(1 - this.swapFee); // R is collateral returned + fees that will be collected;
      // i.e., (z-R)*(y-R) term
      const otherDeltasProduct: Big = otherTokenBalancesBig
        .map((outcome) => outcome.minus(R))
        .reduce((a, b) => a.mul(b));
      const thisOutcomeDelta = sellTokenBalanceBig
        .plus(tokensToSellBig)
        .minus(R);
      const originalInvariant = otherTokenBalancesBig.reduce(
        (a, b) => a.mul(b),
        sellTokenBalanceBig
      );
      return otherDeltasProduct.mul(thisOutcomeDelta).minus(originalInvariant);
    };

    const r: Big = newtonRaphson(f, 0, { maxIterations: 100 });

    if (r) {
      // TODO: need a way to sell ALL shares of an outcome
      return r.toFixed(4);
    }
    throw new Error(
      `could not calculate collateral resulting from sale of ${tokensToSell} of outcome '${outcomeId}`
    );
  }

  calcSellCollateralOut(collateralOut: number, outcomeTarget: number): number {
    // TODO: what is this actually doing?
    this.assertValidOutcome(outcomeTarget);

    const outcomeTokens = this.outcomeTokens;
    const collateralOutPlusFees = collateralOut / (1 - this.swapFee);
    const tokenToSell = outcomeTokens.get(outcomeTarget);
    if (!tokenToSell) {
      throw new Error(`couldn't find outcome token '${outcomeTarget}'`);
    }
    const tokenToSellBalance = tokenToSell.getBalance(this.getOwnAccount());
    let newSellTokenBalance = tokenToSellBalance;

    outcomeTokens.forEach((token, outcome) => {
      if (outcome != outcomeTarget) {
        const balance = token.getBalance(this.getOwnAccount());
        const dividend = newSellTokenBalance * balance;
        const divisor = balance - collateralOutPlusFees;

        newSellTokenBalance = dividend / divisor;
      }
    });
    if (newSellTokenBalance <= 0) {
      throw new Error("error - math approximation");
    }

    let outcomeSharesToSell =
      collateralOutPlusFees + newSellTokenBalance - tokenToSellBalance;
    console.log(
      `to receive $${collateralOut} would need to sell ${outcomeSharesToSell} shares of outcome '${outcomeTarget}'`
    );
    return outcomeSharesToSell;
  }

  buy(sender: AccountId, amountIn: number, outcomeTarget: number): void {
    this.assertValidOutcome(outcomeTarget);

    const sharesOut = this.calcBuyAmount(amountIn, outcomeTarget);
    if (sharesOut < this.minOutcomesBought()) {
      throw new Error(`must buy at least ${this.minOutcomesBought()} shares`);
    }

    const escrowAccount = this.resolutionEscrow.getOrNew(sender);

    const fee = amountIn * this.swapFee;
    this.feePoolWeight += fee; // TODO: rename feePoolWeight - is it total fees collected, or fees collected that haven't been withdrawn yet?

    const spent = escrowAccount.addToSpent(outcomeTarget, amountIn - fee);
    logger.logAccountOutcomeSpent(sender, outcomeTarget, spent);

    // mint `amountIn` new tokens for each outcome
    const tokensToMint = amountIn - fee;
    this.addToPools(tokensToMint);

    // transfer the bought tokens back to the sender
    const tokenOut = this.outcomeTokens.get(outcomeTarget);
    if (!tokenOut) {
      throw new Error(`cannot buy '${tokenOut}' as it doesn't exist`);
    }
    tokenOut.safeTransferInternal(this.getOwnAccount(), sender, sharesOut);

    logger.logBuy(sender, outcomeTarget, amountIn, sharesOut, fee);
    logger.logPool(this);
  }

  sell2(
    sender: AccountId,
    sharesIn: number,
    outcomeTarget: number,
    maxSharesIn: number
  ): number {
    this.assertValidOutcome(outcomeTarget);
    // TODO: this isn't right?
    // const sharesIn = this.calcSellCollateralOut(amountOut, outcomeTarget);
    const amountOut = this.calcCollateralReturnedForSellingOutcome(
      sharesIn,
      outcomeTarget
    );

    if (sharesIn > maxSharesIn) {
      throw new Error(
        `cannot sell ${sharesIn} as it's above maxSharesIn=${maxSharesIn}`
      );
    }
    const tokenIn = this.outcomeTokens.get(outcomeTarget);
    if (!tokenIn) {
      throw new Error(`no token for outcome '${outcomeTarget}'`);
    }

    const escrowAccount = this.resolutionEscrow.getOrFail(sender);
    const spent = escrowAccount.getSpent(outcomeTarget);
    // TODO: why is this based on `spent`? how to tell how many shares of the outcome they actually have?
    //       use tokenIn.getBalance(sender) instead?
    if (spent <= 0) {
      throw new Error(`${sender} has no balance of outcome '${outcomeTarget}'`);
    }

    // TODO: redo math and try to fit it into resolutionEscrow... (from upstream)
    const fee = amountOut * this.swapFee;
    const avgPrice = spent / tokenIn.getBalance(sender);
    const sellPrice = (amountOut + fee) / sharesIn;

    // remove the tokens from sender and return to the pool
    tokenIn.safeTransferInternal(sender, this.getOwnAccount(), sharesIn);

    this.feePoolWeight += fee;

    let toEscrow: number;
    if (sellPrice < avgPrice) {
      const priceDelta = avgPrice - sellPrice;
      const escrowAmt = priceDelta * sharesIn;
      const invalidEscrow = escrowAccount.addToEscrowInvalid(escrowAmt);
      logger.logToInvalidEscrow(sender, invalidEscrow);

      // TODO: sub from spent and logging is done in both cases, remove dup code
      const newSpent = escrowAccount.subFromSpent(
        outcomeTarget,
        amountOut + escrowAmt + fee
      );
      logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      toEscrow = 0;
    } else if (sellPrice > avgPrice) {
      const priceDelta = sellPrice - avgPrice;
      const escrowAmt = priceDelta * sharesIn;
      const validEscrow = escrowAccount.addToEscrowValid(escrowAmt);
      logger.logToValidEscrow(sender, validEscrow);
      const entriesToSub = amountOut - escrowAmt + fee;

      // TODO: entriesToSub should never be larger than spent
      if (entriesToSub > spent) {
        const newSpent = escrowAccount.subFromSpent(outcomeTarget, spent);
        logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      } else {
        const newSpent = escrowAccount.subFromSpent(
          outcomeTarget,
          entriesToSub
        );
        logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      }

      toEscrow = escrowAmt;
    } else {
      const newSpent = escrowAccount.subFromSpent(
        outcomeTarget,
        amountOut - fee
      );
      logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      toEscrow = 0;
    }

    const tokensToBurn = amountOut + fee;
    this.removeFromPools(tokensToBurn);

    logger.logSell(sender, outcomeTarget, sharesIn, amountOut, fee, toEscrow);
    logger.logPool(this);

    return toEscrow;
  }

  sell(
    sender: AccountId,
    amountOut: number,
    outcomeTarget: number,
    maxSharesIn: number
  ): number {
    this.assertValidOutcome(outcomeTarget);
    // TODO: this isn't right?
    const sharesIn = this.calcSellCollateralOut(amountOut, outcomeTarget);

    if (sharesIn > maxSharesIn) {
      throw new Error(
        `cannot sell ${sharesIn} as it's above maxSharesIn=${maxSharesIn}`
      );
    }
    const tokenIn = this.outcomeTokens.get(outcomeTarget);
    if (!tokenIn) {
      throw new Error(`no token for outcome '${outcomeTarget}'`);
    }

    const escrowAccount = this.resolutionEscrow.getOrFail(sender);
    const spent = escrowAccount.getSpent(outcomeTarget);
    // TODO: why is this based on `spent`? how to tell how many shares of the outcome they actually have?
    //       use tokenIn.getBalance(sender) instead?
    if (spent <= 0) {
      throw new Error(`${sender} has no balance of outcome '${outcomeTarget}'`);
    }

    // TODO: redo math and try to fit it into resolutionEscrow... (from upstream)
    const fee = amountOut * this.swapFee;
    const avgPrice = spent / tokenIn.getBalance(sender);
    const sellPrice = (amountOut + fee) / sharesIn;

    // remove the tokens from sender and return to the pool
    tokenIn.safeTransferInternal(sender, this.getOwnAccount(), sharesIn);

    this.feePoolWeight += fee;

    let toEscrow: number;
    if (sellPrice < avgPrice) {
      const priceDelta = avgPrice - sellPrice;
      const escrowAmt = priceDelta * sharesIn;
      const invalidEscrow = escrowAccount.addToEscrowInvalid(escrowAmt);
      logger.logToInvalidEscrow(sender, invalidEscrow);

      // TODO: sub from spent and logging is done in both cases, remove dup code
      const newSpent = escrowAccount.subFromSpent(
        outcomeTarget,
        amountOut + escrowAmt + fee
      );
      logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      toEscrow = 0;
    } else if (sellPrice > avgPrice) {
      const priceDelta = sellPrice - avgPrice;
      const escrowAmt = priceDelta * sharesIn;
      const validEscrow = escrowAccount.addToEscrowValid(escrowAmt);
      logger.logToValidEscrow(sender, validEscrow);
      const entriesToSub = amountOut - escrowAmt + fee;

      // TODO: entriesToSub should never be larger than spent
      if (entriesToSub > spent) {
        const newSpent = escrowAccount.subFromSpent(outcomeTarget, spent);
        logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      } else {
        const newSpent = escrowAccount.subFromSpent(
          outcomeTarget,
          entriesToSub
        );
        logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      }

      toEscrow = escrowAmt;
    } else {
      const newSpent = escrowAccount.subFromSpent(
        outcomeTarget,
        amountOut - fee
      );
      logger.logAccountOutcomeSpent(sender, outcomeTarget, newSpent);
      toEscrow = 0;
    }

    const tokensToBurn = amountOut + fee;
    this.removeFromPools(tokensToBurn);

    logger.logSell(sender, outcomeTarget, sharesIn, amountOut, fee, toEscrow);
    logger.logPool(this);

    return toEscrow;
  }

  sellByOutcomeTokens(
    sender: AccountId,
    sharesIn: number,
    outcomeTarget: number
  ): number {
    const expectedCollateral = this.calcCollateralReturnedForSellingOutcome(
      sharesIn,
      outcomeTarget
    );
    return this.sell(sender, expectedCollateral, outcomeTarget, sharesIn);
  }

  payout(accountId: AccountId, payoutNumerators?: number[]) {
    const poolTokenBalance = this.getPoolTokenBalance(accountId);
    const feesEarned =
      poolTokenBalance > 0 ? this.exitPool(accountId, poolTokenBalance) : 0;

    const balances = this.getAndClearBalances(accountId);
    const escrowAccount = this.resolutionEscrow.get(accountId);
    if (!escrowAccount) {
      return 0;
    }

    let payout: number;
    // TODO: understand & validate this logic
    if (payoutNumerators) {
      payout =
        payoutNumerators.reduce((ac, num, outcomeIdx) => {
          const bal = balances[outcomeIdx];
          const payout = bal * num;
          return ac + payout;
        }, 0) + escrowAccount.valid;
    } else {
      payout =
        balances.reduce((sum, _bal, outcomeIdx) => {
          const spent = escrowAccount.getSpent(outcomeIdx);
          return sum + spent;
        }) + escrowAccount.invalid;
    }

    this.resolutionEscrow.remove(accountId);

    return payout + feesEarned;
  }

  /**
   * mints `amount` new tokens for each outcome and assigns them to the pool
   * @param {number} amount
   */
  addToPools(amount: number): void {
    this.outcomeTokens.forEach((token) => {
      token.mint(this.getOwnAccount(), amount);
    });
  }

  /**
   * burns `amount` tokens for each outcome from pool's balances
   * @param {number} amount
   */
  removeFromPools(amount: number): void {
    this.outcomeTokens.forEach((token) => {
      token.burn(this.getOwnAccount(), amount);
    });
  }

  minLiquidityAmount(): number {
    return 0.01;
  }

  minOutcomesBought(): number {
    return 0.01;
  }

  /**
   * returns the cost to buy one marginal outcome token, including the fee
   * @param {number} targetOutcome
   * @returns {number}
   */
  getSpotPrice(targetOutcome: number): number {
    return this.getSpotPriceSansFee(targetOutcome) / (1 - this.swapFee);
  }

  /**
   * returns the current price (equivalent to odds) for a given outcome, but
   * does not include the fees - i.e., price will actually be higher
   * @param {number} targetOutcome
   * @returns {number}
   */
  getSpotPriceSansFee(targetOutcome: number): number {
    // https://docs.gnosis.io/conditionaltokens/docs/introduction3/
    // oddsForOutcome = oddsWeightForOutcome / sum(oddsWeightForOutcome for every outcome)
    // const weights = this.getOutcomeBalances().map((_, outcomeId) =>
    //   this.oddsWeightForOutcome(outcomeId)
    // );
    const weights = [...this.outcomeTokens.keys()].map((_, outcomeId) =>
      this.oddsWeightForOutcome(outcomeId)
    );
    const summedWeights = weights.reduce((sum, weight) => sum + weight);
    return summedWeights === 0 ? 0 : weights[targetOutcome] / summedWeights;
  }

  /**
   * weighting for this outcome, used in odds calculation
   * @param {number} targetOutcomeId the outcomeId of interest
   * @returns {number} the weight for this outcome
   */
  oddsWeightForOutcome(targetOutcomeId: number): number {
    // oddsWeightForOutcome = product(...numOutcomeTokensInInventoryForEveryOtherOutcome)
    // https://docs.gnosis.io/conditionaltokens/docs/introduction3/
    return this.getOutcomeBalances().reduce(
      (productOfOtherBalances, thisOutcomeBalance, thisOutcomeId) => {
        if (thisOutcomeId === targetOutcomeId) {
          // ignore the balance of the token of interest
          return productOfOtherBalances;
        }
        // if product is zero (i.e., this is the first other balance considered)
        // then return this balance
        // otherwise multiply by other balances
        return (
          productOfOtherBalances * thisOutcomeBalance || thisOutcomeBalance
        );
      },
      0
    );
  }

  /**
   * throws if outcomeId isn't a valid outcome for this pool
   * @param {number} outcomeId
   */
  assertValidOutcome(outcomeId: number) {
    const maxOutcome = this.outcomes - 1;
    if (outcomeId < 0 || outcomeId > maxOutcome) {
      throw new RangeError(
        `invalid outcome - index '${outcomeId}' must be between 0 and ${maxOutcome}`
      );
    }
  }
}
