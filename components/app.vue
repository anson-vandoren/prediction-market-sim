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
          <ParticipantTable></ParticipantTable>
          <ParticipantControls
            @add-liquidity="onAddLiquidity"
            @change-liquidity-amt="onLAmtChanged"
            :liquidity="liquidity"
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
    console.log(this.liquidity);
    return {
      pool: this.pool,
      liquidity: this.liquidity,
    };
  },
  beforeCreate() {
    this.pool = new Pool(2, 0);
    this.liquidity = {
      side: "BUY",
      amt: 0,
      participant: "",
    };
  },
  methods: {
    onAddLiquidity(sender, amount, weights) {
      console.log(`adding liquidity for ${this.liquidity.amt}`);
      this.pool.addLiquidity(sender, amount, weights);
    },
    onLAmtChanged(newAmt) {
      console.log("onLAmtChanged");
      this.liquidity.amt = newAmt;
    },
  },
});
</script>
