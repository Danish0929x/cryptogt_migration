const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  txHash: {
    type: String
  },
  transactionRemark: {
    type: String
  },
  creditedAmount: {
    type: Number,
    default: 0
  },
  debitedAmount: {
    type: Number,
    default: 0
  },
  fromAddress: {
    type: String
  },
  toAddress: {
    type: String
  },
  walletName: {
    type: String,
    enum: ['USDTBalance', 'autopoolBalance', 'utilityBalance'],
    required: true
  },
   tokenRate: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);