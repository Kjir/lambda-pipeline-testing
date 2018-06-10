"use strict";

const mochaPlugin = require("serverless-mocha-plugin");
const sinon = require("sinon");
const expect = mochaPlugin.chai.expect;
let wrapped = mochaPlugin.getWrapper(
  "add_five",
  "/src/add_five/index.js",
  "handler"
);
const add_five = require(process.env.SERVERLESS_TEST_ROOT +
  "/src/add_five/add_five.js");

describe("add_five", () => {
  before(done => {
    done();
  });

  it("succeeds with no records", () => {
    return wrapped.run({ Records: [] }).then(response => {
      expect(response).to.be.equal("Yay");
    });
  });

  it("adds 5 to the values", () => {
    const records = [{ dynamodb: { Keys: { value: 4 } }, eventName: "INSERT" }];
    const putStream = {
      on: () => undefined,
      end: () => undefined,
      write: sinon.fake()
    };
    add_five(putStream, records);
    expect(putStream.write.calledWith({ value: 9 })).to.be.ok;
  });
});
