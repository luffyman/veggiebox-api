const dayjs = require('dayjs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userModel = new Schema({
  userName: { type: String, default: ''},
  Homelocation: { type: String, default: '' },
  phoneNumber: { type: String, require: true,},
  createdOn: { type: String, require: true, default: dayjs().format('DD-MM-YYYY') },
  role: { type: String,  default: 'normal_user' },
  pin: {type: String}
});

module.exports = mongoose.model('users', userModel);
