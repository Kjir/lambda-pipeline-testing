'use strict';
const aws = require('aws-sdk');
const dynamoStreams = require('dynamo-streams');

const add_five = require('./add_five.js');

module.exports.handler = (event, context, callback) => {
  const dbStreams = dynamoStreams(new aws.DynamoDB);
  const put = dbStreams.createPutStream({TableName: "incremented"});
  const unmarshall = aws.DynamoDB.Converter.unmarshall;
  const records = event.Records.map(record => Object.assign(record, {
    dynamodb: Object.assign(record.dynamodb, {
      Keys: unmarshall(record.dynamodb.Keys),
      NewImage: unmarshall(record.dynamodb.NewImage)
    })
  }));
  add_five(put, records).then((result) => callback(null, result))
};
