const Chats = require("../models/Chat");
const Conversation = require("../models/Conversation");

exports.createConversation = async (req, res) => {
  try {
    console.log("req.body: ", req.body);
    const userId = req.user.user_id;
    const { participants, messages } = req.body;
    const updateParticipants = [...participants, userId];
    const conversation = new Conversation({
      participants: updateParticipants,
      messages: messages ? messages : [],
    });
    const savedConversation = await conversation.save();
    // Return the ID of the newly created conversation
    res.status(201).json({ conversationId: savedConversation._id });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res
      .status(500)
      .json({ message: "Failed to create conversation", error: error.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const deleteConversation = await Conversation.findByIdAndDelete(
      conversationId
    );
    if (!deleteConversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res
      .status(500)
      .json({ message: "Failed to delete conversation", error: error.message });
  }
};
exports.deleteMessInConver = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    //Xóa theo _id
    const deleteConversation = await Conversation.findById(conversationId);

    if (!deleteConversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // await Chats.deleteMany({ _id: { $in: deleteConversation.messages } });

    // Trả về phản hồi thành công
    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res
      .status(500)
      .json({ message: "Failed to delete conversation", error: error.message });
  }
};
exports.getConversation = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await Conversation.findById(conversationId).populate(
      "participants"
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error getting conversation:", error);
    res
      .status(500)
      .json({ message: "Failed to get conversation", error: error.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const conversations = await Conversation.find({
      participants: userId,
    }).populate([
      {
        path: "participants",
        select: "phone email profile _id",
      },
      {
        path: "lastMessage",
        select: "senderId receiverId contents timestamp read",
      },
    ]);
    if (!conversations) {
      return res.status(404).json({ message: "Conversations not found" });
    }
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res
      .status(500)
      .json({ message: "Failed to get conversations", error: error.message });
  }
};

// exports.getConversations = async (req, res) => {
//   try {
//     const userId = req.user.user_id;
//     const conversations = await Conversation.find({
//       participants: userId,
//     }).populate([{
//       path: "participants",
//       select: "phone email profile _id",
//     },
//     {
//       path: "lastMessage",
//       select: "senderId receiverId contents timestamp read",
//     }
//   ]);
//     if (!conversations) {
//       return res.status(404).json({ message: "Conversations not found" });
//     }
//     res.status(200).json(conversations);
//   } catch (error) {
//     console.error("Error getting conversations:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to get conversations", error: error.message });
//   }
// };

// get conversation by participants every time a new message is sent
exports.getConversationByParticipants = async () => {
  try {
    const participants = req.body.participants;
    if (!participants) {
      return res.status(400).json({ message: "Participants are required" });
    }

    const conversation = await Conversation.findOne({
      participants: { $all: participants },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    return conversation;
  } catch (error) {
    console.error("Error getting conversation by participants:", error);
    return null;
  }
};

exports.getMessageByConversationId = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await Conversation.findById(conversationId).populate(
      "messages"
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    res
      .status(500)
      .json({ message: "Failed to get messages", error: error.message });
  }
};
