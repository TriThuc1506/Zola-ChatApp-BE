const otpGenerator = require("otp-generator");
const { TOTP } = require("totp-generator");
const base32 = require("thirty-two");
require("dotenv").config();

exports.generatorOTP = async () => {
  const otp = await otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialCharacters: false,
  });

  return otp;
};

exports.generatorTOTP = async (email) => {
  const key = base32.encode(email);
  const secret = key.toString("utf8");
  const totp = TOTP.generate(secret, {
    digits: 6,
    period: 180,
  });

  return totp;
};
