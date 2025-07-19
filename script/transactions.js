const mongoose = require("mongoose");
const User = require("./models/User"); // Import your User model
const usersData = require("./rawdata/users.json"); // Import your JSON data
const Wallet = require("../models/Wallet");

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://cryptogt:cryptogt@cluster0.qeuff.mongodb.net/Cryptography?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Map JSON fields to Mongoose schema
const transformUser = (user) => ({
  userId: user.register_id,
  CGTBalance: 0,
});

// Insert users into MongoDB
const migrateUsers = async () => {
  try {
    const transformedUsers = usersData.map(transformUser);
    await Wallet.insertMany(transformedUsers);
    console.log("✅ Users migrated successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
};

migrateUsers();
