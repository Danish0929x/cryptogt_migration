const mongoose = require('mongoose');
const fs = require('fs');
const readline = require('readline');
const Transaction = require('../models/Transaction');
const usersData = require('../rawdata/users.json');

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0"
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
  
  if (!config) {
    console.warn(`Unknown transaction type: ${transaction.trans} (trans id: ${transaction.id})`);
    return null;
  }
  
  if (config.ignore) return null;
  
  const registerId = userRegisterMap[transaction.user_id];
  if (!registerId) {
    console.warn(`No register_id found for user_id: ${transaction.user_id}`);
    return null;
  }

  const amount = toFixed5(transaction.amount);
  
  return {
    userId: registerId,
    txHash: transaction.tx_hash || null,
    transactionRemark: config.remark || null,
    creditedAmount: config.isCredit ? amount : 0,
    debitedAmount: !config.isCredit ? amount : 0,
    fromAddress: !config.isCredit ? 'user_wallet' : 'system',
    toAddress: config.isCredit ? 'user_wallet' : 'system',
    walletName: config.walletName,
    createdAt: transaction.created_at ? new Date(transaction.created_at) : null,
    status: 'completed',
  };
};

const migrateTransactions = async () => {
  try {
    const fileStream = fs.createReadStream('./rawdata/transactions.json');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentObject = '';
    let insideObject = false;
    let braceCount = 0;
    let lineNumber = 0;
    
    const batchSize = 5000;
    let batch = [];
    let transactionCount = 0;
    let processedCount = 0;
    
    console.log('Starting direct migration from large JSON file...');
    
    for await (const line of rl) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines and array brackets
      if (!trimmedLine || trimmedLine === '[' || trimmedLine === ']') continue;
      
      // Check if this line starts a new object
      if (trimmedLine.startsWith('{')) {
        insideObject = true;
        currentObject = '';
        braceCount = 0;
      }
      
      if (insideObject) {
        currentObject += line;
        
        // Count braces to determine when object is complete
        for (let char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        // Object is complete
        if (braceCount === 0) {
          try {
            // Remove trailing comma if present
            let cleanObject = currentObject.trim();
            if (cleanObject.endsWith(',')) {
              cleanObject = cleanObject.slice(0, -1);
            }
            
            const transaction = JSON.parse(cleanObject);
            const transformedTransaction = transformTransaction(transaction);
            
            if (transformedTransaction) {
              batch.push(transformedTransaction);
              
              if (batch.length >= batchSize) {
                await Transaction.insertMany(batch);
                transactionCount += batch.length;
                console.log(`✅ Processed batch: ${batch.length} transactions (Total: ${transactionCount})`);
                batch = [];
              }
            }
            
            processedCount++;
            if (processedCount % 50000 === 0) {
              console.log(`Processed ${processedCount} raw transactions...`);
            }
            
          } catch (parseError) {
            console.log(`Skipping malformed transaction at line ${lineNumber}: ${parseError.message}`);
          }
          
          insideObject = false;
          currentObject = '';
        }
      }
    }
    
    // Process remaining transactions in the last batch
    if (batch.length > 0) {
      await Transaction.insertMany(batch);
      transactionCount += batch.length;
      console.log(`✅ Processed final batch: ${batch.length} transactions`);
    }
    
    console.log(`✅ Successfully migrated ${transactionCount} transactions with 5-decimal precision from ${processedCount} raw transactions!`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migrateTransactions();