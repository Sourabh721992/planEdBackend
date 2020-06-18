//This schema is used just to add students on which action
//is required from teacher end.
//Once teacher updates the status, delete from the collection
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ApproveStudentsSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  pId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true
  },
  bId: {
    type: Schema.Types.ObjectId,
    ref: "batch",
    required: true
  },
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = ApproveStudents = mongoose.model(
  "approvestudents",
  ApproveStudentsSchema
);
