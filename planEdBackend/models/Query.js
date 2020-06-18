const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const QuerySchema = new Schema({
  nm: {
    type: String,
    required: true,
  },
  cNo: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  query: {
    type: String,
  },
  status: {
    type: Number,
  },
  assignedTo: {
    type: String,
  },
  dt: {
    type: Number,
    default: Math.trunc(Date.now() / 1000),
  },
});

module.exports = Query = mongoose.model("query", QuerySchema);
