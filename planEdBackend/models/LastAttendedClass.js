const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const LastAttendedClassSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true,
  },
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true,
  },
  classDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000),
  },
});

module.exports = LastAttendedClass = mongoose.model(
  "lastattendedclass",
  LastAttendedClassSchema
);
