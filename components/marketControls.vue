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
              Market Control
            </h3>
            <p class="mt-1 text-sm text-gray-600">
              Start a new prediction market, or make changes to the existing
              market
            </p>
          </div>
        </div>
        <div class="mt-5 md:mt-0 md:col-span-2">
          <div class="shadow overflow-hidden sm:rounded-md">
            <div class="px-4 py-5 bg-white">
              <div class="grid grid-cols-6 gap-6">
                <div class="col-span-3">
                  <label
                    for="newFundingAmt"
                    class="block text-sm font-medium text-gray-700"
                    >Funding Amount</label
                  >
                  <input
                    type="text"
                    name="newFundingAmt"
                    id="newFundingAmt"
                    value="10"
                    class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div class="col-span-3 place-self-center">
                  <button
                    type="button"
                    id="resetMarket"
                    @click="$emit('on-do-payout')"
                    class="py-2 px-4 justify-self-auto mt-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Reset Market
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  emits: ["on-do-payout"],
  data() {
    return {};
  },
});
</script>
