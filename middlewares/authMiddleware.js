// authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");

exports.protect = async (req, res, next) => {
  let token;
  const app_type = req.headers["user-agent"].includes("Mobile")
    ? "mobile"
    : "web";

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
          return res
            .status(401)
            .json({ message: "Not authorized, token failed or expired" });
        }
        if (user.type === "refresh") {
          return res
            .status(401)
            .json({ message: "Not authorized, token is not valid !" });
        }
        const isLogin = await Session.findOne({
          user_id: user.user_id,
          device_id: user.device_id,
          app_type,
          is_logged_in: true,
        });

        if (!isLogin) {
          return res.status(401).json({ message: "Not authorized" });
        }
        // Thêm thông tin người dùng vào req.user
        req.user = user;
        next();
      });
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Not authorized, token failed or expired" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

exports.isRootUser = async (req, res, next) => {
  let token;
  const user = await User.findOne({ phone: req.params?.phone });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.JWT_SECRET, async (err, thisUser) => {
        if (err) {
          return res
            .status(401)
            .json({ message: "Not authorized, token failed" });
        }
        if (thisUser.phone === user.phone) {
          next();
        } else {
          return res.status(403).json({ message: "You can't get this user !" });
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
};
