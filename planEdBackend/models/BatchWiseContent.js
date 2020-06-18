const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchWiseContentSchema = new Schema({
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  uploadedDt: {
    type: Number,
    required: true
  },
  // shareToStudents: {
  //   type: Boolean,
  //   default: false
  // },
  uploadedPath: {
    type: String
  },
  fileNm: {
    type: String
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String
  },
  description: {
    type: String
  },
  tId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  }
});

module.exports = BatchWiseContent = mongoose.model(
  "batchwisecontent",
  BatchWiseContentSchema
);
