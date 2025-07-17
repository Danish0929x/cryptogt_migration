const mongoose = require("mongoose");

const assetsSchema = new mongoose.Schema({
  PayoutWalletKey: {
    type: String,
    default: "",
  },
  DepositWallet: {
    type: String,
    default: "",
  },
  USDTWithdrawalStatus: {
    type: Boolean,
    default: false,
  },
  announcement: {
    type: String,
    default: "",
  },
  popUpImage: {
    type: String,  
    default: "",   
  },
});

const Assets = mongoose.model("Assets", assetsSchema);

module.exports = Assets;