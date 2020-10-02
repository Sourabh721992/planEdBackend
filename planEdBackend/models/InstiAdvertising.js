const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InstiAdvertisingSchema = new Schema({
  insNm: {
    type: String,
  },
  insAddress: {
    type: String,
  },
  teacherNm: {
    type: String,
  },
  subject: {
    type: String,
  },
  tagline: {
    type: String,
  },
  mobile: {
    type: String,
  },
  email: {
    type: String,
  },
  image: {
    type: String,
  },
});

module.exports = InstiAdvertising = mongoose.model(
  "instiadvertising",
  InstiAdvertisingSchema
);
