<template>
  <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
    <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
      <div
        class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg"
      >
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th colspan="7" class="text-lg py-3 font-semibold text-gray-900">
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
            </tr>
            <tr>
              <th class="th-regular">Name</th>
              <th class="th-regular">Tokens</th>
              <th class="th-regular">Spent</th>
              <th class="th-regular">Tokens</th>
              <th class="th-regular">Spent</th>
              <th class="th-regular">Tokens</th>
              <th class="th-regular">Spent</th>
            </tr>
          </thead>
          <tbody id="tblParticipants"></tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {};
  },
  props: [],
});
</script>
