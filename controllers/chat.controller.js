const cloudinary = require("../configs/Cloudinary.config.js");
const Chats = require("../models/Chat.js");
const Chat = require("../models/Chat.js");
const Conversation = require("../models/Conversation.js");
const Group = require("../models/Group.js");
const { io, getReciverSocketId } = require("../socket/socket.io.js");

exports.sendMessage = async (req, resp) => {
  try {
    const senderId = req.user.user_id;
    const receiverId = req.params.userId;
    const isGroup = JSON.parse(req.body.isGroup || false);
    const replyMessageId = req.body.replyMessageId || null;
    let contents = [];
    if (req.body.data) {
      contents.push({
        type: req.body.data.type,
        data: req.body.data.data,
      });
    }
    if (req.files) {
      for (const file of req.files) {
        contents.push({
          type: file.mimetype.startsWith("image/")
            ? "image"
            : file.mimetype.startsWith("video/")
            ? "video"
            : "file",
          data: file.path,
        });
      }
    }

    if (!contents || !contents.length) {
      throw new Error("Contents are empty or contain no fields");
    }
    const message = new Chat({
      senderId,
      receiverId,
      contents,
      isGroup,
      replyMessageId,
    });

    const saveMessage = (await message.save()).populate({
      path: "replyMessageId",
      model: "chats",
    });
    const retrunMessage = await Promise.all([saveMessage]).then((values) => {
      return values[0];
    });


    const group = await Group.findById(receiverId).populate("conversation");

    let conversation;
    if (!group) {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
        tag: "friend",
      });
    } else {
      conversation = group.conversation;
    }

    if (isGroup) {
      for (const member of group.conversation.participants) {
        if (member.toString() !== senderId) {
          const receiverSocketId = await getReciverSocketId(member._id);
          if (receiverSocketId) {
            io.to(receiverSocketId.socket_id).emit("new_message", {
              message: { retrunMessage, conversationId: conversation._id },
            });
          }
        }
      }
    } else {
      const receiverSocketId = await getReciverSocketId(receiverId);
      const senderSocketId = await getReciverSocketId(senderId);
      if (receiverSocketId && senderSocketId) {
        io.to(receiverSocketId.socket_id).emit("new_message", {
          message: { retrunMessage, conversationId: conversation._id },
        });
        io.to(senderSocketId.socket_id).emit("new_message", {
          message: { retrunMessage, conversationId: conversation._id },
        });
      }
    }
    resp.status(201).json({
      message: "Message sent successfully",
      data: {
        message: retrunMessage,
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    console.log("Error sending message:", error);
    resp
      .status(500)
      .json({ message: "Failed to send message", error: error.message });
  }
};

//Lấy danh sách tin nhắn cá nhân với một người dùng cụ thể
exports.getHistoryMessage = async (req, resp) => {
  try {
    const userId = req.params.userId; //người nhận lấy từ param
    const currentUserId = req.user.user_id; // người dùng hiện đang đăng nhập

    const lastTimestamp = req.query.lastTimestamp; // Lấy tham số lastTimestamp từ query string
    let queryCondition = {
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
    };

    const totalMessageHistory = await Chat.countDocuments(queryCondition);
    let messagesHistory;
    //Lấy 20% tin nhắn khi vượt quá 100 tin nhắn
    if (totalMessageHistory >= 100) {
      if (lastTimestamp) {
        queryCondition.timestamp = { $lt: lastTimestamp }; //new Date(parseInt(lastTimestamp))
      }
      messagesHistory = await Chat.find(queryCondition)
        .sort({
          timestamp: -1,
        })
        .limit(Math.ceil(totalMessageHistory * 0.2));
    } else {
      //Lấy toàn bộ tin nhắn
      messagesHistory = await Chat.find(queryCondition).sort({
        timestamp: -1,
      });
    }

    resp.status(200).json({ success: true, data: messagesHistory });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, massage: "Internal server error" });
  }
};
exports.getHistoryMessageMobile = async (req, resp) => {
  try {
    const userId = req.params.userId; //người nhận lấy từ param
    const currentUserId = req.user.user_id; // người dùng hiện đang đăng nhập

    const lastTimestamp = req.query.lastTimestamp;
    // let queryCondition = {
    //   $or: [
    //     { senderId: currentUserId, receiverId: userId , status: { $in: [0, 2] }},
    //     { senderId: userId, receiverId: currentUserId , status: { $in: [0, 1] }},
    //   ],
    // };
    let queryCondition = {
      $or: [
        {
          $and: [
            { senderId: currentUserId, receiverId: userId },
            { $or: [{ status: 0 }, { status: 2 }] },
          ],
        },
        {
          $and: [
            { senderId: userId, receiverId: currentUserId },
            { $or: [{ status: 0 }, { status: 1 }] },
          ],
        },
      ],
    };

    const totalMessageHistory = await Chat.countDocuments(queryCondition);
    let messagesHistory;
    //Lấy 20% tin nhắn khi vượt quá 100 tin nhắn
    if (totalMessageHistory >= 100) {
      if (lastTimestamp) {
        queryCondition.timestamp = { $lt: lastTimestamp }; //new Date(parseInt(lastTimestamp))
      }
      messagesHistory = await Chat.find(queryCondition)
        .sort({
          timestamp: -1,
        })
        .limit(Math.ceil(totalMessageHistory * 0.2));
    } else {
      //Lấy toàn bộ tin nhắn
      messagesHistory = await Chat.find(queryCondition).sort({
        timestamp: -1,
      });
    }

    resp.status(200).json({ success: true, data: messagesHistory });
  } catch (error) {
    console.error(error);
    resp.status(500).json({ success: false, massage: "Internal server error" });
  }
};

