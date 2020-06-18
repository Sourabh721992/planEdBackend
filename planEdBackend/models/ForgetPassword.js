const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const ForgetPasswordSchema = new Schema({
  cNo: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  otp: {
    type: Number,
    required: true
  },
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = ForgetPassword = mongoose.model(
  "forgetpassword",
  ForgetPasswordSchema
);
