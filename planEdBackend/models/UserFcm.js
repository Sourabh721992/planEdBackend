const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UserFcmSchema = new Schema({
  uId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  regIds: [
    {
      imei: { type: String, required: true },
      fcmId: { type: String, required: true },
      platform: { type: String, required: true },
      version: { type: String, required: true },
      versionNo: { type: String, required: true },
      _id: false,
    },
  ],
});

module.exports = UserFcm = mongoose.model("userfcm", UserFcmSchema);
