const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchActivityTrackerSchema = new Schema({
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true,
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  activity: [
    {
      dt: {
        type: Number,
      },
      topic: {
        type: String,
      },
      subtopic: {
        type: String,
      },
      description: {
        type: String,
      },
      tId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
      online: {
        type: Boolean,
        default: false,
      },
      _id: false,
    },
  ],
});

module.exports = BatchActivityTracker = mongoose.model(
  "batchactivitytracker",
  BatchActivityTrackerSchema
);
