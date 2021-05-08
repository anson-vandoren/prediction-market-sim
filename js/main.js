import { Pool } from "./pool";
import { Outcome } from "./tokens";
import App from "../components/app";
import { createApp } from "vue";

function resetSimulation() {
  const outcomes = 2;
  const swapFee = 0.0;
  pool = new Pool(outcomes, swapFee);
}

function updateLiquiditySideBtn(evt) {
  const ref = document.getElementById("changeLiquidity");
  let side = evt.target.value.toLowerCase();
  side = side.charAt(0).toUpperCase() + side.slice(1);
  ref.innerText = side + " Liquidity";
}

function init() {
  document.getElementById("resetMarket").onclick = resetSimulation;
  const liquidityBtn = document.getElementById("liquiditySide");
  liquidityBtn.onchange = updateLiquiditySideBtn;
  liquidityBtn.dispatchEvent(new Event("change"));
}

let pool = new Pool(2, 0);
// make a starter account
pool.resolutionEscrow.getOrNew("alice");

window.onload = init;

const app = createApp(App);
app.mount("#app");
