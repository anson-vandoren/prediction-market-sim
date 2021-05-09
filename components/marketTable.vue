<template>
  <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
    <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
      <div
        class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg"
      >
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th colspan="5" class="text-lg py-3 font-semibold text-gray-900">
                Market Status
              </th>
            </tr>
            <tr>
              <th class="th-regular">Yes Tokens</th>
              <th class="th-regular">No Tokens</th>
              <th class="th-regular">LP Tokens</th>
              <th class="th-regular">Liquidity Collateral</th>
              <th class="th-regular">Bet Collateral</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td id="mktYesTokens">
                {{ marketStatus.yesTokens }}
              </td>
              <td id="mktNoTokens">{{ marketStatus.noTokens }}</td>
              <td id="mktLpTokens">{{ marketStatus.lpTokens }}</td>
              <td id="mktLiquidityCollateral">
                {{ marketStatus.lpCollateral }}
              </td>
              <td id="mktBetCollateral">
                {{ marketStatus.outcomeCollateral }}
              </td>
            </tr>
          </tbody>
          <thead class="bg-gray-50">
            <tr>
              <th class="th-regular" colspan="2">YES</th>
              <th class="text-lg font-semibold text-gray-900" colspan="2">
                Predictions
              </th>
              <th class="th-regular" colspan="2">NO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2">{{ predictionYes }}</td>
              <td colspan="2"></td>
              <td colspan="2">{{ predictionNo }}</td>
            </tr>
          </tbody>

          <!-- Resolves as YES -->
          <thead class="bg-gray-50">
            <tr>
              <th class="text-lg font-semibold text-gray-900" colspan="6">
                If resolves as YES...
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account of payouts.YES" :id="account.accountId">
              <td colspan="2">{{ account.accountId }}</td>

              <td colspan="2"></td>
              <td colspan="2">{{ account.payout }}</td>
            </tr>
          </tbody>

          <!-- Resolves as NO -->
          <thead class="bg-gray-50">
            <tr>
              <th class="text-lg font-semibold text-gray-900" colspan="6">
                If resolves as NO...
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account of payouts.NO" :id="account.accountId">
              <td colspan="2">{{ account.accountId }}</td>
              <td colspan="2"></td>
              <td colspan="2">{{ account.payout }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Pool } from "../js/pool";
import { Outcome } from "../js/tokens";
import { ResolutionEscrow } from "../js/resolutionEscrow";

export default defineComponent({
  props: {
    outcomeBalances: Array,
    escrowAccounts: Array[ResolutionEscrow],
    pool: Pool,
    poolTokens: Number,
    spotPrices: Array[Number],
    readyToPayout: Boolean,
  },
  computed: {
    marketStatus() {
      const lpCollateral = this.escrowAccounts
        .reduce((sum, account) => {
          let lpThisAcct =
            account.getLpSpent(Outcome.YES) + account.getLpSpent(Outcome.NO);
          return sum + lpThisAcct;
        }, 0)
        .toFixed(2);
      const outcomeCollateral = this.escrowAccounts
        .reduce((sum, account) => {
          return (
            sum + account.getSpent(Outcome.YES) + account.getSpent(Outcome.NO)
          );
        }, 0)
        .toFixed(2);
      return {
        yesTokens: this.outcomeBalances[Outcome.YES].toFixed(2),
        noTokens: this.outcomeBalances[Outcome.NO].toFixed(2),
        lpTokens: (this.poolTokens || 0).toFixed(2),
        lpCollateral: lpCollateral,
        outcomeCollateral: outcomeCollateral,
      };
    },
    predictionYes() {
      return (this.spotPrices[Outcome.YES] * 100).toFixed(2) + "%";
    },
    predictionNo() {
      return (this.spotPrices[Outcome.NO] * 100).toFixed(2) + "%";
    },
    payouts() {
      if (!this.readyToPayout) {
        return { YES: {}, NO: {} };
      }
      const payoutsNo = this.escrowAccounts.map((account) => {
        return account.accountId
          ? {
              accountId: account.accountId,
              payout: this.pool.payout(account.accountId, [1, 0], true),
            }
          : {};
      });
      const payoutsYes = this.escrowAccounts.map((account) => {
        return account.accountId
          ? {
              accountId: account.accountId,
              payout: this.pool.payout(account.accountId, [0, 1], false),
            }
          : {};
      });
      return {
        NO: payoutsNo,
        YES: payoutsYes,
      };
    },
  },
});
</script>
