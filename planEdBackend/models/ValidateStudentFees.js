//This schema is used just to add fees details made by parent on which action
//is required from admin end.
//Admin will verify whether e has received the fees or not from his end.
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ValidateStudentFeesSchema = new Schema({
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
    type: String
  },
  paidDt: {
    type: String // will be a datetime
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
  }
});

module.exports = ValidateStudentFees = mongoose.model(
  "validatestudentfees",
  ValidateStudentFeesSchema
);
