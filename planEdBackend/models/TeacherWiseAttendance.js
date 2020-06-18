const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const TeacherWiseAttendanceSchema = new Schema({
  tId: {
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
    ref: "teacher",
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number
  },
  day: {
    type: Number
  },
  timings: {
    type: String,
    required: true
  },
  totalMins: {
    type: Number
  },
  studentsInBatch: {
    type: Number
  }
});

module.exports = TeacherWiseAttendance = mongoose.model(
  "teacherwiseattendance",
  TeacherWiseAttendanceSchema
);
