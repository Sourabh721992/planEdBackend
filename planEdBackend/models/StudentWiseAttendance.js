const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const StudentWiseAttendanceSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  bIds: [
    {
      bId: {
        type: Schema.Types.ObjectId,
        ref: "batch"
      },
      month: [
        {
          count: {
            type: Number,
            default: 0
          },
          day: [
            {
              type: Number
            }
          ],
          _id: false
        }
      ],
      _id: false
    }
  ],
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = StudentWiseAttendance = mongoose.model(
  "studentwiseattendance",
  StudentWiseAttendanceSchema
);
