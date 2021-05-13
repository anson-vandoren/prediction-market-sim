export type AccountId = string;
export type OptionalAccount = AccountId | null;

export interface LiquiditySplit {
  outcomeTokens: number[];
  poolTokens: number;
}
