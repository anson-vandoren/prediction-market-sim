import { Pool } from "./pool";

class Market {
  constructor(fundingAmt = 10) {
    fundingAmt = parseFloat(fundingAmt);
    this.tokens = { Y: fundingAmt, N: fundingAmt };
    this.amtBet = 0;
    this.initialFunding = fundingAmt;
    this.currentFunding = fundingAmt;
    this.invariant = this.calculateInvariant();
  }

  calculateInvariant = () => {
    let invariant = 1;
    for (const [_, amt] of Object.entries(this.tokens)) {
      invariant *= amt;
    }
    return invariant;
  };

  bet = (side, amt) => {
    side = side.toUpperCase();
    if (!this.tokens.hasOwnProperty(side)) {
      console.log("unknown side: ", side);
      return;
    }
    amt = parseFloat(amt);
    if (amt <= 0.0) {
      console.log(`Bet amount must be > 0, not ${amt}`);
      return;
    }

    // keep track of how much has been bet so far on this market
    this.amtBet += amt;

    // add tokens to each side equivalent to the bet
    for (const side in this.tokens) {
      if (this.tokens.hasOwnProperty(side)) {
        this.tokens[side] += amt;
      }
    }

    // calculate how many tokens must be returned to maintain invariant
    const otherSide = side === "Y" ? "N" : "Y";
    const tokensReceived =
      this.tokens[side] - this.invariant / this.tokens[otherSide];

    // remove tokens from market pool and return
    this.tokens[side] -= tokensReceived;
    return tokensReceived;
  };

  odds = () => {
    // oddsWeightForOutcome = product(numOutcomeTokensInInventoryForOtherOutcome for every otherOutcome)
    const weights = Object.entries(this.tokens).reduce(
      (acc, kv) => {
        const [thisSide, _] = kv;
        let weight = 1;
        for (const [side, amt] of Object.entries(this.tokens)) {
          if (side !== thisSide) {
            weight *= amt;
          }
        }
        acc[thisSide] = weight;
        acc.sum += weight;
        return acc;
      },
      { sum: 0 }
    );

    // oddsForOutcome = oddsWeightForOutcome / sum(oddsWeightForOutcome for every outcome)
    return Object.entries(this.tokens).reduce((acc, kv) => {
      const [side, _] = kv;
      acc[side] = weights[side] / weights.sum;
      return acc;
    }, {});
  };
}

class Participant {
  constructor(name) {
    this.name = name;
    this.tokens = [0, 0]; // yes, no
    this.betAmts = [0, 0]; // yes, no
    this.liquidityProvided = 0;
  }
}

class Participants {
  constructor(initialParticipant = null) {
    this.participants = [];
    if (initialParticipant != null) {
      this.participants.push(new Participant(initialParticipant));
    }
  }

  new = (name) => {
    const participant = new Participant(name);
    this.participants.push(participant);
  };

  addTokensFor(name, side, tokens, price) {
    const pid = this.participants.findIndex((p) => p.name === name);
    const idx = side === "Y" ? 0 : 1;
    this.participants[pid].tokens[idx] += parseFloat(tokens);
    this.participants[pid].betAmts[idx] += parseFloat(price);
  }

  addLiquidityFrom(name, amt) {
    const pid = this.participants.findIndex((p) => p.name === name);
    this.participants[pid].liquidityProvided += parseFloat(amt);
  }
}

function updateMarketView() {
  document.getElementById("mktYesTokens").innerHTML = market.tokens.Y.toFixed(
    2
  );
  document.getElementById("mktNoTokens").innerHTML = market.tokens.N.toFixed(2);
  document.getElementById("mktAmtBet").innerHTML = market.amtBet.toString();
  document.getElementById(
    "mktCurrentFunding"
  ).innerHTML = market.currentFunding.toString();
  document.getElementById(
    "mktInitialFunding"
  ).innerHTML = market.initialFunding.toString();
  document.getElementById(
    "mktInvariant"
  ).innerHTML = market.invariant.toString();

  const odds = market.odds();
  const probYes = (odds.Y * 100).toFixed(2) + " %";
  const probNo = (odds.N * 100).toFixed(2) + " %";
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

function updateParticipantsView() {
  let newBody = document.createElement("tbody");
  const newBetSelector = document.getElementById("newBetParticipant");
  const liquidityParticipant = document.getElementById("liquidityParticipant");

  for (const participant of participants.participants) {
    // update the table
    const newRow = createRowFrom([
      participant.name,
      participant.tokens[0],
      participant.betAmts[0],
      participant.tokens[1],
      participant.betAmts[1],
      participant.liquidityProvided,
    ]);
    newBody.appendChild(newRow);

    // update the bet selector
    const newOption = document.createElement("option");
    newOption.appendChild(document.createTextNode(participant.name));
    newBetSelector.appendChild(newOption);

    // update the liquidity selector
    liquidityParticipant.appendChild(newOption.cloneNode(true));
  }

  // swap the old table for the new one
  let oldBody = document.getElementById("tblParticipants");
  oldBody.replaceWith(newBody);
  newBody.id = "tblParticipants";
}

function resetSimulation() {
  const newFundingAmt = document.getElementById("newFundingAmt").value;
  market = new Market(newFundingAmt);
  participants = new Participants("Alice");
  updateMarketView();
  updateParticipantsView();
}

function placeBet() {
  const betAmt = document.getElementById("newBetAmt").value;
  const betSide =
    document.getElementById("newBetSide").value === "YES" ? "Y" : "N";
  const tokensReceived = market.bet(betSide, betAmt);
  const bettor = document.getElementById("newBetParticipant").value;
  participants.addTokensFor(bettor, betSide, tokensReceived, betAmt);
  updateMarketView();
  updateParticipantsView();
}

function changeLiquidity() {
  const side = document.getElementById("liquiditySide").value;
  const amt = parseFloat(document.getElementById("liquidityAmt").value);
  const participant = document.getElementById("liquidityParticipant").value;

  // add liquidity to market

  // update participant
  participants.addLiquidityFrom(participant, amt);

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
  document.getElementById("placeNewBet").onclick = placeBet;
  document.getElementById("changeLiquidity").onclick = changeLiquidity;
  const liquidityBtn = document.getElementById("liquiditySide");
  liquidityBtn.onchange = updateLiquiditySideBtn;
  liquidityBtn.dispatchEvent(new Event("change"));

  updateMarketView();
  updateParticipantsView();
}

let market = new Market();
let participants = new Participants("Alice");

console.log("** creating pool **");
const pool = new Pool(2, 0.02); // 2% swapFee === (swapFee / 10^collateralDecimals)

console.log("** adding $10 liquidity for poolBot **");
pool.addLiquidity("poolBot", 10, [1, 1]);
console.log("** adding $5 liquidity for Alice **");
pool.addLiquidity("alice", 5);

const canBuyFor10Outcome0 = pool.calcBuyAmount(10, 0);

console.log("** Alice buying 10 of outcome 0 **");
pool.buy("alice", 10, 0);
pool.sellByOutcomeTokens("alice", 10, 0);

const feesForAlice = pool.getFeesWithdrawable("alice");
console.log("** Alice exiting the pool **");
const returned = pool.exitPool("alice", pool.getPoolTokenBalance("alice"));

window.onload = init;
