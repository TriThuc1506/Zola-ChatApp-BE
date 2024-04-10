const jwt = require("jsonwebtoken");

exports.generateAccessToken = (device_id, user_id, phone) => {
  return jwt.sign(
    { device_id, user_id, phone, type: "access" },
    process.env.JWT_SECRET,
    {
      expiresIn: "600s",
    }
  );
};
exports.generateRefreshToken = (device_id, user_id, phone) => {
  return jwt.sign(
    { device_id, user_id, phone, type: "refresh" },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};
exports.generateTOTPToken = (email) => {
  return jwt.sign({ email, type: "totp" }, process.env.JWT_SECRET, {
    expiresIn: "180s",
  });
};

exports.getUserIdFromToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.user_id;
};
