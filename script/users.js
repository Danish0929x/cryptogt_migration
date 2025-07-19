const mongoose = require("mongoose");
const User = require("../models/User");
const usersData = require("../rawdata/users.json");

// Connect to MongoDB
mongoose.connect("mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0");

// STEP 1: Create map of `id` → `register_id`
const idToRegisterIdMap = {};
usersData.forEach((user) => {
  if (user.id && user.register_id) {
    idToRegisterIdMap[user.id] = user.register_id;
  }
});

// STEP 2: Transform user with parentId resolved to register_id
const transformUser = (user) => ({
  walletAddress: user.wallet_address,
  userId: user.register_id,
  name: user.name || null,
  email: user.email || null,
  phone: user.mobile || null,
  parentId: idToRegisterIdMap[user.parent_id] || null, // Replace numeric id with register_id
  verified: user.status === "1",
  rewardStatus: "User",
  blockStatus: user.user_status !== "1",
  isRewardBlock: user.is_reward_block === "1",
});

// STEP 3: Migrate
const migrateUsers = async () => {
  try {
    const transformedUsers = usersData.map(transformUser);
    await User.insertMany(transformedUsers);
    console.log("✅ Users migrated successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migrateUsers();
