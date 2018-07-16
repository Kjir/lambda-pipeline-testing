"use strict";

const aws = require("aws-sdk");
aws.config.update({
  region: "eu-west-1",
  endpoint: "http://dynamodb:8000"
});
const dynamodb = new aws.DynamoDB();
const docClient = new aws.DynamoDB.DocumentClient({ service: dynamodb });

const mochaPlugin = require("serverless-mocha-plugin");
const pipeline_mock = require("../pipeline_mock.js");

const expect = mochaPlugin.chai.expect;
const add_five = require(process.env.SERVERLESS_TEST_ROOT +
  "/src/add_five/index.js");
const mult_three = require(process.env.SERVERLESS_TEST_ROOT +
  "/src/mult_three/index.js");

describe("pipeline", () => {
  const pipeline = new pipeline_mock.Pipeline(
    dynamodb,
    new aws.DynamoDBStreams()
  );

  const sleep = async millis =>
    new Promise(resolve => setTimeout(resolve, millis));

  before(async () => {
    await pipeline
      .dynamodb("numbers", { hash: { name: "value", type: "N" } })
      .stream("numbers", add_five)
      .dynamodb("incremented", { hash: { name: "value", type: "N" } })
      .stream("incremented", mult_three)
      .dynamodb("multiplied", { hash: { name: "value", type: "N" } })
      .waitForAll();
  });

  after(async () => await pipeline.destroy());

  it("transforms 9 into 42", async () => {
    await docClient.put({ TableName: "numbers", Item: { value: 9 } }).promise();
    await pipeline.processTable("numbers");
    await sleep(50);
    await pipeline.processTable("incremented");
    await sleep(50);
    const data = await docClient
      .get({
        TableName: "multiplied",
        Key: { value: 42 }
      })
      .promise();
    expect(data.Item.value).to.be.equal(42);
  });
});
