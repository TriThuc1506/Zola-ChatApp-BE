const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Session = require("../models/Session");
const {
  generateAccessToken,
  generateRefreshToken,
  getUserIdFromToken,
} = require("../utils/generateToken.utils");
const { io, getReciverSocketId } = require("../socket/socket.io");
const { generatorTOTP } = require("../utils/generateOTP.utils");
const sendMail = require("../utils/mailer.utils");

const mail_templete = require("../public/resources/html-templete");
const hashPassword = require("../utils/hashPassword.utils");

const createOrUpdateSession = async (
  user_id,
  device_id,
  app_type,
  refreshToken
) => {
  let existsSession = await Session.findOne({
    user_id,
    app_type,
    is_logged_in: true,
  });
  if (existsSession) {
    existsSession.is_logged_in = false;
    existsSession.save();
    const reciverSocketId = await getReciverSocketId(user_id);
    if (reciverSocketId) {
      io.to(reciverSocketId.socket_id).emit("force_logout");
    }
  }
  let session = await Session.findOneAndUpdate(
    { user_id, device_id, app_type },
    { user_id, device_id, app_type, refreshToken, is_logged_in: true },
    { upsert: true, new: true }
  );
  return session;
};

exports.loginUser = async (req, res) => {
  const { phone, password } = req.body;
  let device_id = req.body.device_id;
  const app_type = device_id ? "mobile" : "web";
  if (!device_id) {
    device_id = req.connection.remoteAddress;
  }
  let user;

  try {
    if (phone.includes("@")) {
      user = await User.findOne({ email: phone });
    } else {
      user = await User.findOne({ phone });
    }
    if (user && (await user.matchPassword(password))) {
      const token = generateAccessToken(device_id, user._id, phone);
      const refreshToken = generateRefreshToken(device_id, user._id, phone);

      await createOrUpdateSession(user._id, device_id, app_type, refreshToken);
      const {
        password,
        _id,
        friends,
        groups,
        createdAt,
        status,
        lastActive,
        ...userWithoutPassword
      } = user.toObject();
      res.status(200).json({
        user: userWithoutPassword,
        accessToken: token,
        refreshToken,
      });
    } else {
      res.status(401).json({ message: "Invalid phone or password" });
    }
  } catch (error) {
    console.log("error: ", error);
    res.status(400).json({ message: error.message });
  }
};

exports.logoutUser = async (req, res) => {
  const reToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!reToken) return res.status(403).json("You're not authenticated !");
  const storeRefreshToken = await Session.findOne({ refreshToken: reToken });
  if (storeRefreshToken) {
    jwt.verify(reToken, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json("Refresh Token is not valid !");
      storeRefreshToken.is_logged_in = false;
      storeRefreshToken.refreshToken = "";
      storeRefreshToken.save();
      res.clearCookie("refreshToken");
      return res.status(200).json("Logout successfully");
    });
  } else return res.status(403).json("You're not authenticated !");
};

exports.registerUser = async (req, res) => {
  const { name, password, phone, email, gender, dob } = req.body;
  if (await User.findOne({ phone })) {
    return res.status(409).json({ message: "Phone number already exists" });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const formatDOB = dob && typeof dob === "string" ? new Date(dob) : dob;
  try {
    const user = await User.create({
      phone,
      email,
      password: await hashPassword(password),
      profile: { name, gender, dob: formatDOB },
      createdAt: Date.now(),
    });
    return res.status(201).json({
      user: {
        phone: user.phone,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

exports.sendTOTPToEmail = async (req, res) => {
  const { email } = req.body;
  const totp = await generatorTOTP(email);
  const subject = "OTP Verification";
  const html = mail_templete.replace("{OTP_Value}", totp.otp);
  try {
    await sendMail(email, subject, html);

    res.status(200).json({ totp });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    user.password = await hashPassword(newPassword);
    await user.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Can't reset password now, please try again !" });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  const userId = getUserIdFromToken(token);

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (await user.matchPassword(oldPassword)) {
      user.password = await hashPassword(newPassword);
      await user.save();
      res.status(200).json({ message: "Password changed successfully" });
    } else {
      res.status(403).json({ message: "Invalid old password" });
    }
  } catch (error) {
    res
      .status(400)
      .json({ message: "Can't change password now, please try again !" });
  }
};

exports.refreshToken = async (req, res) => {
  const reToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!reToken) return res.status(403).json("You're not authenticated !");
  const storeRefreshToken = await Session.findOne({ refreshToken: reToken });
  if (!storeRefreshToken)
    return res.status(403).json("Refresh Token is not valid !");
  jwt.verify(reToken, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json("Refresh Token is not valid 2!");
    const newAccessToken = generateAccessToken(
      user.device_id,
      user.user_id,
      user.phone
    );
    return res.status(200).json({
      newAccessToken,
    });
  });
};