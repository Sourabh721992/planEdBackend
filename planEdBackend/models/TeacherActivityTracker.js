const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const TeacherActivityTrackerSchema = new Schema({
  tId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  dt: {
    type: Number,
  },
  activity: {
    bIds: [
      {
        bId: {
          type: Schema.Types.ObjectId,
          ref: "batch",
        },
        topic: {
          type: String,
        },
        subtopic: {
          type: String,
        },
        description: {
          type: String,
        },
        online: {
          type: Boolean,
          default: false,
        },
        _id: false,
      },
    ],
    _id: false,
  },
});

module.exports = TeacherActivityTracker = mongoose.model(
  "teacheractivitytracker",
  TeacherActivityTrackerSchema
);
