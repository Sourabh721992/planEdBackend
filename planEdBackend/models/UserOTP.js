const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UserOTPSchema = new Schema({
  nm: {
    type: String,
    required: true
  },
  cNo: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  pwd: {
    type: String,
    required: true
  },
  role: {
    type: [String],
    required: true
  },
  otp: {
    type: Number,
    required: true
  },
  addrs: {
    type: String
  },
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = UserOTP = mongoose.model("userotp", UserOTPSchema);
