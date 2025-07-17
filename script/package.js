const mongoose = require("mongoose");
const Package = require("../models/Packages");
const usersData = require("../rawdata/users.json");
const packageData = require("../rawdata/package1.json");

// Connect to MongoDB
mongoose.connect("mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create a map of user id to register_id
const userRegisterMap = {};
usersData.forEach(user => {
  userRegisterMap[user.id] = user.register_id; // Maps user.id (like "7") to register_id (like "CGT4788145")
});

// Map JSON fields to Mongoose schema
const transformPackage = (package) => {
  const cgtCoin = (parseFloat(package.amount) / 22);
  const createdAt = new Date(package.created_at);
  const today = new Date();
  const daysPassed = Math.min(
    Math.floor((today - createdAt) / (1000 * 60 * 60 * 24)),
    500
  );
  const poi = +(cgtCoin * 0.005 * daysPassed).toFixed(5);

  // Get the register_id for this package's user_id
  const registerId = userRegisterMap[package.user_id];
  if (!registerId) {
    console.warn(`No register_id found for user_id: ${package.user_id}`);
  }

  return {
    userId: registerId, // This will be like "CGT4788145" for user_id "7"
    packageType: "Leader",
    packageAmount: parseFloat(package.amount),
    cgtCoin: cgtCoin.toFixed(5),
    txnId: package.transaction_hash || null,
    poi: poi,
    productVoucher: false,
    startDate: package.created_at ? new Date(package.created_at) : null,
    status: package.status === "1",
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