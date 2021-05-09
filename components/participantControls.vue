<template>
  <div>
    <div class="hidden sm:block" aria-hidden="true">
      <div class="py-5">
        <div class="border-t border-gray-200"></div>
      </div>
    </div>

    <div class="mt-10 sm:mt-0">
      <div class="md:grid md:grid-cols-3 md:gap-6">
        <div class="md:col-span-1">
          <div class="px-4 sm:px-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900">
              New Participant
            </h3>
            <p class="mt-1 text-sm text-gray-600">
              Add a new person who may bet or provide liquidity
            </p>
          </div>
        </div>
        <div class="mt-5 md:mt-0 md:col-span-2">
          <div class="shadow overflow-hidden sm:rounded-md">
            <div class="px-4 py-5 bg-white">
              <div class="grid grid-cols-6 gap-6">
                <div class="col-span-4">
                  <label
                    for="newParticipantName"
                    class="block text-sm font-medium text-gray-700"
                    >Name</label
                  >
                  <input
                    type="text"
                    name="newParticipantName"
                    id="newParticipantName"
                    v-model="newParticipantName"
                    @keyup.enter.native="createAccount"
                    class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div class="col-span-2 place-self-center mt-2">
                  <button
                    type="button"
                    id="newParticipantSubmit"
                    @click="createAccount"
                    class="py-2 px-4 justify-self-auto mt-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hidden sm:block" aria-hidden="true">
      <div class="py-5">
        <div class="border-t border-gray-200"></div>
      </div>
    </div>

    <div class="mt-10 sm:mt-0">
      <div class="md:grid md:grid-cols-3 md:gap-6">
        <div class="md:col-span-1">
          <div class="px-4 sm:px-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900">
              Market Interaction
            </h3>
            <p class="mt-1 text-sm text-gray-600">
              Place a bet on either side, or add/remove liquidity
            </p>
          </div>
        </div>
        <div class="mt-5 md:mt-0 md:col-span-2">
          <!-- Place new bet -->
          <div class="shadow overflow-hidden sm:rounded-md mb-6">
            <div class="px-4 py-5 bg-white">
              <div class="grid grid-cols-6 gap-4">
                <div class="col-span-2">
                  <label
                    for="newBetAmt"
                    class="block text-sm font-medium text-gray-700"
                    >Amount</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div
                      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    >
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="text"
                      name="newBetAmt"
                      id="newBetAmt"
                      v-model.number="shares.amt"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="10.0"
                    />
                  </div>
                </div>
                <div class="col-span-2">
                  <label
                    for="newBetSide"
                    class="block text-sm font-medium text-gray-700"
                    >Side</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <select
                      id="newBetSide"
                      name="newBetSide"
                      v-model="shares.outcome"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    >
                      <option>YES</option>
                      <option>NO</option>
                    </select>
                  </div>
                </div>
                <div class="col-span-2 place-self-center mt-2">
                  <button
                    type="button"
                    id="placeNewBet"
                    @click="transactShares"
                    class="py-2 px-4 mt-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {{ shares.btnLabel }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-6 gap-6 mt-2">
                <div class="col-span-2">
                  <label
                    for="newBetParticipant"
                    class="block text-sm font-medium text-gray-700"
                    >Participant</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <select
                      id="newBetParticipant"
                      name="newBetParticipant"
                      v-model="shares.accountId"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    >
                      <option
                        v-for="account in escrowAccounts"
                        :value="account.accountId"
                      >
                        {{ account.accountId }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="col-span-2">
                  <label
                    for="sharesSide"
                    class="block text-sm font-medium text-gray-700"
                    >Buy/Sell</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <select
                      id="sharesSide"
                      name="sharesSide"
                      v-model="shares.side"
                      @change="updateSharesBtnText"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    >
                      <option>BUY</option>
                      <option>SELL</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Add liquidity -->
          <div class="shadow overflow-hidden sm:rounded-md">
            <div class="px-4 py-5 bg-white">
              <div class="grid grid-cols-9 gap-4">
                <div class="col-span-3">
                  <label
                    for="liquidityAmt"
                    class="block text-sm font-medium text-gray-700"
                    >Amount</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <div
                      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                    >
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="text"
                      name="liquidityAmt"
                      id="liquidityAmt"
                      v-model.number="liquidity.amt"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="10.0"
                    />
                  </div>
                </div>
                <div class="col-span-3">
                  <label
                    for="liquiditySide"
                    class="block text-sm font-medium text-gray-700"
                    >Side</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <select
                      id="liquiditySide"
                      name="liquiditySide"
                      v-model="liquidity.side"
                      @change="updateLiquidityBtnText"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    >
                      <option>ADD</option>
                      <option>REMOVE</option>
                    </select>
                  </div>
                </div>
                <div class="col-span-3 place-self-center mt-2">
                  <button
                    type="button"
                    id="changeLiquidity"
                    @click="changeLiquidity"
                    class="py-2 px-2 justify-self-auto mt-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {{ liquidity.btnLabel }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-6 gap-6 mt-2">
                <div class="col-span-2">
                  <label
                    for="liquidityParticipant"
                    class="block text-sm font-medium text-gray-700"
                    >Participant</label
                  >
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <select
                      id="liquidityParticipant"
                      name="liquidityParticipant"
                      v-model="liquidity.accountId"
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    >
                      <option
                        v-for="account in escrowAccounts"
                        :value="account.accountId"
                      >
                        {{ account.accountId }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ResolutionEscrow } from "../js/resolutionEscrow";
import { Outcome } from "../js/tokens";

export default defineComponent({
  props: { escrowAccounts: Array[ResolutionEscrow] },
  emits: [
    "on-liquidity-buy",
    "on-liquidity-sell",
    "on-buy-outcome",
    "on-sell-outcome",
    "create-account",
  ],
  data() {
    return {
      newParticipantName: "",
      shares: {
        amt: 10,
        outcome: "YES",
        side: "BUY",
        accountId: "alice",
        btnLabel: "Buy Shares",
      },
      liquidity: {
        amt: 10,
        side: "ADD",
        accountId: "alice",
        btnLabel: "Add Liquidity",
      },
    };
  },
  methods: {
    createAccount() {
      this.$emit("create-account", this.newParticipantName);
      this.shares.accountId = this.newParticipantName;
      this.liquidity.accountId = this.newParticipantName;

      this.newParticipantName = "";
    },
    changeLiquidity() {
      if (this.liquidity.side === "ADD") {
        this.$emit("on-liquidity-buy", this.liquidity);
      } else {
        this.$emit("on-liquidity-sell", this.liquidity);
      }
    },
    transactShares() {
      const outcome = this.shares.outcome === "YES" ? Outcome.YES : Outcome.NO;
      if (this.shares.side === "BUY") {
        this.$emit("on-buy-outcome", {
          amt: this.shares.amt,
          accountId: this.shares.accountId,
          outcome: outcome,
        });
      } else {
        this.$emit("on-sell-outcome", {
          amt: this.shares.amt,
          accountId: this.shares.accountId,
          outcome: outcome,
        });
      }
    },
    updateLiquidityBtnText() {
      this.liquidity.btnLabel =
        this.liquidity.side === "ADD" ? "Add Liquidity" : "Remove Liquidity";
    },
    updateSharesBtnText() {
      this.shares.btnLabel =
        this.shares.side === "BUY" ? "Buy Shares" : "Sell Shares";
    },
  },
});
</script>
