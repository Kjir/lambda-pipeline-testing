const aws = require("aws-sdk");

class Pipeline {
  constructor(dynamodb, dynamodbstreams) {
    this.tables = [];
    this.existingTables = {};
    this.streams = {};
    this.ddbClient = dynamodb;
    this.ddbStreams = dynamodbstreams;
  }

  dynamodb(table, key) {
    this.tables.push(
      this.ddbClient
        .createTable({
          TableName: table,
          AttributeDefinitions: [
            {
              AttributeName: key.hash.name,
              AttributeType: key.hash.type
            }
          ],
          KeySchema: [
            {
              AttributeName: key.hash.name,
              KeyType: "HASH"
            }
          ],
          StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: "NEW_AND_OLD_IMAGES"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        })
        .promise()
    );
    return this;
  }

  async getStreamIterator(table) {
    const tables = await Promise.all(this.tables);
    const tableDescription = tables.find(
      tableDesc => tableDesc.TableName == table
    );
    const streamArn = tableDescription.LatestStreamArn;
    const description = (await this.ddbStreams
      .describeStream({ StreamArn: streamArn })
      .promise()).StreamDescription;
    const iterator = await this.ddbStreams
      .getShardIterator({
        ShardId: description.Shards.shift().ShardId,
        StreamArn: streamArn,
        ShardIteratorType: "TRIM_HORIZON"
      })
      .promise();
    return iterator;
  }

  stream(table, lambda) {
    this.streams[table] = {
      lambda: lambda
    };

    return this;
  }

  async waitForTable(table) {
    if (!this.existingTables.hasOwnProperty(table)) {
      this.existingTables[table] = this.ddbClient
        .waitFor("tableExists", { TableName: table })
        .promise();
    }
    return await this.existingTables[table];
  }

  async waitForAll() {
    const tables = this.tables.map(async table => {
      table = await table;
      await this.waitForTable(table.TableDescription.TableName);
      return table.TableDescription;
    });
    this.tables = await Promise.all(tables);
  }

  async processTable(table) {
    const lambda = this.streams[table].lambda;
    const iterator = await this.getStreamIterator(table);
    this.streams[table].iterator = iterator;
    const rec = await this.getAllRecords(iterator);
    console.log("rec:", rec);
    return new Promise((resolve, reject) =>
      lambda.handler({ Records: rec }, null, (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      })
    );
  }

  async processStream() {
    const streamedTables = this.tables
      .map(table => table.TableName)
      .filter(table => {
        return this.streams.hasOwnProperty(table);
      });
    for (const table of streamedTables) {
      console.log("Process Stream: ", table);
      await this.processTable(table);
    }
  }

  async getAllRecords(iterator, retries = 3) {
    try {
      const record = await this.ddbStreams.getRecords(iterator).promise();
      return record.Records;
    } catch (exception) {
      console.error(exception);
      if (retries > 0) {
        return this.getAllRecords(iterator, retries - 1);
      }
    }
  }

  async destroy() {}
}

module.exports = {
  Pipeline: Pipeline
};
