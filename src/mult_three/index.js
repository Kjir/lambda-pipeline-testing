'use strict';

const aws = require('aws-sdk');
const dynamoStreams = require('dynamo-streams');

const mult_three = require('./mult_three.js');

module.exports.handler = (event, context, callback) => {
  const dbStreams = dynamoStreams(new aws.DynamoDB);
  const put = dbStreams.createPutStream({TableName: "multiplied"});
  const unmarshall = aws.DynamoDB.Converter.unmarshall;
  const records = event.Records.map(record => Object.assign(record, {
    dynamodb: Object.assign(record.dynamodb, {
      Keys: unmarshall(record.dynamodb.Keys),
      NewImage: unmarshall(record.dynamodb.NewImage)
    })
  }));
  mult_three(put, records).then((result) => callback(null, result))
};
