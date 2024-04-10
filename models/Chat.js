const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: "users",
    required: true,
  },
  contents: [
    {
      type: {
        type: String,
        enum: ["text", "image", "video", "link", "file", "audio"],
        required: true,
      },
      data: { type: String },
    },
  ],
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  status: { type: Number, default: 0 },
  isGroup: {
    type: Boolean,
    default: false,
  },
});

chatSchema.post("save", async function (chat, next) {
  try {
    const Conversation = mongoose.model("Conversation");

    const conversation = await Conversation.findOne({
      participants: { $all: [chat.senderId, chat.receiverId] },
    });
    const date = Date.now().toString();
    // const senderId = chat.senderId.toString();
    // const receiverId = chat.receiverId.toString();
    // console.log("chat.senderId: ",senderId);
    // console.log("chat.receiverId: ",receiverId);
    // console.log("date: ",date);
    // console.log("conversation: ", conversation);
    if (!conversation) {
      const newConversation = new Conversation({
        participants: [chat.senderId, chat.receiverId],
        messages: [chat._id],
        lastMessage: chat._id,
      });
      await newConversation.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Chats = mongoose.model("chats", chatSchema);

module.exports = Chats;
