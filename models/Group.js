const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  avatar: {
    url: { type: String },
    public_id: { type: String },
  },
  createAt: { type: Date, default: Date.now() },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" }, 
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }, 
  admins : [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
});

const Group = mongoose.model("groups", groupSchema);

module.exports = Group;
