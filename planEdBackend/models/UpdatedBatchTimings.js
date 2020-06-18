const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UpdatedBatchTimingsSchema = new Schema({
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true
  },
  timings: {
    type: String,
    required: true
  },
  tId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true
  },
  clsDt: {
    type: Number
  },
  extraCls: {
    type: Boolean
  },
  cDt: {
    type: Number
  }
});

module.exports = UpdatedBatchTimings = mongoose.model(
  "updatedbatchtimings",
  UpdatedBatchTimingsSchema
);
