class Market {
  constructor(funding_amt = 10) {
    this.tokens = { Y: funding_amt, N: funding_amt };
    this.invariant = this.calculateInvariant();
    this.amtBet = 0;
    this.initialFunding = funding_amt;
    this.currentFunding = funding_amt;
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
    }
  };
}

function updateMarket() {
  document.getElementById(
    "mktYesTokens"
  ).innerHTML = market.tokens.Y.toString();
  document.getElementById("mktNoTokens").innerHTML = market.tokens.N.toString();
  document.getElementById("mktAmtBet").innerHTML = market.amtBet.toString();
  document.getElementById(
    "mktCurrentFunding"
  ).innerHTML = market.currentFunding.toString();
  document.getElementById(
    "mktInitialFunding"
  ).innerHTML = market.initialFunding.toString();
  document.getElementById(
    "mktInvariant"
  ).innerHTML = market.calculateInvariant().toString();
}

function resetMarket() {
  const newFundingAmt = document.getElementById("newFundingAmt").value;
  market = new Market(newFundingAmt);
  updateMarket();
}

function placeBet() {
  const betAmt = document.getElementById("newBetAmt").value;
  const betSide =
    document.getElementById("newBetSide").value === "YES" ? "Y" : "N";
  console.log(`bet ${betAmt} on ${betSide}`);
}

function init() {
  document.getElementById("resetMarket").onclick = resetMarket;
  document.getElementById("placeNewBet").onclick = placeBet;
  updateMarket();
  market.bet("n", 10);
}

let market = new Market();
window.onload = init;
