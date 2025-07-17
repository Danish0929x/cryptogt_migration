const mongoose = require("mongoose");
const User = require("./models/User"); // Import your User model
const usersData = require("./rawdata/users.json"); // Import your JSON data

// Connect to MongoDB
mongoose.connect("mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Map JSON fields to Mongoose schema
const transformUser = (user) => ({
  walletAddress: user.wallet_address,
  userId: user.register_id,
  name: user.name || null,
  email: user.email || null,
  phone: user.mobile || null,
  parentId: user.parent_id,
  verified: user.status === "1", // Convert "1" to true, others to false
  rewardStatus: "User", // Default (adjust based on rank_id if needed)
  blockStatus: user.user_status !== "1", // Assuming "1" means active
  isRewardBlock: user.is_reward_block === "1", // Convert to boolean
});

// Insert users into MongoDB
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