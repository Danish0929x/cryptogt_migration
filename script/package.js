const mongoose = require("mongoose");
const Package = require("../models/Packages");
const usersData = require("../rawdata/users.json");
const stackData = require("../rawdata/stack_users.json");

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0"
);

// Create a map of user id to register_id
const userRegisterMap = {};
usersData.forEach((user) => {
  userRegisterMap[user.id] = user.register_id; // Maps user.id (like "7") to register_id (like "CGT4788145")
});

// Map JSON fields to Mongoose schema
const transformPackage = (stack_users) => {
  const cgtCoin = Number((parseFloat(stack_users.amount) / 22).toFixed(5));
  const createdAt = new Date(stack_users.created_at);
  const today = new Date();
  const daysPassed = Math.min(
    Math.floor((today - createdAt) / (1000 * 60 * 60 * 24)),
    500
  );
  const poi = +(stack_users.amount * 0.005 * daysPassed).toFixed(5);

  // Get the register_id for this package's user_id
  const registerId = userRegisterMap[stack_users.user_id];
  if (!registerId) {
    console.warn(`No register_id found for user_id: ${stack_users.user_id}`);
  }

  return {
    userId: registerId, // This will be like "CGT4788145" for user_id "7"
    packageType: "Leader",
    packageAmount: parseFloat(stack_users.amount),
    cgtCoin: stack_users.token_amount
      ? Number(stack_users.token_amount).toFixed(5)
      : cgtCoin,
    txnId: stack_users.transaction_hash || null,
    poi: poi,
    productVoucher: false,
    startDate: stack_users.created_at ? new Date(stack_users.created_at) : null,
    status: stack_users.status === "1" ? "Active" : "Inactive",
  };
};

// Insert packages into MongoDB
const migratePackages = async () => {
  try {
    const transformedPackages = stackData.map(transformPackage);
    await Package.insertMany(transformedPackages);
    console.log("✅ Packages migrated successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migratePackages();
