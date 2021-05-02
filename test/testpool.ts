import { Pool } from "../js/pool";
import { expect } from "chai";
import "mocha";
import { Outcome } from "../js/tokens";

describe("assertValidOutcome", () => {
  const numOutcomes = 2;
  const pool = new Pool(numOutcomes, 0);
  it("should throw for outcomes < 0", () => {
    expect(() => pool.assertValidOutcome(-1)).to.throw(RangeError);
  });
  it("should throw for outcomes === numOutcomes", () => {
    expect(() => pool.assertValidOutcome(numOutcomes)).to.throw(RangeError);
  });
  it("should throw for outcomes > numOutcomes", () => {
    expect(() => pool.assertValidOutcome(numOutcomes + 1)).to.throw(RangeError);
  });
  it("should not throw for any valid outcome", () => {
    for (let i = 0; i < numOutcomes; i++) {
      expect(() => pool.assertValidOutcome(i)).to.not.throw(RangeError);
    }
  });
});

describe("oddsWeightForOutcome", () => {
  it("should return other tokens balance for 2 tokens", () => {
    const pool = new Pool(2, 0);
    const eachTokenBalance = 10;
    pool.addLiquidity("alice", eachTokenBalance, [1, 2]);

    // test one way
    let otherTokenBal = pool.getOutcomeBalances()[0];
    expect(pool.oddsWeightForOutcome(1)).to.equal(otherTokenBal);

    // then test the other way
    otherTokenBal = pool.getOutcomeBalances()[1];
    expect(pool.oddsWeightForOutcome(0)).to.equal(otherTokenBal);
  });
  it("should return product of other tokens for > 2 outcomes", () => {
    const pool = new Pool(3, 0);
    pool.addLiquidity("alice", 20, [1, 1, 1]);

    let productOfOthers =
      pool.getOutcomeBalances()[0] * pool.getOutcomeBalances()[1];
    expect(pool.oddsWeightForOutcome(2)).to.equal(productOfOthers);
  });
});

describe("getSpotPriceSansFee", () => {
  it("gives equal price for new balanced pool with 2 outcomes", () => {
    const pool = new Pool(2, 0);
    pool.addLiquidity("alice", 10, [1, 1]);
    const oddsForFirst = pool.getSpotPriceSansFee(0);
    const oddsForOther = pool.getSpotPriceSansFee(1);
    expect(oddsForFirst).to.equal(0.5);
    expect(oddsForFirst).to.equal(oddsForOther);
  });
  it("gives higher odds to lower-weighted outcome of 2", () => {
    const pool = new Pool(2, 0);
    pool.addLiquidity("alice", 20, [1, 2]);
    const oddsForLowWeight = pool.getSpotPriceSansFee(Outcome.NO);
    const oddsForHighWeight = pool.getSpotPriceSansFee(Outcome.YES);
    expect(oddsForLowWeight).to.be.greaterThan(oddsForHighWeight);
    expect(oddsForLowWeight).to.be.approximately(0.66, 0.007);
    expect(oddsForHighWeight).to.be.approximately(0.33, 0.004);
  });
  it("gives even odds with more than two even outcomes", () => {
    const numOutcomes = 3;
    const pool = new Pool(numOutcomes, 0);
    pool.addLiquidity("alice", 1, [1, 1, 1]);
    const odds = [...Array(numOutcomes).keys()].map((_, outcomeId) =>
      pool.getSpotPriceSansFee(outcomeId)
    );
    odds.forEach((theseOdds) => {
      expect(theseOdds).to.equal(1 / numOutcomes);
    });
  });
});

describe("getSpotPrice", () => {
  it("does not include a zero fee", () => {
    const numOutcomes = 2;
    const pool = new Pool(numOutcomes, 0);
    pool.addLiquidity("alice", 10, [1, 1]);
    const odds = [...Array(numOutcomes).keys()].map((_, outcomeId) =>
      pool.getSpotPrice(outcomeId)
    );
    odds.forEach((theseOdds, outcomeId) => {
      expect(theseOdds).to.equal(pool.getSpotPriceSansFee(outcomeId));
    });
  });
  it("adds fees if there is one", () => {
    const numOutcomes = 2;
    const fee = 0.01;
    const pool = new Pool(numOutcomes, fee);
    pool.addLiquidity("alice", 10, [1, 1]);
    // underlying cost of the outcome
    const cost = 1 / numOutcomes;
    // fee is levied on the total amount paid, not just on the cost of the
    // underlying token
    const expectedPrice = cost / (1 - fee);
    const odds = [...Array(numOutcomes).keys()].map((_, outcomeId) =>
      pool.getSpotPrice(outcomeId)
    );
    odds.forEach((theseOdds) => {
      expect(theseOdds).to.equal(expectedPrice);
    });
  });
});

