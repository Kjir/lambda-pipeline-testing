"use strict";

const aws = require("aws-sdk");
const mochaPlugin = require("serverless-mocha-plugin");
const pipeline_mock = require("../pipeline_mock.js");

const expect = mochaPlugin.chai.expect;
const add_five = require(process.env.SERVERLESS_TEST_ROOT +
  "/src/add_five/index.js");
const mult_three = require(process.env.SERVERLESS_TEST_ROOT +
  "/src/mult_three/index.js");

describe("pipeline", () => {
  const pipeline = new pipeline_mock.Pipeline();
  before(done => {
    pipeline
      .dynamodb("numbers", { hash: { name: "value", type: "N" } })
      .stream("numbers", add_five)
      .dynamodb("incremented", { hash: { name: "value", type: "N" } })
      .stream("incremented", mult_three)
      .dynamodb("multiplied", { hash: { name: "value", type: "N" } });
    done();
  });

  after(done => {
    pipeline.destroy();
    done();
  });

  it("transforms 9 into 42", done => {
    const docClient = new aws.DynamoDB.DocumentClient();
    docClient.put({ TableName: "numbers", Item: { value: 9 } }, (err, data) => {
      docClient.get(
        { TableName: "multiplied", Key: { value: 42 } },
        (err, data) => {
          console.log(err, data);
          expect(data.Item.value).to.be.equal(42);
          done();
        }
      );
    });
  });
});
