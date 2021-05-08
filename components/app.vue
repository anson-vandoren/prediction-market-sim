<template>
  <main class="container mx-auto h-full">
    <div class="flex flex-col flex-auto h-full" id="app">
      <h1 class="text-center">Prediction Market Simulator</h1>
      <div class="grid grid-cols-2 flex-grow gap-6">
        <div id="leftCol">
          <MarketTable
            :outcome-balances="outcomeBalances"
            :escrow-accounts="escrowAccounts"
            :pool-tokens="poolTokens"
            :spot-prices="spotPrices"
            :pool="pool"
          ></MarketTable>
          <MarketControls></MarketControls>
        </div>

        <div id="rightCol">
          <ParticipantTable
            :collateral-bank="collateralBank"
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
      outcomeBalances: this.pool.getOutcomeBalances(),
      poolTokens: this.pool.poolToken.totalSupply,
      spotPrices: this.pool.getSpotPrices(),
      collateralBank: { alice: 0 },
    };
  },
  beforeCreate() {
    this.pool = new Pool(2, 0);
    this.pool.resolutionEscrow.getOrNew("alice");
  },
  methods: {
    createAccount(participantName) {
      this.pool.resolutionEscrow.getOrNew(participantName);
      this.updateFromPool();
      this.updateCollateralBank(participantName, 0);
    },
    onLiquidityBuy({ amt, accountId }) {
      const weightIndications =
        this.pool.poolToken.totalSupply === 0 ? [1, 1] : undefined;
      this.pool.addLiquidity(accountId, amt, weightIndications);
      this.updateFromPool();
      this.updateCollateralBank(accountId, -amt);
    },
    onLiquiditySell({ amt, accountId }) {
      const received = this.pool.exitPool(accountId, amt);
      this.updateFromPool();
      this.updateCollateralBank(accountId, received);
    },
    onBuyOutcome({ amt, accountId, side }) {
      this.pool.buy(accountId, amt, side);
      this.updateFromPool();
      this.updateCollateralBank(accountId, -amt);
    },
    updateFromPool() {
      this.escrowAccounts = [
        ...this.pool.resolutionEscrow.escrowAccounts.values(),
      ];
      this.outcomeBalances = this.pool.getOutcomeBalances();
      this.poolTokens = this.pool.poolToken.totalSupply;
      this.spotPrices = this.pool.getSpotPrices();
    },
    updateCollateralBank(accountId, amt) {
      if (!this.collateralBank.hasOwnProperty(accountId)) {
        this.collateralBank[accountId] = 0;
      }
      this.collateralBank[accountId] += amt;
    },
  },
});
</script>
