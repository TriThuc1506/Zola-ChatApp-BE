const express = require("express");
const router = express.Router();

const {
  createGroup,
  getGroup,
  getAllGroup,
  updateGroup,
  addMember,
  removeMember,
  deleteGroup,
  leaveGroup,
  changeAdmins,
} = require("../controllers/group.controller");
const { multerUploadImage } = require("../middlewares/multerMiddleware");
const { protect } = require("../middlewares/authMiddleware");

router.get("/get/:groupId", protect, getGroup);
router.get("/all", protect, getAllGroup);

router.post(
  "/create",
  protect,
  multerUploadImage.single("avatar"),
  createGroup
);
router.post("/addMembers/:groupId", protect, addMember);
router.post("/removeMembers/:groupId", protect, removeMember);
router.post("/leave/:groupId", protect, leaveGroup);
router.post("/changeAdmins", protect, changeAdmins);

router.put(
  "/update/:groupId",
  protect,
  multerUploadImage.single("avatar"),
  updateGroup
);
router.delete("/delete/:groupId", protect, deleteGroup);

module.exports = router;
