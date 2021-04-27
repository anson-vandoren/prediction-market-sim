import { AccountId } from "./types";

/**
 * represents an account's balance in a certain outcome, or share of the pool's provided liquidity
 */
export class MintableFungibleToken {
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

  /**
   * creates `amount` tokens for this outcome and assigns ownership to `accountId`
   * @param {AccountId} accountId
   * @param {number} amount
   */
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

  /**
   * destroys `amount` tokens for this outcome that were previously held by `accountId`
   * @param {AccountId} accountId
   * @param {number} amount
   */
  burn(accountId: AccountId, amount: number): void {
    const balance = this.accounts.get(accountId) ?? 0;
    if (balance < amount) {
      throw new Error(
        `cannot burn ${amount} of ${this.outcomeId} token, only have ${balance}`
      );
    }

    this.accounts.set(accountId, balance - amount);
    this.totalSupply -= amount;

    console.log(`user ${accountId} burned ${amount} tokens`);
  }

  /**
   * removes `accountId` from this token and returns the balance.
   * tokens are neither minted nor burned, but caller must ensure tokens
   * are appropriately transferred after this function returns.
   *
   * equivalent to `withdraw(accountId, getBalance(accountId))` followed by removing the empty account
   * @param {AccountId} accountId
   * @returns {number}: balance of this token accountId possessed before removal
   */
  removeAccount(accountId: AccountId): number {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`cannot remove accountId=${accountId} - doesn't exist`);
    }
    this.accounts.delete(accountId);
    return account;
  }

  deposit(receiverId: AccountId, amount: number): void {
    if (amount <= 0) {
      throw new Error("Cannot deposit 0 or lower");
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
