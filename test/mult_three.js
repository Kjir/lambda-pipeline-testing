"use strict";

const mochaPlugin = require("serverless-mocha-plugin");
const sinon = require("sinon");
const expect = mochaPlugin.chai.expect;
let wrapped = mochaPlugin.getWrapper(
  "mult_three",
  "/src/mult_three/index.js",
  "handler"
);
const mult_three = require(process.env.SERVERLESS_TEST_ROOT +
  "/src/mult_three/mult_three.js");

describe("mult_three", () => {
  before(done => {
    done();
  });

  it("returns success with no records", () => {
    return wrapped.run({ Records: [] }).then(response => {
      expect(response).to.be.equal("Yay");
    });
  });

  it("multiplies the values by 3", () => {
    const records = [{ dynamodb: { Keys: { value: 4 } }, eventName: "INSERT" }];
    const putStream = {
      on: () => undefined,
      end: () => undefined,
      write: sinon.fake()
    };
    mult_three(putStream, records);
    expect(putStream.write.calledWith({ value: 12 })).to.be.ok;
  });
});
