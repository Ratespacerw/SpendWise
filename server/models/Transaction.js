const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, default: '' },
  date: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);