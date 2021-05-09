<template>
  <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
    <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
      <div
        class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg"
      >
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th colspan="8" class="text-lg py-3 font-semibold text-gray-900">
                Participants
              </th>
            </tr>
            <tr>
              <th></th>
              <th colspan="2" class="text-lg font-medium text-gray-700">YES</th>
              <th colspan="2" class="text-lg font-medium text-gray-700">NO</th>
              <th colspan="2" class="text-lg font-medium text-gray-700">
                Liquidity
              </th>
              <th class="text-lg font-medium text-gray-700"></th>
            </tr>
            <tr>
              <th class="th-regular">Name</th>
              <th class="th-regular">Tokens</th>
              <th class="th-regular">Spent</th>
              <th class="th-regular">Tokens</th>
              <th class="th-regular">Spent</th>
              <th class="th-regular">Tokens</th>
              <th class="th-regular">Spent</th>
              <th class="th-regular">Bank</th>
            </tr>
          </thead>
          <tbody id="tblParticipants">
            <tr v-for="participant in outcomeBalances" :key="participant.name">
              <td>{{ participant.name }}</td>
              <td>{{ participant.tokensYes }}</td>
              <td>{{ participant.collateralYes }}</td>
              <td>{{ participant.tokensNo }}</td>
              <td>{{ participant.collateralNo }}</td>
              <td>{{ participant.tokensPool }}</td>
              <td>{{ participant.collateralPool }}</td>
              <td>{{ collateralBank[participant.name].toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Outcome } from "../js/tokens";
import { Pool } from "../js/pool";

export default defineComponent({
  props: { pool: Pool, escrowAccounts: Array, collateralBank: Object },
  data() {
    return {};
  },
  computed: {
    outcomeBalances() {
      return this.escrowAccounts.map((escrowAccount) => {
        const accountId = escrowAccount.accountId;
        return {
          name: accountId,
          tokensYes: (
            this.pool.getOutcomeBalance(accountId, Outcome.YES) || 0.0
          ).toFixed(2),
          collateralYes: (escrowAccount.getSpent(Outcome.YES) || 0.0).toFixed(
            2
          ),
          tokensNo: this.pool
            .getOutcomeBalance(accountId, Outcome.NO)
            .toFixed(2),
          collateralNo: (escrowAccount.getSpent(Outcome.NO) || 0.0).toFixed(2),
          tokensPool: (this.pool.getPoolTokenBalance(accountId) || 0.0).toFixed(
            2
          ),
          collateralPool: (
            escrowAccount.getLpSpent(Outcome.YES) +
              escrowAccount.getLpSpent(Outcome.NO) || 0.0
          ).toFixed(2),
        };
      });
    },
  },
});
</script>
