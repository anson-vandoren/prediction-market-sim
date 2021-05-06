<template>
  <main class="container mx-auto h-full">
    <div class="flex flex-col flex-auto h-full" id="app">
      <h1 class="text-center">Prediction Market Simulator</h1>
      <div class="grid grid-cols-2 flex-grow gap-6">
        <div id="leftCol">
          <MarketTable :pool="pool"></MarketTable>
          <MarketControls></MarketControls>
        </div>

        <div id="rightCol">
          <ParticipantTable
            :pool="pool"
            :escrow-accounts="escrowAccounts"
          ></ParticipantTable>
          <ParticipantControls
            :escrow-accounts="escrowAccounts"
            @create-account="createAccount"
            @on-liquidity-buy="onLiquidityBuy"
            @on-liquidity-sell="onLiquiditySell"
            @on-buy-outcome="onBuyOutcome"
          ></ParticipantControls>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import MarketTable from "./marketTable";
import MarketControls from "./marketControls.vue";
import ParticipantTable from "./participantTable.vue";
import ParticipantControls from "./participantControls.vue";
import { Pool } from "../js/pool";

export default defineComponent({
  components: {
    ParticipantControls,
    ParticipantTable,
    MarketControls,
    MarketTable,
  },
  data() {
    return {
      pool: this.pool,
      escrowAccounts: [...this.pool.resolutionEscrow.escrowAccounts.values()],
    };
  },
  beforeCreate() {
    this.pool = new Pool(2, 0);
    this.pool.resolutionEscrow.getOrNew("alice");
  },
  methods: {
    createAccount(participantName) {
      this.pool.resolutionEscrow.getOrNew(participantName);
      this.updateAccounts();
    },
    onLiquidityBuy({ amt, accountId }) {
      const weightIndications =
        this.pool.poolToken.totalSupply === 0 ? [1, 1] : undefined;
      this.pool.addLiquidity(accountId, amt, weightIndications);
      this.updateAccounts();
    },
    onLiquiditySell({ amt, accountId }) {
      this.pool.exitPool(accountId, amt);
      this.updateAccounts();
    },
    onBuyOutcome({ amt, accountId, side }) {
      this.pool.buy(accountId, amt, side);
      this.updateAccounts();
    },
    updateAccounts() {
      this.escrowAccounts = [
        ...this.pool.resolutionEscrow.escrowAccounts.values(),
      ];
    },
  },
});
</script>
