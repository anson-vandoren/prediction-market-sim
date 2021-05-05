<template>
  <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
    <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
      <div
        class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg"
      >
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th colspan="6" class="text-lg py-3 font-semibold text-gray-900">
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
                {{ mktYesTokens }}
              </td>
              <td id="mktNoTokens"></td>
              <td id="mktLpTokens"></td>
              <td id="mktLiquidityCollateral"></td>
              <td id="mktBetCollateral"></td>
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
              <td id="mktProbYes" colspan="2"></td>
              <td colspan="2"></td>
              <td id="mktProbNo" colspan="2"></td>
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

export default defineComponent({
  props: {
    pool: Pool,
  },
  data() {
    const outcomeBalances = this.pool.getOutcomeBalances();
    return {
      mktYesTokens: outcomeBalances[Outcome.YES],
    };
  },
});
</script>
