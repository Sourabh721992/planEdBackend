//This schema will simply maintain the fee transaction details.
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FeeTxnDetailsSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  pId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true
  },
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true
  },
  fee: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  scholarship: {
    type: Number,
    default: 0
  },
  fine: {
    type: Number,
    default: 0
  },
  totalFee: {
    type: Number
  },
  dueDt: {
    type: Number
  },
  paidDt: {
    type: Number // will be a datetime
  },
  paidMethod: {
    type: String,
    default: " "
  },
  isPaid: {
    type: Boolean,
    default: true
  },
  txnId: {
    type: String,
    default: " "
  },
  sts: {
    type: Number,
    default: 1
  }
});

module.exports = FeeTxnDetails = mongoose.model(
  "feetxndetails",
  FeeTxnDetailsSchema
);
