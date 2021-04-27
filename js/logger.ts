import { AccountId } from "./types";
import { Pool } from "./pool";
import { MintableFungibleToken } from "./tokens";

enum TransactionType {
  Buy = "BUY",
  Sell = "SELL",
  Redeem = "REDEEM",
  ClaimEarnings = "CLAIM_EARNINGS",
  AddLiquidity = "ADD_LIQUIDITY",
  RemoveLiquidity = "REMOVE_LIQUIDITY",
}

function logAccountOutcomeSpent(
  accountId: AccountId,
  outcomeId: number,
  spent: number
): void {
  const data = {
    type: "account_spent",
    action: "update",
    capId: `as_${accountId}_${outcomeId}`,
    params: {
      accountId: accountId.toString(),
      outcomeId: outcomeId.toString(),
      spent: spent.toString(),
    },
  };
  console.info(JSON.stringify(data));
}

function logTransaction(
  txType: TransactionType,
  accountId: AccountId,
  input: number,
  output: number,
  outcomeId: number
): void {
  const data = {
    type: "transactions",
    params: {
      accountId,
      input,
      output,
      outcomeId,
      date: new Date().toISOString(),
      type: txType.toString(),
    },
  };
}

function logSwap(
  accountId: AccountId,
  outcomeId: number,
  input: number,
  output: number,
  fee: number,
  swapType: TransactionType
) {
  const data = {
    type: "swaps",
    params: {
      accountId,
      outcomeId,
      input,
      output,
      fee,
      type: swapType.toString(),
    },
  };
  console.info(JSON.stringify(data));
}

function logBuy(
  accountId: AccountId,
  outcome: number,
  amountIn: number,
  sharesOut: number,
  fee: number
): void {
  logSwap(accountId, outcome, amountIn, sharesOut, fee, TransactionType.Buy);
  logTransaction(TransactionType.Buy, accountId, amountIn, sharesOut, outcome);
}

function logSell(
  accountId: AccountId,
  outcome: number,
  sharesIn: number,
  amountOut: number,
  fee: number,
  toEscrow: number
): void {
  logSwap(
    accountId,
    outcome,
    sharesIn,
    amountOut - toEscrow,
    fee,
    TransactionType.Sell
  );
  logTransaction(
    TransactionType.Sell,
    accountId,
    sharesIn,
    amountOut - toEscrow,
    outcome
  );
}

function logToEscrow(
  escrowType: string,
  sender: AccountId,
  amount: number
): void {
  const data = {
    type: "escrowStatuses",
    action: "update",
    capId: `es_${sender}`,
    params: {
      accountId: sender,
      totalAmount: amount,
      type: escrowType,
    },
  };
  console.info(JSON.stringify(data));
}

function logToInvalidEscrow(sender: AccountId, amount: number): void {
  logToEscrow("invalidEscrow", sender, amount);
}

function logToValidEscrow(sender: AccountId, amount: number): void {
  logToEscrow("validEscrow", sender, amount);
}

function logPool(pool: Pool) {
  const data = {
    type: "pools",
    action: "update",
    params: {
      outcomes: pool.outcomes,
      swapFee: pool.swapFee,
      totalWithdrawnFees: pool.totalWithdrawnFees,
      feePoolWeight: pool.feePoolWeight,
    },
  };
  console.info(JSON.stringify(data));
}
function logWithdrawnFees(
  poolToken: MintableFungibleToken,
  accountId: AccountId,
  withdrawnAmount: number
) {
  const data = {
    type: "withdrawnFees",
    params: {
      id: `wf_${poolToken.outcomeId}_${accountId}`,
      outcomeId: poolToken.outcomeId,
      accountId,
      withdrawnAmount,
    },
  };
  console.info(JSON.stringify(data));
}

export const logger = {
  logAccountOutcomeSpent,
  logBuy,
  logSell,
  logPool,
  logWithdrawnFees,
  TransactionType,
  logTransaction,
  logToValidEscrow,
  logToInvalidEscrow,
};
