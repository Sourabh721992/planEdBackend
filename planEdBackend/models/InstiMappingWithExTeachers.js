//The collection will only contains the details of teacher mapped with institute that has left the institute.
//Used to just maintain the records

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InstiMappingWithExTeachersSchema = new Schema(
  {
    tId: {
      type: Schema.Types.ObjectId,
      ref: "user"
    },
    insId: {
      type: Schema.Types.ObjectId,
      ref: "institute"
    },
    bId: {
      type: Schema.Types.ObjectId,
      ref: "batch",
      required: false
    },
    exBId: {
      type: Schema.Types.ObjectId,
      required: false
    },
    batchJoiningDt: {
      type: Number,
      default: -1
    },
    batchLeavingDt: {
      type: Number,
      default: -1
    },
    instiJoiningDt: {
      type: Number,
      default: -1
    },
    instiLeavingDt: {
      type: Number,
      default: -1
    }
  },
  { toJSON: { virtuals: true } }
);

InstiMappingWithExTeachersSchema.virtual("exBIds", {
  ref: "instimappingwithexbatch",
  localField: "exBId",
  foreignField: "bId",
  justOne: true
});

module.exports = InstiMappingWithExTeachers = mongoose.model(
  "instimappingwithexteachers",
  InstiMappingWithExTeachersSchema
);
