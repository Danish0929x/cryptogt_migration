const mongoose = require("mongoose");
const Package = require("../models/Packages"); // Import your Package model
const usersData = require("../rawdata/users.json"); // Import your users JSON data
const packageData = require("../rawdata/package1.json"); // Import your package JSON data

// Connect to MongoDB
mongoose.connect("mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create a map of user_id to register_id for quick lookup
const userMap = {};
usersData.forEach(user => {
  userMap[user.id] = user.register_id;
});

// Map JSON fields to Mongoose schema
const transformPackage = (package) => {
  const cgtCoin = (package.amount / 22);
  const createdAt = new Date(package.created_at);
  const today = new Date();
  const daysPassed = Math.min(
    Math.floor((today - createdAt) / (1000 * 60 * 60 * 24)),
    500
  );
  const poi = +(cgtCoin * 0.005 * daysPassed).toFixed(5);

  return {
    userId: userMap[package.user_id], // Get register_id from the userMap
    packageType: "Leader",
    packageAmount: package.amount,
    cgtCoin: cgtCoin.toFixed(5),
    txnId: package.transaction_hash || null,
    poi: poi,
    productVoucher: false,
    startDate: package.created_at || null,
    status: true, 
  };
};

// Insert packages into MongoDB
const migratePackages = async () => {
  try {
    const transformedPackages = packageData.map(transformPackage);
    await Package.insertMany(transformedPackages);
    console.log("✅ Packages migrated successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migratePackages();