const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const StudentWiseTestSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  insId: {
    type: Schema.Types.ObjectId,
    ref: "institute",
    required: true
  },
  bIds: [
    {
      bId: {
        type: Schema.Types.ObjectId,
        ref: "batch"
      },
      tests: [
        {
          testId: {
            type: Schema.Types.ObjectId,
            ref: "batchwisetest"
          },
          tNm: {
            type: String
          },
          tDt: {
            type: Number
          },
          tMarks: {
            type: Number
          },
          sMarks: {
            type: Number
          },
          attendance: {
            type: Number
          },
          _id: false
        }
      ],
      _id: false
    }
  ]
});

module.exports = StudentWiseTest = mongoose.model(
  "studentwisetest",
  StudentWiseTestSchema
);
