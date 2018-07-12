const aws = require("aws-sdk");

class Pipeline {
  constructor(dynamodb, dynamodbstreams) {
    this.tables = [];
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

  stream(table, lambda) {
    const getStreamIterators = async table => {
      const tableDescription = await this.ddbClient
        .waitFor("tableExists", { TableName: table })
        .promise();
      const streamArn = tableDescription.Table.LatestStreamArn;
      const description = (await this.ddbStreams
        .describeStream({ StreamArn: streamArn })
        .promise()).StreamDescription;
      return await Promise.all(
        description.Shards.map(shard => shard.ShardId).map(shard =>
          this.ddbStreams
            .getShardIterator({
              ShardId: shard,
              StreamArn: streamArn,
              ShardIteratorType: "LATEST"
            })
            .promise()
        )
      );
    };

    this.streams[table] = {
      iterators: getStreamIterators(table),
      lambda: lambda
    };

    return this;
  }

  async waitForAll() {
    const waitForTable = async table =>
      this.ddbClient.waitFor("tableExists", { TableName: table }).promise();

    const tables = this.tables.map(async table => {
      table = await table;
      await waitForTable(table.TableDescription.TableName);
      return table.TableDescription;
    });
    this.tables = await Promise.all(tables);
  }

  async processStream() {
    await Promise.all(
      this.tables
        .map(table => table.TableName)
        .filter(table => {
          return this.streams.hasOwnProperty(table);
        })
        .map(async table => {
          const lambda = this.streams[table].lambda;
          const iterators = await this.streams[table].iterators;
          iterators.map(async iterator => {
            const record = await this.ddbStreams.getRecords(iterator).promise();
            console.log(record);
          });
        })
    );
  }

  async destroy() {}
}

module.exports = {
  Pipeline: Pipeline
};
