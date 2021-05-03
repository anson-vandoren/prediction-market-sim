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

class Participant {
  constructor(name) {
    this.name = name;
    this.tokens = [0, 0]; // yes, no
    this.betAmts = [0, 0]; // yes, no
    this.liquidityProvided = 0;
  }
}
