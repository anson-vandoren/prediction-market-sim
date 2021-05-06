import { Pool } from "./pool";
import { Outcome } from "./tokens";
import App from "../components/app";
import { createApp } from "vue";

function updateMarketView() {
  const balances = pool.getOutcomeBalances();
  // const yesTokensInPool = balances[Outcome.YES].toFixed(2);
  const noTokensInPool = balances[Outcome.NO].toFixed(2);
  const poolTotalAmountBet = "FIXME";
  const mktBetCollateral = "FIXME";
  // document.getElementById("mktYesTokens").innerHTML = yesTokensInPool;
  document.getElementById("mktNoTokens").innerHTML = noTokensInPool;
  document.getElementById("mktLpTokens").innerHTML = poolTotalAmountBet;
  document.getElementById("mktLiquidityCollateral").innerHTML = "FIXME";
  document.getElementById("mktBetCollateral").innerHTML = mktBetCollateral;

  const probYes =
    (pool.getSpotPriceSansFee(Outcome.YES) * 100).toFixed(2) + "%";
  const probNo = (pool.getSpotPriceSansFee(Outcome.NO) * 100).toFixed(2) + "%";
  document.getElementById("mktProbYes").innerHTML = probYes;
  document.getElementById("mktProbNo").innerHTML = probNo;
}

function resetSimulation() {
  const outcomes = 2;
  const swapFee = 0.0;
  pool = new Pool(outcomes, swapFee);
  updateMarketView();
  updateParticipantsView();
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

  updateMarketView();
}

let pool = new Pool(2, 0);
// make a starter account
pool.resolutionEscrow.getOrNew("alice");

window.onload = init;

const app = createApp(App);
app.mount("#app");
