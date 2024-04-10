const express = require("express");

const router = express.Router();
const {
  uploadAvatar,
  uploadBackground,
  updateUser,
  getUserByPhoneOrId,
  checkUserByEmail,
  sendRequestAddFriend,
  acceptRequestAddFriend,
  unfriend,
  getFriends,
  getRandomUsersNotFriend,
  rejectRequestAddFriend,
  cancelRequestAddFriend,
  getMe,
} = require("../controllers/user.controller");
const { protect } = require("../middlewares/authMiddleware");
const { multerUploadImage } = require("../middlewares/multerMiddleware");

//get methods
router.get("/get/phone/:phone", protect, getUserByPhoneOrId);
router.get("/get/uid/:uid", protect, getUserByPhoneOrId);
router.get("/get/me", protect, getMe);
router.get("/get/friends", protect, getFriends);
router.get("/get/random-not-friends", protect, getRandomUsersNotFriend);

//post methods
router.post("/check-email", checkUserByEmail);
router.post("/update-profile", protect, updateUser);
router.post("/send-add-friend", protect, sendRequestAddFriend);
router.post("/accept-add-friend", protect, acceptRequestAddFriend);
router.post("/unfriend", protect, unfriend);
router.post("/reject-request-add-friend", protect, rejectRequestAddFriend);
router.post("/cancel-request-add-friend", protect, cancelRequestAddFriend);

router.post(
  "/upload-avatar",
  protect,
  multerUploadImage.single("avatar"),
  uploadAvatar
);
router.post(
  "/upload-background",
  protect,
  multerUploadImage.single("background"),
  uploadBackground
);

module.exports = router;