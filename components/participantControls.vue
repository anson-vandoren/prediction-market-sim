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
                    class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div class="col-span-2 place-self-center mt-2">
                  <button
                    type="button"
                    id="newParticipantSubmit"
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
                      value="10"
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
                    class="py-2 px-4 mt-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Place Bet
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
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    ></select>
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
                      :value="liquidity.amt"
                      @input="$emit('changeLiquidityAmt', $event.target.value)"
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
                    @click="$emit('addLiquidity')"
                    class="py-2 px-2 justify-self-auto mt-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Liquidity
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
                      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full border-transparent bg-transparent text-gray-900 sm:text-sm rounded-md"
                    ></select>
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
import { Pool } from "../js/pool";

export default defineComponent({
  props: {
    liquidity: Object,
  },
  emits: ["addLiquidity", "changeLiquidityAmt"],
});
</script>
