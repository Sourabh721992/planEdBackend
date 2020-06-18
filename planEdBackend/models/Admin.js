const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const AdminSchema = new Schema({
  aId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  insti: [
    {
      type: Schema.Types.ObjectId,
      ref: "institute"
    }
  ],
  cDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  },
  mDt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000)
  }
});

module.exports = Admin = mongoose.model("admin", AdminSchema);
