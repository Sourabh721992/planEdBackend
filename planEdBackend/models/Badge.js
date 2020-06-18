const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BadgeSchema = new Schema({
  sId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  pId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  bIds: [
    {
      bId: {
        type: Schema.Types.Id,
        ref: "batch"
      },
      badge: {
        type: Map,
        of: String
      },
      _id: false
    }
  ],
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = Badge = mongoose.model("badge", BadgeSchema);
