const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const InstituteSchema = new Schema({
  nm: {
    type: String,
    required: true,
  },
  cNo: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  website: {
    type: String,
  },
  pincode: {
    type: Number,
    required: true,
  },
  addrs: {
    type: String,
  },
  admin: [
    {
      type: Schema.Types.ObjectId,
      // require: true,
      ref: "user",
    },
  ],
  teachers: [
    {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  cDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000),
  },
  mDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000),
  },
});

module.exports = Institute = mongoose.model("institute", InstituteSchema);
