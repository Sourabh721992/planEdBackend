const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const StudentSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  pId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    // required: true
  },
  sch: {
    type: String,
  },
  clsId: {
    type: Schema.Types.ObjectId,
    ref: "class",
  },
  insti: [
    {
      insId: {
        type: Schema.Types.ObjectId,
        ref: "institute",
      },
      bIds: [
        {
          bId: {
            type: Schema.Types.ObjectId,
            ref: "batch",
          },
          confirmed: {
            type: Number,
            default: 0, //0-- Means waiting for confirmation, 1-- confirmed, -1 -- deleted
          },
          joinBatchDt: {
            type: Number,
          },
          _id: false,
        },
      ],
      joinDt: {
        type: Number,
      },
      _id: false,
    },
  ],
  cDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000),
  },
  mDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000),
  },
});

module.exports = Student = mongoose.model("student", StudentSchema);
