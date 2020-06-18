const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UserSchema = new Schema({
  nm: {
    type: String
  },
  cNo: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addrs: {
    type: String
  },
  pwd: {
    type: String,
    required: true
  },
  role: {
    type: [String],
    required: true
  },
  cDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  },
  mDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = User = mongoose.model("user", UserSchema);
