const mongoose = require("mongoose");
const MomentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  media: String,
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  timestamp: { type: Date, default: Date.now },
  // Thêm các trường khác tùy theo yêu cầu
});

const Moment = mongoose.model("Moment", MomentSchema);
