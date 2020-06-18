const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchWiseTestSchema = new Schema({
  tId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
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
  testDt: {
    type: Number,
    required: true
  },
  topic: {
    type: String
  },
  subtopic: {
    type: String
  },
  totalMarks: {
    type: Number,
    default: -1
  },
  maxMarks: {
    type: Number,
    default: -1
  },
  avgMarks: {
    type: Number,
    default: -1
  },
  minMarks: {
    type: Number,
    default: -1
  },
  marksUploaded: {
    type: Boolean,
    default: false
  },
  processedByJob: {
    type: Boolean,
    default: false
  }
});

module.exports = BatchWiseTest = mongoose.model(
  "batchwisetest",
  BatchWiseTestSchema
);
