const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchWiseMessageSchema = new Schema({
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true,
  },
  broadcastDt: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
  },
  tId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  tNm: {
    type: String,
  },
});

module.exports = BatchWiseMessage = mongoose.model(
  "batchwisemessage",
  BatchWiseMessageSchema
);
