const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true }, // Positive for income, negative for expense
  category: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);