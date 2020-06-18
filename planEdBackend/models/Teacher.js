const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const TeacherSchema = new Schema({
  tId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  insti: [
    {
      insId: {
        type: Schema.Types.ObjectId,
        ref: "institute"
      },
      bIds: [
        {
          bId: {
            type: Schema.Types.ObjectId,
            ref: "batch"
          },
          joinBatchDt: {
            type: Number
          },
          _id: false
        }
      ],
      joinDt: {
        type: Number
      },
      sub: {
        type: String
      },
      _id: false
    }
  ],
  cDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  },
  mDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = Teacher = mongoose.model("teacher", TeacherSchema);
