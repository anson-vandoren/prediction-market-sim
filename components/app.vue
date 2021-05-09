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
            :ready-to-payout="readyToPayout"
            :net-collateral="pool.netCollateral"
          ></MarketTable>
          <MarketControls
            @on-do-payout="readyToPayout = true"
            @on-reset-market="resetMarket"
          ></MarketControls>
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
            @on-sell-outcome="onSellOutcome"
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
      collateralBank: { poolOwner: 0, alice: 0 },
      readyToPayout: false,
    };
  },
  beforeCreate() {
    this.pool = new Pool(2, 0.02);
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
      this.updateCollateralBank(accountId, -amt);
      this.updateFromPool();
    },
    onLiquiditySell({ amt, accountId }) {
      const received = this.pool.exitPool(accountId, amt);
      this.updateCollateralBank(accountId, received);
      this.updateFromPool();
    },
    onBuyOutcome({ amt, accountId, outcome }) {
      this.pool.buy(accountId, amt, outcome);
      this.updateCollateralBank(accountId, -amt);
      this.updateFromPool();
    },
    onSellOutcome({ amt, accountId, outcome }) {
      const expectedCollateral = this.pool.calcCollateralReturnedForSellingOutcome(
        amt,
        outcome
      );
      const escrowed = this.pool.sell(
        accountId,
        expectedCollateral,
        outcome,
        amt
      );
      const returned = expectedCollateral - escrowed;
      this.updateCollateralBank(accountId, returned);
      this.updateFromPool();
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
    resetMarket() {
      this.pool = new Pool(2, 0.02);
      this.collateralBank = { alice: 0 };
      this.pool.resolutionEscrow.getOrNew("alice");
      this.updateFromPool();
    },
  },
});
</script>