describe("addToPools", () => {
  it("adds to totalSupply for every outcome", () => {
    const numOutcomes = 3;
    const pool = new Pool(numOutcomes, 0);
    const initialAmts = [...pool.outcomeTokens.values()].map((token) => {
      return token.totalSupply;
    });
    const amtToAdd = 11;
    pool.addToPools(amtToAdd);
    pool.outcomeTokens.forEach((token, outcomeId) => {
      expect(token.totalSupply).to.equal(initialAmts[outcomeId] + amtToAdd);
    });
  });
  it("assigns new tokens to pool owner", () => {
    const numOutcomes = 2;
    const pool = new Pool(numOutcomes, 0);

    const otherProvider = "alice";
    pool.addLiquidity(otherProvider, 3, [1, 2]);
    const poolOwnedAmounts = [...pool.outcomeTokens.values()].map((token) =>
      token.getBalance(pool.getOwnAccount())
    );

    const amtToAdd = 7;
    pool.addToPools(amtToAdd);
    pool.outcomeTokens.forEach((token, outcomeId) => {
      expect(token.getBalance(pool.getOwnAccount())).to.equal(
        poolOwnedAmounts[outcomeId] + amtToAdd
      );
    });
  });
  it("does not change other account amounts", () => {
    const numOutcomes = 3;
    const pool = new Pool(numOutcomes, 0);
    const otherProvider = "bob";
    pool.addLiquidity(otherProvider, 20, [1, 1, 4]);
    const otherOwnedAmounts = [...pool.outcomeTokens.values()].map((token) =>
      token.getBalance(otherProvider)
    );

    const amtToAdd = 7;
    pool.addToPools(amtToAdd);

    pool.outcomeTokens.forEach((token, outcomeId) => {
      expect(token.getBalance(otherProvider)).to.equal(
        otherOwnedAmounts[outcomeId]
      );
    });
  });
});

describe("removeFromPools", () => {
  const pool = new Pool(2, 0);
  const provider = "alice";
  pool.addLiquidity(provider, 1, [1, 1]);
  let initialPoolAmts: number[];
  let initialTotalSupplies: number[];
  let initialProviderAmts: number[];

  beforeEach(() => {
    initialPoolAmts = [];
    initialTotalSupplies = [];
    initialProviderAmts = [];
    pool.addLiquidity(provider, 10);
    pool.outcomeTokens.forEach((token) => {
      initialPoolAmts.push(token.getBalance(pool.getOwnAccount()));
      initialTotalSupplies.push(token.totalSupply);
      initialProviderAmts.push(token.getBalance(provider));
    });
  });

  it("removes totalSupply for every outcome", () => {
    const toRemove = 5;
    pool.removeFromPools(toRemove);
    pool.outcomeTokens.forEach((token, outcomeId) => {
      expect(token.totalSupply).to.equal(
        initialTotalSupplies[outcomeId] - toRemove
      );
    });
  });
  it("removes outcome tokens from pool owner", () => {
    const toRemove = 10;
    pool.removeFromPools(toRemove);
    pool.outcomeTokens.forEach((token, outcomeId) => {
      expect(token.getBalance(pool.getOwnAccount())).to.equal(
        initialPoolAmts[outcomeId] - toRemove
      );
    });
  });
  it("does not change other account balances", () => {
    const toRemove = 10;
    pool.removeFromPools(toRemove);
    pool.outcomeTokens.forEach((token, outcomeId) => {
      expect(token.getBalance(provider)).to.equal(
        initialProviderAmts[outcomeId]
      );
    });
  });
});

describe("a new pool", () => {
  it("has a zero-supply token for each outcome", () => {
    const numTokens = 3;
    const pool = new Pool(numTokens, 0);
    expect(pool.outcomeTokens.size).to.equal(numTokens);
    pool.outcomeTokens.forEach((token) => {
      expect(token.totalSupply).to.equal(0);
    });
  });
});
