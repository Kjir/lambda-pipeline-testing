const sinon = require("sinon");
const aws_mock = require("aws-sdk-mock");
const converters = require("aws-sdk").DynamoDB.Converter;

function mockPutItem() {
  aws_mock.mock("DynamoDB.DocumentClient", "put", (params, callback) => {
    const ddbparams = Object.assign({}, params, {
      Item: converters.marshall(params.Item)
    });
    return putItem.call(this, ddbparams, callback);
  });
  aws_mock.mock("DynamoDB", "putItem", putItem.bind(this));
}

function mockGetItem() {
  aws_mock.mock("DynamoDB.DocumentClient", "get", (params, callback) => {
    const ddbparams = Object.assign({}, params, {
      Key: converters.marshall(params.Key)
    });
    return getItem.call(this, ddbparams, callback);
  });
  aws_mock.mock("DynamoDB", "getItem", getItem.bind(this));
}

function putItem(params, callback) {
  const table = this.tables[params.TableName];
  if (!table) {
    callback(`Table ${params.TableName} not existing`, null);
  }
  const key = table.key.hash;
  const items = Object.assign(table.items || {}, {
    [params.Item[key.name][key.type]]: params.Item
  });
  this.tables[params.TableName] = Object.assign({}, table, { items });
  callback(null, params.Item);
}

function getItem(params, callback) {
  const table = this.tables[params.TableName];
  if (!table) {
    callback(`Table ${params.TableName} not existing`, null);
  }
  const itemStore = table.items || {};
  const key = table.key.hash;
  const item = itemStore[params.Key[key.name][key.type]];
  callback(null, item);
}

class Pipeline {
  constructor() {
    this.tables = {};
    mockPutItem.call(this);
    mockGetItem.call(this);
  }

  dynamodb(table, key) {
    this.tables[table] = Object.assign(this.tables[table] || {}, { key });
    return this;
  }

  stream(table, lambda) {
    const tableDef = this.tables[table] || {};
    const streams = tableDef.streams || [];
    this.tables[table] = Object.assign(tableDef, {
      streams: [...streams, lambda]
    });
    return this;
  }

  destroy() {
    aws_mock.restore("DynamoDB.DocumentClient");
    aws_mock.restore("DynamoDB");
  }
}

module.exports = {
  Pipeline: Pipeline
};
