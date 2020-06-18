//This schema is used just to add students on which action
//is required from admin end.
//Admin will enter the fee plan of student from his end.
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InputStudentFeesSchema = new Schema(
  {
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
    batchJoiningDt: {
      type: Number,
      default: Math.trunc(Date.now() / 1000)
    },
    dt: {
      type: Number,
      default: Math.trunc(Date.now() / 1000)
    }
  },
  { toJSON: { virtuals: true } }
);

InputStudentFeesSchema.virtual("batchFeePlan", {
  ref: "batchwisefee",
  localField: "bId",
  foreignField: "bId",
  justOne: true
});

module.exports = InputStudentFees = mongoose.model(
  "inputstudentfees",
  InputStudentFeesSchema
);
