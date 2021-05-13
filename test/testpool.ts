import { MIN_OUTCOMES, MAX_OUTCOMES, Pool } from "../js/pool";
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
  it("has a valid number of outcomes", () => {
    expect(() => {
      new Pool(1, 0);
    }, "should have thrown RangeError for 1 outcome").to.throw(RangeError);

    expect(() => {
      new Pool(0, 0);
    }, "should have thrown RangeError for 0 outcomes").to.throw(RangeError);
    expect(() => {
      new Pool(MIN_OUTCOMES, 0);
    }).to.not.throw();
  });
  it("has a valid fee", () => {
    expect(() => {
      new Pool(MIN_OUTCOMES, 0);
    }, "should allow 0 fee").to.not.throw();
    expect(() => {
      new Pool(MIN_OUTCOMES, 0.05);
    }, "should allow a fee").to.not.throw();
    expect(() => {
      new Pool(MIN_OUTCOMES, 1);
    }, "should not allow fee of 100%").to.throw(RangeError);
    expect(() => {
      new Pool(MIN_OUTCOMES, -0.01);
    }, "should not allow negative fee").to.throw(RangeError);
    expect(() => {
      new Pool(MIN_OUTCOMES, 1.01);
    }, "should not allow fee > 1").to.throw(RangeError);
  });
});

