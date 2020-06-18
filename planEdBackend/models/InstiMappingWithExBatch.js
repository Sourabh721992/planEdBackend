//The collection will only contains the details of old batches mapped with institute that has been removed by admin.
//Used to just maintain the records

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InstiMappingWithExBatchSchema = new Schema({
  bId: {
    type: Schema.Types.ObjectId
  },
  nm: {
    type: String
  },
  sub: [
    {
      type: String
    }
  ],
  insti: {
    type: Schema.Types.ObjectId,
    ref: "institute"
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "user"
  },
  student: [
    {
      type: Schema.Types.ObjectId,
      ref: "user"
    }
  ],
  timings: {
    type: [String]
  },
  batchCreationDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  },
  batchDeletedDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = InstiMappingWithExBatch = mongoose.model(
  "instimappingwithexbatch",
  InstiMappingWithExBatchSchema
);
