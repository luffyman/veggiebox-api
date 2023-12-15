const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const itemsModel = new Schema({
  name: { type: String, default: ''},
  pack_price: { type: Number, },
  packed_items: { type: Number, },
  qty_in_store: { type: Number},
  package_type: {type: String},
  emoji: { type: String,  },
  key_word: { type: Array },

});

module.exports = mongoose.model('items', itemsModel);