const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const StudentWiseFeeSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  bIds: [
    {
      bId: {
        type: Schema.Types.ObjectId,
        ref: "batch"
      },
      feeInfo: [
        {
          fee: {
            type: Number
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
            type: Number,
            default: -1
          },
          paidMethod: {
            type: String,
            default: " "
          },
          isPaid: {
            type: Boolean,
            default: false
          },
          txnId: {
            type: String,
            default: " "
          },
          _id: false
        }
      ],
      feePlan: {
        month: {
          type: Number
        },
        installment: {
          type: Number
        },
        fee: {
          type: Number
        },
        _id: false
      },
      _id: false
    }
  ],
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = StudentWiseFee = mongoose.model(
  "studentwisefee",
  StudentWiseFeeSchema
);
