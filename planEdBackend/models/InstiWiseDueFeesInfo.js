const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const InstiWiseDueFeesInfoSchema = new Schema({
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true,
  },
  studentDueFees: {
    type: Map,
    of: {
      sId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
      batchWiseDueFees: {
        type: Map,
        of: [
          {
            discount: {
              type: Number,
              default: 0,
            },
            scholarship: {
              type: Number,
              default: 0,
            },
            fine: {
              type: Number,
              default: 0,
            },
            paidDt: {
              type: Number, // will be a datetime
            },
            paidMethod: {
              type: String,
              default: " ",
            },
            isPaid: {
              type: Boolean,
              default: true,
            },
            txnId: {
              type: String,
              default: " ",
            },
            fee: {
              type: Number,
              required: true,
            },
            totalFee: {
              type: Number,
            },
            dueDt: {
              type: Number,
            },
          },
        ],
      },
    },
  },
});

module.exports = InstiWiseDueFeesInfo = mongoose.model(
  "instiwiseduefeesinfo",
  InstiWiseDueFeesInfoSchema
);
