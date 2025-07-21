const mongoose = require("mongoose");
const fs = require("fs");
const readline = require("readline");
const User = require("../models/User"); // Import your User model
const usersData = require("../rawdata/users.json"); // Import your JSON data
const Wallet = require("../models/Wallet");

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0"
);

// Function to calculate user balances from transactions
const calculateUserBalances = async () => {
  const userBalances = {};

  // Initialize balances for all users
  usersData.forEach((user) => {
    userBalances[user.id] = {
      userId: user.register_id,
      USDTBalance: 0,
      autopoolBalance: 0,
      utilityBalance: 0,
    };
  });

  console.log("Reading transactions to calculate balances...");

  const fileStream = fs.createReadStream("./rawdata/transactions.json");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentObject = "";
  let insideObject = false;
  let braceCount = 0;
  let processedCount = 0;

  for await (const line of rl) {
    const trimmedLine = line.trim();

    // Skip empty lines and array brackets
    if (!trimmedLine || trimmedLine === "[" || trimmedLine === "]") continue;

    // Check if this line starts a new object
    if (trimmedLine.startsWith("{")) {
      insideObject = true;
      currentObject = "";
      braceCount = 0;
    }

    if (insideObject) {
      currentObject += line;

      // Count braces to determine when object is complete
      for (let char of line) {
        if (char === "{") braceCount++;
        if (char === "}") braceCount--;
      }

      // Object is complete
      if (braceCount === 0) {
        try {
          // Remove trailing comma if present
          let cleanObject = currentObject.trim();
          if (cleanObject.endsWith(",")) {
            cleanObject = cleanObject.slice(0, -1);
          }

          const transaction = JSON.parse(cleanObject);
          const userId = transaction.user_id;
          const transType = transaction.trans;
          const amount = parseFloat(transaction.amount);

          if (userBalances[userId]) {
            // CGT Balance calculation: trans in (1, 2, 4, 6, 7) only, minus trans 9 (withdraw)
            if (["1", "2", "4", "6", "7"].includes(transType)) {
              userBalances[userId].USDTBalance += amount;
            } else if (["0", "8", "5", "9"].includes(transType)) {
              userBalances[userId].USDTBalance -= amount; // Withdraw - subtract from balance
            }

            // // Autopool Balance calculation: trans 6 (autopool reward) - trans 5 (autopool deposit)
            // if (transType === '6') {
            //   userBalances[userId].autopoolBalance += amount;
            // } else if (transType === '5') {
            //   userBalances[userId].autopoolBalance -= amount;
            // }
          }

          processedCount++;
          if (processedCount % 100000 === 0) {
            console.log(`Processed ${processedCount} transactions...`);
          }
        } catch (parseError) {
          // Skip malformed transactions
        }

        insideObject = false;
        currentObject = "";
      }
    }
  }

  console.log(`Finished processing ${processedCount} transactions`);

  // Convert to array and ensure 5 decimal precision
  return Object.values(userBalances).map((balance) => ({
    userId: balance.userId,
    USDTBalance: parseFloat((balance.USDTBalance ).toFixed(5)),
    autopoolBalance: parseFloat(balance.autopoolBalance.toFixed(5)),
    utilityBalance: balance.utilityBalance,
  }));
};

// Map JSON fields to Mongoose schema (now unused, replaced by calculateUserBalances)
const transformUser = (user) => ({
  userId: user.register_id,
  USDTBalance: 0,
  autopoolBalance: 0,
  utilityBalance: 0,
});

// Insert users into MongoDB
const migrateUsers = async () => {
  try {
    console.log("Starting wallet migration with balance calculations...");

    // Calculate real balances from transactions
    const walletsWithBalances = await calculateUserBalances();

    console.log(`Calculated balances for ${walletsWithBalances.length} users`);
    console.log("Sample balances:", walletsWithBalances.slice(0, 3));

    // Insert wallets with calculated balances
    await Wallet.insertMany(walletsWithBalances);

    console.log("✅ Wallets migrated successfully with calculated balances!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migrateUsers();
