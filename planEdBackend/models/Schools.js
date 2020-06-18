const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const SchoolSchema = new Schema({
  nm: {
    type: String,
    required: true
  },
  cNo: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  website: {
    type: String
  },
  pincode: {
    type: Number,
    required: true
  },
  addrs: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
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

module.exports = School = mongoose.model("school", SchoolSchema);
