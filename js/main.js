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

function createRowFrom(strArray) {
  const row = document.createElement("tr");
  for (let text of strArray) {
    if (typeof text === "number") {
      text = text.toFixed(2);
    }
    row.insertCell().appendChild(document.createTextNode(text));
  }
  return row;
}

function clearOptions(selectElem) {
  for (let i = selectElem.options.length - 1; i >= 0; i--) {
    selectElem.remove(i);
  }
}

function updateParticipantsView() {
  let newBody = document.createElement("tbody");
  const betAccounts = document.getElementById("newBetParticipant");
  const liquidityAccounts = document.getElementById("liquidityParticipant");
  clearOptions(betAccounts);
  clearOptions(liquidityAccounts);

  for (const participant of pool.resolutionEscrow.escrowAccounts.entries()) {
    const [accountId, escrowAccount] = participant;
    // update the table
    const newRow = createRowFrom([
      accountId,
      pool.getOutcomeBalance(accountId, Outcome.YES),
      escrowAccount.getSpent(Outcome.YES),
      pool.getOutcomeBalance(accountId, Outcome.NO),
      escrowAccount.getSpent(Outcome.NO),
      pool.getPoolTokenBalance(accountId),
      escrowAccount.getLpSpent(Outcome.YES) +
        escrowAccount.getLpSpent(Outcome.NO),
    ]);
    newBody.appendChild(newRow);

    // update the bet selector
    const newOption = document.createElement("option");
    newOption.appendChild(document.createTextNode(accountId));
    betAccounts.appendChild(newOption);

    // update the liquidity selector
    liquidityAccounts.appendChild(newOption.cloneNode(true));
  }

  // swap the old table for the new one
  let oldBody = document.getElementById("tblParticipants");
  oldBody.replaceWith(newBody);
  newBody.id = "tblParticipants";
}

function resetSimulation() {
  const outcomes = 2;
  const swapFee = 0.0;
  pool = new Pool(outcomes, swapFee);
  updateMarketView();
  updateParticipantsView();
}

function placeBet() {
  const outcomeShares = parseFloat(document.getElementById("newBetAmt").value);
  const outcomeId =
    document.getElementById("newBetSide").value === "YES"
      ? Outcome.YES
      : Outcome.NO;

  const accountId = document.getElementById("newBetParticipant").value;
  pool.buy(accountId, outcomeShares, outcomeId);
  updateMarketView();
  updateParticipantsView();
}

function changeLiquidity() {
  const side = document.getElementById("liquiditySide").value;
  const amt = parseFloat(document.getElementById("liquidityAmt").value);
  const participant = document.getElementById("liquidityParticipant").value;

  // add liquidity to market
  // TODO: allow for unbalanced pools?
  const weights = pool.poolToken.totalSupply === 0 ? [1, 1] : undefined;
  pool.addLiquidity(participant, amt, weights);

  updateParticipantsView();
  updateMarketView();
}

function updateLiquiditySideBtn(evt) {
  const ref = document.getElementById("changeLiquidity");
  let side = evt.target.value.toLowerCase();
  side = side.charAt(0).toUpperCase() + side.slice(1);
  ref.innerText = side + " Liquidity";
}

function newEscrowAccount() {
  const accountId = document.getElementById("newParticipantName").value;
  pool.resolutionEscrow.getOrNew(accountId);
  updateParticipantsView();
}

function init() {
  document.getElementById("resetMarket").onclick = resetSimulation;
  document.getElementById("placeNewBet").onclick = placeBet;
  document.getElementById("changeLiquidity").onclick = changeLiquidity;
  const liquidityBtn = document.getElementById("liquiditySide");
  liquidityBtn.onchange = updateLiquiditySideBtn;
  liquidityBtn.dispatchEvent(new Event("change"));

  document.getElementById("newParticipantSubmit").onclick = newEscrowAccount;

  updateMarketView();
  updateParticipantsView();
}

let pool = new Pool(2, 0);
// make a starter account
pool.resolutionEscrow.getOrNew("alice");

window.onload = init;

createApp(App).mount("#app");
