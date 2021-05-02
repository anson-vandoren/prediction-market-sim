import { Pool } from "../js/pool";
import { expect } from "chai";
import "mocha";

describe("assertValidOutcome throws only when outcome is invalid", () => {
  const numOutcomes = 2;
  const pool = new Pool(numOutcomes, 0);
  it("should throw for outcomes < 0", () => {
    expect(() => pool.assertValidOutcome(-1)).to.throw("invalid outcome");
  });
  it("should throw for outcomes === numOutcomes", () => {
    expect(() => pool.assertValidOutcome(numOutcomes)).to.throw(
      "invalid outcome"
    );
  });
  it("should throw for outcomes > numOutcomes", () => {
    expect(() => pool.assertValidOutcome(numOutcomes + 1)).to.throw(
      "invalid outcome"
    );
  });
  it("should not throw for any valid outcome", () => {
    for (let i = 0; i < numOutcomes; i++) {
      expect(() => pool.assertValidOutcome(i)).to.not.throw();
    }
  });
});
