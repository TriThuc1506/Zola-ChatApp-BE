const router = require("express").Router();
const {
  loginUser,
  refreshToken,
  registerUser,
  logoutUser,
  sendTOTPToEmail,
  resetPassword,
  changePassword,
} = require("../controllers/auth.controller");

router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/refreshToken", refreshToken);
router.post("/register", registerUser);
router.post("/send-otp", sendTOTPToEmail);
router.post("/reset-password", resetPassword);
router.post("/change-password", changePassword);

module.exports = router;