exports.setStatusMessage = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userIdCurrent = req.user.user_id; // người dùng hiện đang đăng nhập

    const chat = await Chats.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Not Found" });
    }

    if (chat.senderId.equals(userIdCurrent)) {
      if (chat.status === 0 || chat.status === null) {
        chat.status = 1;
        await chat.save();
        res.status(200).json({ message: "Update status success" });
      } else {
        try {
          await Chats.findByIdAndDelete(chatId);
          res.status(200).json({ message: "Update status success" });
        } catch (error) {
          console.log("Error delete: ", error);
        }
      }
    } else {
      if (chat.status === 0 || chat.status === null) {
        console.log("Đang đổi status");
        chat.status = 2;
        await chat.save();
        res.status(200).json({ message: "Update status success" });
      } else {
        console.log("Đang xóa");
        try {
          await Chats.findByIdAndDelete(chatId);
          res.status(200).json({ message: "Update status success" });
        } catch (error) {
          console.log("Error delete: ", error);
        }
      }
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request: " });
  }
};

//Lấy tin nhắn đầu tiên
exports.getFirstMessage = async (req, res) => {
  try {
    const userId = req.params.userId; //người nhận lấy từ param
    const currentUserId = req.user.user_id; // người dùng hiện đang đăng nhập

    // Tìm tin nhắn đầu tiên trong chat có chatId

    // Tìm tin nhắn đầu tiên trong cuộc trò chuyện giữa currentUserId và userId
    const firstMessage = await Chat.findOne({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
    }).sort({ timestamp: 1 });

    if (!firstMessage) {
      return res
        .status(404)
        .json({ success: false, message: "No message found in this chat" });
    }

    // Trả về tin nhắn đầu tiên nếu có
    res.status(200).json({ success: true, data: firstMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Hàm trích xuất public_id từ URL của hình ảnh trên Cloudinary
function extractPublicId(url) {
  const segments = url.split("/");
  const publicIdWithExtension = segments.pop(); // Lấy phần cuối cùng của đường dẫn
  const publicId = publicIdWithExtension.split(".")[0]; // Loại bỏ phần mở rộng tệp
  return publicId;
}

exports.deleteChat = async (req, res) => {
  const chatId = req.params.chatId;
  let isDeleted = false;

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Message not found !" });
    }
    if (chat.senderId.toString() !== req.user.user_id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this message" });
    }

    const mediaFiles = chat.contents.filter(
      (content) => content.type === "image" || content.type === "video"
    );
    await Promise.all(
      mediaFiles.map(async (media) => {
        console.log("media data: ", media.data);
        const publicId = extractPublicId(media.data);
        try {
          console.log("publicId: ", publicId);
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.log("Error deleting media in cloudinary:", error);
        }
      })
    );

    const group = await Group.findById(chat.receiverId).populate(
      "conversation"
    );
    let conversation;
    if (group) {
      conversation = group.conversation;
    } else {
      conversation = await Conversation.findOne({
        participants: { $all: [chat.senderId, chat.receiverId] },
        tag: "friend",
      });
    }

    if (conversation) {
      conversation.messages = conversation.messages.filter(
        (message) => message.toString() !== chatId
      );
      const remove = await Chat.findByIdAndDelete(chatId);

      if (conversation.messages.length === 0 && conversation.tag !== "group") {
        const removeConversation = await Conversation.findByIdAndDelete(
          conversation._id
        );
        removeConversation.participants?.forEach(async (member) => {
          if (member.toString()) {
            const receiverSocketId = await getReciverSocketId(member);
            if (receiverSocketId) {
              io.to(receiverSocketId.socket_id).emit("delete_message", {
                chatRemove: remove,
                conversationId: conversation._id,
                isDeleted: true,
              });
            }
          }
        });
      } else {
        conversation.lastMessage =
          conversation.messages[conversation.messages.length - 1];
        await conversation.save();
        conversation.participants?.forEach(async (member) => {
          if (member.toString() !== chat.senderId) {
            const receiverSocketId = await getReciverSocketId(member);
            if (receiverSocketId) {
              io.to(receiverSocketId.socket_id).emit("delete_message", {
                chatRemove: remove,
                conversationId: conversation._id,
                isDeleted,
              });
            }
          }
        });
      }
    }

    res.status(200).json({ message: "Success deleted" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the message" });
  }
};
