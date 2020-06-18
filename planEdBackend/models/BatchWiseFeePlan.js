const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchWiseFeeSchema = new Schema({
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true
  },
  feePlans: [
    {
      month: {
        type: Number
      },
      fee: {
        type: Number
      },
      installments: {
        type: Number
      },
      _id: false
    }
  ]
});

module.exports = BatchWiseFee = mongoose.model(
  "batchwisefee",
  BatchWiseFeeSchema
);
