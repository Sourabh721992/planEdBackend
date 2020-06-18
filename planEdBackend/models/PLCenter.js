//The collection will contain the details of earnings and expenditure
//of an institue.
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PLCenterSchema = new Schema({
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
      batchFeeCollected: [
        {
          bId: {
            type: Schema.Types.ObjectId,
            ref: "bId"
          },
          fee: {
            type: Number
          },
          default: {},
          _id: false
        }
      ],
      instiFeeCollected: {
        type: Number,
        required: true,
        default: 0
      },
      monthlyExp: {
        type: Number,
        default: 0
      },
      monthlyErngs: {
        type: Number,
        default: 0
      },
      PL: {
        type: Number,
        default: 0
      },
      expense: [
        {
          info: {
            type: String
          },
          amt: { type: Number },
          nm: { type: String },
          dt: {
            type: Number
          },
          default: {},
          _id: false
        }
      ],
      earnings: [
        {
          info: {
            type: String
          },
          amt: { type: Number },
          nm: { type: String },
          dt: {
            type: Number
          },
          default: {},
          _id: false
        }
      ],
      _id: false
    }
  ]
});

module.exports = PLCenter = mongoose.model("plcenter", PLCenterSchema);
