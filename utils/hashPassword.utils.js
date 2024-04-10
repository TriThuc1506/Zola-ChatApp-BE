const bcrypt = require("bcrypt");

const hashPassword = async (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

module.exports = hashPassword;
