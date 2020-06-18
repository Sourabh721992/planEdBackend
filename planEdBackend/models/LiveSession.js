const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const LiveSessionSchema = new Schema({
  tId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true,
  },
  bNm: {
    type: String,
  },
  tNm: {
    type: String,
  },
  dt: {
    type: Number,
  },
  chapter: {
    type: String,
  },
  topic: {
    type: String,
  },
  description: {
    type: String,
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  chapterDone: {
    type: Boolean,
  },
  // expired: {
  //   type: Boolean
  // },
  started: {
    type: Boolean,
    default: false,
  },
});

module.exports = LiveSession = mongoose.model("livesession", LiveSessionSchema);
