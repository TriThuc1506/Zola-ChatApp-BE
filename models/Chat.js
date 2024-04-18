const mongoose = require("mongoose");
const Group = require("../models/Group");
const Conversation = require("../models/Conversation");

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
  replyMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default: null,
  },
});

chatSchema.post("save", async function (chat, next) {
  try {
    if (!chat.isGroup) {
      const conversation = await Conversation.findOne({
        participants: { $all: [chat.senderId, chat.receiverId] },
        tag: "friend",
      });

      if (!conversation) {
        const newConversation = new Conversation({
          participants: [chat.senderId, chat.receiverId],
          messages: [chat._id],
          lastMessage: chat._id,
        });

        await newConversation.save();
      } else {
        conversation.messages.push(chat._id);
        conversation.lastMessage = chat._id;
        await conversation.save();
      }
    } else {
      const group = await Group.findById(chat.receiverId);

      const groupConversation = await Conversation.findById(group?.conversation);
      if (groupConversation) {
        groupConversation.messages.push(chat._id);
        groupConversation.lastMessage = chat._id;
        group.lastMessage = chat._id;
        await groupConversation.save();
        await group.save();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Chats = mongoose.model("chats", chatSchema);

module.exports = Chats;
