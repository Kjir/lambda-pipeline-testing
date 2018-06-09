'use strict';
const aws = require('aws-sdk');
const dynamoStreams = require('dynamo-streams');

const add_five = require('./add_five.js');

module.exports = {
  add_five: (event, context, callback) => {
    const dbStreams = dynamoStreams(new aws.DynamoDB);
    const put = dbStreams.createPutStream({TableName: "numbers"});
    const records = event.Records.map(record => aws.DynamoDB.Converter.unmarshall(record));
    add_five(put, records).then((result) => callback(null, result))
  }
};
