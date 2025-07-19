const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const transactionsData = require('../rawdata/transactions.json');
const usersData = require('../rawdata/users.json');

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Create a map of user id to register_id
const userRegisterMap = {};
usersData.forEach((user) => {
  userRegisterMap[user.id] = user.register_id;
});

// Helper function to enforce 5 decimal precision
const toFixed5 = (num) => parseFloat(Number(num).toFixed(5));

// Transaction type mapping
const transactionTypeMap = {
  '0': { ignore: true },
  '1': { 
    walletName: 'CGTBalance',
    isCredit: true,
    remark: 'ROI Bonus'
  },
  '2': { 
    walletName: 'CGTBalance',
    isCredit: true,
    remark: 'Growth Level Bonus'
  },
  '4': { 
    walletName: 'CGTBalance',
    isCredit: true,
    remark: 'Reward Bonus'
  },
  '5': { 
    walletName: 'autopoolBalance',
    isCredit: false,
    remark: 'Autopool Deposit'
  },
  '6': { 
    walletName: 'autopoolBalance',
    isCredit: true,
    remark: 'Autopool Reward'
  },
  '7': { 
    walletName: 'CGTBalance',
    isCredit: true,
    remark: 'Upline Bonus'
  },
  '8': { 
    walletName: 'CGTBalance',
    isCredit: false,
    remark: 'Withdrawal'
  }
};

const transformTransaction = (transaction) => {
  const config = transactionTypeMap[transaction.trans];
  
  if (config?.ignore) return null;
  
  const registerId = userRegisterMap[transaction.user_id];
  if (!registerId) {
    console.warn(`No register_id found for user_id: ${transaction.user_id}`);
    return null;
  }

  const amount = toFixed5(transaction.amount);
  
  return {
    userId: registerId,
    txHash: transaction.tx_hash || null,
    transactionRemark: config.remark,
    creditedAmount: config.isCredit ? amount : 0,
    debitedAmount: !config.isCredit ? amount : 0,
    fromAddress: !config.isCredit ? 'user_wallet' : 'system',
    toAddress: config.isCredit ? 'user_wallet' : 'system',
    walletName: config.walletName,
    status: 'completed',
    metadata: {
      originalId: transaction.id,
      originalTrans: transaction.trans,
      createdAt: transaction.created_at
    }
  };
};

const migrateTransactions = async () => {
  try {
    const transformedTransactions = transactionsData
      .map(transformTransaction)
      .filter(item => item !== null);
    
    await Transaction.insertMany(transformedTransactions);
    console.log(`✅ Successfully migrated ${transformedTransactions.length} transactions with 5-decimal precision!`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migrateTransactions();