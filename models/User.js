const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;
//create user schema

const userSchema = new Schema({
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  profile: {
    avatar: {
      url: { type: String },
      public_id: { type: String },
    },
    background: {
      url: { type: String },
      public_id: { type: String },
    },
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: { type: Date },
  },
  requestReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  requestSent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "groups" }],
  status: { type: String, default: "active" },
  lastActive: { type: Date, default: Date.now },
});

//match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//create user model
const User = mongoose.model("users", userSchema);

module.exports = User;
