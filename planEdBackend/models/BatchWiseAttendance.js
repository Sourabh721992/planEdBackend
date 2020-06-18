const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchWiseAttendanceSchema = new Schema({
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
  year: {
    type: Number,
    required: true
  },
  month: [
    {
      day: [
        {
          type: Number
        }
      ],
      timings: [
        {
          type: String
        }
      ],
      tIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "user"
        }
      ],
      sIds: [
        [
          {
            sId: {
              type: Schema.Types.ObjectId,
              ref: "user"
            },
            a: {
              type: Number
            },
            _id: false
          }
        ]
      ],
      max: {
        type: Number
      },
      min: {
        type: Number
      },
      avg: {
        type: Number
      },
      count: {
        type: Number
      },
      _id: false
    }
  ],
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = BatchWiseAttendance = mongoose.model(
  "batchwiseattendance",
  BatchWiseAttendanceSchema
);
