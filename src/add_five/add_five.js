module.exports = (put, records) => {
  put.on('error', console.error);
  records.filter(record => record.eventName == 'INSERT').forEach((record) => {
    console.log('Processing: %j', record);
    const value = record.dynamodb.Keys.value;
    put.write({value: value + 5});
  });
  const result = new Promise((resolve, reject) => {
    put.on("finish", () => resolve('Yay'));
  });
  put.end();
  return result;
}
