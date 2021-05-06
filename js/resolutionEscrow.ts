import { AccountId } from "./types";

class OutcomeToBalanceMap extends Map<number, number> {
  constructor() {
    super();
  }

  decrement(outcome: number, amount: number): number {
    const currentVal = this.get(outcome);
    const newVal = currentVal - amount;
    this.set(outcome, newVal);
    return newVal;
  }

  increment(outcome: number, amount: number): number {
    const currentVal = this.get(outcome);
    const newVal = currentVal + amount;
    this.set(outcome, newVal);
    return newVal;
  }

  get(outcome: number): number {
    return super.get(outcome) ?? 0;
  }
}

export class ResolutionEscrows {
  escrowAccounts: Map<AccountId, ResolutionEscrow>;

  constructor() {
    this.escrowAccounts = new Map<AccountId, ResolutionEscrow>();
  }

  get(accountId: AccountId): ResolutionEscrow | undefined {
    return this.escrowAccounts.get(accountId);
  }

  getOrFail(accountId: AccountId): ResolutionEscrow {
    if (!this.escrowAccounts.has(accountId)) {
      throw new Error(
        `${accountId} does not hold any LP positions in this pool`
      );
    }
    return this.escrowAccounts.get(accountId)!;
  }

  getOrNew(accountId: AccountId): ResolutionEscrow {
    if (!this.escrowAccounts.has(accountId)) {
      this.escrowAccounts.set(accountId, new ResolutionEscrow(accountId));
    }
    return this.escrowAccounts.get(accountId)!;
  }

  remove(accountId: AccountId): void {
    this.escrowAccounts.delete(accountId);
  }

  set(accountId: AccountId, escrowAccount: ResolutionEscrow): void {
    this.escrowAccounts.set(accountId, escrowAccount);
  }
}

export class ResolutionEscrow {
  valid: number;
  invalid: number;
  accountId: string;
  lpSpent: OutcomeToBalanceMap;
  spent: OutcomeToBalanceMap;

  constructor(accountId: AccountId) {
    this.accountId = accountId;
    this.valid = 0;
    this.invalid = 0;
    this.lpSpent = new OutcomeToBalanceMap();
    this.spent = new OutcomeToBalanceMap();
  }

  getSpent(outcome: number): number {
    return this.spent.get(outcome);
  }

  getLpSpent(outcome: number): number {
    return this.lpSpent.get(outcome);
  }

  subFromSpent(outcome: number, amount: number): number {
    return this.spent.decrement(outcome, amount);
  }

  addToSpent(outcome: number, amount: number): number {
    return this.spent.increment(outcome, amount);
  }

  subFromLpSpent(outcome: number, amount: number): number {
    return this.lpSpent.decrement(outcome, amount);
  }

  addToLpSpent(outcome: number, amount: number): number {
    return this.lpSpent.increment(outcome, amount);
  }

  addToEscrowInvalid(amount: number): number {
    this.invalid += amount;
    return this.invalid;
  }

  addToEscrowValid(amount: number): number {
    this.valid += amount;
    return this.valid;
  }

  subFromEscrowInvalid(amount: number): number {
    this.invalid -= amount;
    return this.invalid;
  }

  subFromEscrowValid(amount: number): number {
    this.valid -= amount;
    return this.valid;
  }

  lpOnExit(outcome: number, spentOnExitShares: number): number {
    this.subFromLpSpent(outcome, spentOnExitShares);
    return this.addToSpent(outcome, spentOnExitShares);
  }

  lpOnJoin(
    outcome: number,
    spentOnOutcome: number,
    spentOnAmountOut: number
  ): number {
    const lpSpentToAdd = spentOnOutcome - spentOnAmountOut;
    this.addToLpSpent(outcome, lpSpentToAdd);
    return this.addToSpent(outcome, spentOnAmountOut);
  }
}
