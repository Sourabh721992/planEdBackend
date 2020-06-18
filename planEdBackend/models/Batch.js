const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchSchema = new Schema(
  {
    nm: {
      type: String,
      required: true,
    },
    sub: [
      {
        type: String,
        required: true,
      },
    ],
    insti: {
      type: Schema.Types.ObjectId,
      ref: "institute",
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    student: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    timings: {
      type: [String],
    },
    cDt: {
      type: Number,
      default: Math.trunc(Date.now() / 1000),
    },
    mDt: {
      type: Number,
      default: Math.trunc(Date.now() / 1000),
    },
    //Just added in case of updated timings by teacher in reschedule batch, it will only store the updated timing.
    updatedTimings: {
      type: String,
    },
    updatedDt: {
      type: Number,
    },
    extraCls: {
      type: Boolean,
    },
  },
  { toJSON: { virtuals: true } }
);

BatchSchema.virtual("fees", {
  ref: "batchwisefee",
  localField: "_id",
  foreignField: "bId",
  justOne: true,
});

// BatchSchema.virtual("students", {
//   ref: "user",
//   localField: "student",
//   foreignField: "_id"
// });

module.exports = Batch = mongoose.model("batch", BatchSchema);
