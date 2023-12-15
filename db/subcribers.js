const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscribersModel = new Schema({
  subscriptionType: { type: String, default: ''},
  packagePrice: { type: String, default: '' },
  subscriptionDetail: { type: String, },
});

module.exports = mongoose.model('subscribers', subscribersModel);