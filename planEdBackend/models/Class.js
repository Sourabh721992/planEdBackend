const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const ClassSchema = new Schema({
  nm: {
    type: String,
    required: true
  }
});

module.exports = Class = mongoose.model("class", ClassSchema);
