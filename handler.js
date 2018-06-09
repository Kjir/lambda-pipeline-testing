'use strict';

const add_five = require('./add_five.js');

module.exports = {
  add_five: (event, context, callback) => {
    add_five(event).then((result) => callback(null, result))
  }

};
