const express = require("express");
const {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  getConversationByParticipants,
  getMessageByConversationId,
} = require("../controllers/conversation.controller");
const router = express.Router();

router.get("/get/:conversationId", getConversation);
router.get("/getConversations", getConversations);
router.get("/get/getByParticipants", getConversationByParticipants);
router.get("/get/messages/:conversationId", getMessageByConversationId);


router.post("/newConversation", createConversation);
router.post("/deleted/:conversationId", deleteConversation);

module.exports = router;
