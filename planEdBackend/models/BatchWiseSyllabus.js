const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BatchWiseSyllabusSchema = new Schema({
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
  chapters: [
    {
      nm: {
        type: String
      },
      topic: [
        {
          nm: {
            type: String
          },
          description: {
            type: String
          },
          dt: {
            type: Number
          },
          _id: false
        }
      ],
      done: {
        type: Boolean,
        default: false
      },
      _id: false
    }
  ]
});

module.exports = BatchWiseSyllabus = mongoose.model(
  "batchwisesyllabus",
  BatchWiseSyllabusSchema
);