describe("addLiquidity", () => {
  it("fails if insufficient liquidity provided", () => {
    const pool = new Pool(2, 0);
    expect(() =>
      pool.addLiquidity("alice", pool.MIN_LIQUIDITY_AMOUNT - 0.0001)
    ).to.throw(RangeError);
  });
  it("fails if no weights given for new pool", () => {
    const pool = new Pool(3, 0);
    expect(() =>
      pool.addLiquidity("alice", pool.MIN_LIQUIDITY_AMOUNT)
    ).to.throw("must provide weights");
  });
  it("fails if weights do not match outcome number", () => {
    const numOutcomes = 3;
    const weightsToGive = Array(numOutcomes - 1);
    expect(weightsToGive.length).to.be.greaterThanOrEqual(MIN_OUTCOMES);
    expect(weightsToGive.length).to.be.lessThanOrEqual(MAX_OUTCOMES);
    const pool = new Pool(numOutcomes, 0);
    expect(() =>
      pool.addLiquidity("alice", pool.MIN_LIQUIDITY_AMOUNT, weightsToGive)
    ).to.throw("invalid weights");
  });
  it("fails if weights are given to established pool", () => {
    const pool = new Pool(2, 0);
    pool.addLiquidity("alice", 10, [1, 1]);
    expect(() => pool.addLiquidity("bob", 5, [1, 1])).to.throw(
      "cannot set weight"
    );
  });
  it("gives LP pool tokens equal to collateralIn when creating pool", () => {
    const params: [number, number[]][] = [
      [2, [1, 1]],
      [2, [1, 3]],
      [3, [1, 1, 1]],
      [3, [1, 4, 1]],
    ];
    params.forEach(([numOutcomes, weights]) => {
      const pool = new Pool(numOutcomes, 0);

      const provider = "alice";
      const collateralIn = 10;
      pool.addLiquidity(provider, collateralIn, weights);
      const providerPoolTokens = pool.getPoolTokenBalance(provider);
      const poolPoolTokens = pool.getPoolTokenBalance(pool.getOwnAccount());
      const totalPoolTokens = providerPoolTokens + poolPoolTokens;

      expect(totalPoolTokens).to.equal(
        collateralIn,
        "total pool tokens should equal collateral in"
      );
      expect(providerPoolTokens).to.equal(
        collateralIn,
        "provider should have received all new pool tokens created"
      );
      expect(poolPoolTokens).to.equal(0, "pool should not own any pool tokens");
    });
  });
  it("gives LP tokens equal to collateralIn when even odds", () => {
    // initial pool with even odds
    const pool = new Pool(3, 0.05);
    pool.addLiquidity("alice", 10, [1, 1, 1]);

    // some other person adds liquidity - odds stay the same
    pool.addLiquidity("bob", 50);

    // when last person adds liquidity with odds still the same, pool tokens === collateralIn
    const odds = [0, 1, 2].map((_, outcomeId) => pool.getSpotPrice(outcomeId));
    odds.forEach((theseOdds) => {
      expect(theseOdds).to.equal(odds[0]);
    });
    const collateralIn = 25;
    const provider = "charlie";
    pool.addLiquidity(provider, collateralIn);
    expect(pool.getPoolTokenBalance(provider)).to.equal(collateralIn);
  });
  it("gives fewer LP tokens than collateralIn if odds are different from original", () => {
    const pool = new Pool(3, 0.1);
    const initialProvider = "alice";
    const initialCollateral = 100;
    pool.addLiquidity(initialProvider, initialCollateral, [1, 2, 1]);
    expect(pool.getPoolTokenBalance(initialProvider)).to.equal(
      initialCollateral
    );

    // even though outcomes are uneven, a new provider gets full LP tokens since
    // the odds match the original
    const secondProvider = "bob";
    const secondCollateral = 10;
    pool.addLiquidity(secondProvider, secondCollateral);
    expect(pool.getPoolTokenBalance(secondProvider)).to.equal(secondCollateral);

    // someone else buys an outcome
    const outcomeBuyer = "zebedee";
    pool.buy(outcomeBuyer, 10, 0);

    // now a third provider shouldn't get their full collateral
    const thirdProvider = "charlie";
    const thirdCollateral = 15;
    pool.addLiquidity(thirdProvider, thirdCollateral);
    expect(pool.getPoolTokenBalance(thirdProvider)).to.be.lessThan(
      thirdCollateral
    );
  });
  it("gives no outcome tokens for new pool with even weights", () => {
    const params: [number, number[]][] = [
      [2, [1, 1]],
      [3, [1, 1, 1]],
    ];
    params.forEach(([numOutcomes, weights]) => {
      const pool = new Pool(numOutcomes, 0);
      const provider = "charlie";
      pool.addLiquidity(provider, 10, weights);
      weights.forEach((_, outcomeId) => {
        expect(pool.getOutcomeBalance(provider, outcomeId)).to.equal(0);
      });
    });
  });
  it("results in pool outcome tokens equal to amount of liquidity provided for even odds", () => {
    const params: [number, number[]][] = [
      [2, [1, 1]],
      [3, [1, 1, 1]],
    ];
    params.forEach(([numOutcomes, weights]) => {
      const pool = new Pool(numOutcomes, 0);
      const provider = "charlie";
      const collateralProvided = 10;

      // before providing liquidity
      pool.getOutcomeBalances().forEach((balance) => {
        expect(balance).to.equal(0);
      });
      pool.addLiquidity(provider, collateralProvided, weights);

      // after providing liquidity
      pool.getOutcomeBalances().forEach((balance) => {
        expect(balance).to.equal(collateralProvided);
      });
    });
  });
  it("splits outcome tokens between pool and provider on unequal odds", () => {
    const params: [number, number[]][] = [
      [2, [1, 2]],
      [3, [1, 4, 1]],
    ];
    params.forEach(([numOutcomes, weights]) => {
      const pool = new Pool(numOutcomes, 0);
      const provider = "charlie";
      const collateralProvided = 10;

      // before providing liquidity
      const startingPoolBalances = pool.getOutcomeBalances();
      const startingProviderBalances = weights.map((_, outcomeId) =>
        pool.getOutcomeBalance(provider, outcomeId)
      );
      const startingCombinedBalances = startingPoolBalances.map(
        (bal, idx) => bal + startingProviderBalances[idx]
      );
      pool.addLiquidity(provider, collateralProvided, weights);

      // after providing liquidity
      const endingPoolBalances = pool.getOutcomeBalances();
      const endingProviderBalances = weights.map((_, outcomeId) =>
        pool.getOutcomeBalance(provider, outcomeId)
      );
      const endingCombinedBalances = endingPoolBalances.map(
        (bal, idx) => bal + endingProviderBalances[idx]
      );
      endingCombinedBalances.forEach((outcomeBalance, idx) => {
        expect(outcomeBalance).to.equal(
          startingCombinedBalances[idx] + collateralProvided
        );
      });
    });
  });
  it("returns outcome tokens for more likely outcome", () => {
    // create a new pool and add initial liquidity at uneven odds/weights
    const pool = new Pool(2, 0);
    pool.addLiquidity("bob", 10, [1, 2]);

    // verify probabilities - higher weighted outcome should have higher price
    const mostLikelyOutcomeId = 0; // lower weight => higher probability
    const leastLikelyOutcomeId = 1; // higher weight => lower probability
    expect(pool.getSpotPrice(leastLikelyOutcomeId)).to.be.lessThan(
      pool.getSpotPrice(mostLikelyOutcomeId),
      "unexpected probabilities"
    );

    // add liquidity for a new provider (pool is already unequal)
    const provider = "alice";
    [0, 1].forEach((outcomeId) => {
      expect(pool.getOutcomeBalance(provider, outcomeId)).to.equal(
        0,
        "starting outcome balance should be zero"
      );
    });
    pool.addLiquidity(provider, 10);

    // make sure no unlikely token outcomes were given
    expect(pool.getOutcomeBalance(provider, leastLikelyOutcomeId)).to.equal(0);
    // make sure higher probability tokens were given
    expect(
      pool.getOutcomeBalance(provider, mostLikelyOutcomeId)
    ).to.be.greaterThan(0);
  });
  it("does not change probabilities when adding liquidity", () => {
    // test both with and without fees, for different number of outcomes
    const params: [number, number, number[]][] = [
      [2, 0, [1, 2]],
      [2, 0.1, [1, 2]],
      [3, 0, [1, 3, 5]],
    ];
    params.forEach(([numOutcomes, fee, weights]) => {
      const pool = new Pool(numOutcomes, fee);

      // add initial liquidity to create unequal weighted pool
      const initialProvider = "alice";
      pool.addLiquidity(initialProvider, 10, weights);
      const initialOdds = weights.map((_, outcomeId) =>
        pool.getSpotPrice(outcomeId)
      );

      // add liquidity from new provider
      const newProvider = "bob";
      pool.addLiquidity(newProvider, 100);
      const finalOdds = weights.map((_, outcomeId) =>
        pool.getSpotPrice(outcomeId)
      );

      // make sure odds are the same before and after
      initialOdds.forEach((odds, outcomeId) => {
        expect(odds).to.be.approximately(finalOdds[outcomeId], 0.00001);
      });
    });
  });
});
