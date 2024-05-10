const jwt = require("jsonwebtoken");
const Conversation = require("../models/Conversation");
const Group = require("../models/Group");
const User = require("../models/User");
const { io, getReciverSocketId } = require("../socket/socket.io");
const cloudinary = require("../configs/Cloudinary.config");
const mongoose = require("mongoose");
const Chats = require("../models/Chat");

exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const uid = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(uid.user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!members || members.length < 2) {
      return res.status(400).json({ error: "Members is required" });
    }
    members.push(uid.user_id);

    const conversation = await Conversation.create({
      participants: members,
      tag: "group",
    });

    const group = await Group.create({
      groupName: name,
      avatar: {
        url: "https://res.cloudinary.com/dq3pxd9eq/image/upload/group_avatar.jpg",
        public_id: "group_avatar",
      },
      conversation: conversation._id,
      createBy: uid.user_id,
      admins: [uid.user_id],
    });

    const initLastMessage = new Chats({
      senderId: uid.user_id,
      receiverId: group._id,
      type: "text",
      contents: [{ data: `Welcome to ${name} group`, type: "text" }],
      isGroup: true,
    });

    await initLastMessage.save();

    conversation.lastMessage = initLastMessage._id;
    await conversation.save();

    const returnGroup = await Group.findById(group._id).populate([
      { path: "conversation" },
      { path: "createBy", select: "profile.name" },
    ]);

    members.forEach(async (member) => {
      const memderSocketId = await getReciverSocketId(member);
      if (memderSocketId) {
        io.to(memderSocketId.socket_id).emit("add-to-group", {
          data: {
            group: returnGroup,
            addMembers: members,
          },
        });
      }
    });

    return res.status(201).json({ group: returnGroup });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate([
      {
        path: "conversation",
        populate: {
          path: "participants",
        },
      },
      { path: "createBy", select: "profile.name" },
    ]);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    return res.status(200).json(group);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getGroupByParticipants = async (req, res) => {
  try {
    const { participants } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!participants || participants.length < 1) {
      return res.status(400).json({ error: "Participants are required" });
    }
    
    participants.push(user.user_id);
    const groups = await Group.aggregate([
      {
        $lookup: {
          from: "conversations",
          localField: "conversation",
          foreignField: "_id",
          as: "conversation",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createBy",
          foreignField: "_id",
          as: "createBy",
        },
      },
      {
        $unwind: "$conversation",
      },
      {
        $match: {
          "conversation.participants": {
            $all: participants.map((p) => new mongoose.Types.ObjectId(p)),
          },
        },
      },
      {
        $project: {
          groupName: 1,
          avatar: 1,
          createBy: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$createBy",
                  as: "creator",
                  in: {
                    profile: "$$creator.profile",
                    _id: "$$creator._id",
                  },
                },
              },
              0,
            ],
          },
          conversation: {
            _id: 1,
            participants: 1,
            lastMessage: 1,
            tag: 1,
          },
          admins: 1,
        },
      },
    ]);

    return res.status(200).json(groups);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getAllGroup = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);

    const groups = await Group.aggregate([
      {
        $lookup: {
          from: "conversations",
          localField: "conversation",
          foreignField: "_id",
          as: "conversation",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createBy",
          foreignField: "_id",
          as: "createBy",
        },
      },
      {
        $unwind: "$conversation",
      },
      {
        $lookup: {
          from: "chats",
          localField: "conversation.lastMessage",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      {
        $unwind: "$lastMessage",
      },
      {
        $match: {
          "conversation.participants": {
            $in: [new mongoose.Types.ObjectId(user.user_id)],
          },
        },
      },

      {
        $project: {
          groupName: 1,
          avatar: 1,
          createBy: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$createBy",
                  as: "creator",
                  in: {
                    profile: "$$creator.profile",
                    _id: "$$creator._id",
                  },
                },
              },
              0,
            ],
          },
          conversation: {
            _id: 1,
            participants: 1,
            lastMessage: 1,
            tag: 1,
          },
          lastMessage: 1,
          admins: 1,
        },
      },
    ]);

    return res.status(200).json(groups);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (name) {
      group.groupName = name;
    }
    if (req.file) {
      if (group.avatar.public_id) {
        await cloudinary.uploader.destroy(group.avatar.public_id);
      }
      const result = await cloudinary.uploader.upload(req.file.path);
      group.avatar.url = result.secure_url;
      group.avatar.public_id = result.public_id;
    }
    const change = (await group.save()).populate("conversation");
    const newGroup = await Promise.all([change]);
    
    newGroup[0].conversation.participants.forEach(async (member) => {
      const memderSocketId = await getReciverSocketId(member);
      if (memderSocketId) {
        io.to(memderSocketId.socket_id).emit("update-group", {
          group: {
            id: group._id,
            name: group.groupName,
            avatar: group.avatar.url,
          },
        });
      }
    });

    return res.status(200).json(group);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const token = req.headers.authorization.split(" ")[1];
    const uid = jwt.verify(token, process.env.JWT_SECRET);

    const group = await Group.findById(groupId).populate("conversation");
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (group.createBy.toString() !== uid.user_id) {
      return res.status(403).json({ error: "You are not authorized" });
    }

    await group.deleteOne();
    group.conversation.participants.forEach(async (member) => {
      const memderSocketId = await getReciverSocketId(member);
      if (memderSocketId) {
        io.to(memderSocketId.socket_id).emit("delete-group", {
          group: {
            id: group._id,
            name: group.groupName,
          },
        });
      }
    });
    await Conversation.findByIdAndDelete(group.conversation);

    return res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const group = await Group.findById(groupId).populate([
      { path: "conversation", populate: { path: "lastMessage" } },
      { path: "createBy", select: "profile _id" },
    ]);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (!members || members.length < 1) {
      return res.status(400).json({ error: "Members is required" });
    }

    const newMembers = [];
    const existMembers = [];
    members.forEach(async (member) => {
      if (group.conversation.participants.includes(member)) {
        existMembers.push(member);
      } else {
        newMembers.push(member);
        group.conversation.participants.push(member);
      }
    });

    const message = [];
    if (existMembers.length > 0) {
      const memberInfoPromises = existMembers.map(async (member) => {
        const memberInfo = await User.findById(member).select(
          "profile.name -_id"
        );
        return memberInfo.profile.name;
      });

      const memberNames = await Promise.all(memberInfoPromises);

      memberNames.forEach((name) => {
        message.push(`Member ${name} already in group. `);
      });
    }

    if (newMembers.length > 0) {
      const memberInfoPromises = newMembers.map(async (member) => {
        const memberInfo = await User.findById(member).select(
          "profile.name -_id"
        );
        return memberInfo.profile.name;
      });
      const memberNames = await Promise.all(memberInfoPromises);

      memberNames.forEach((name) => {
        message.push(`Member ${name} added to group. `);
      });
    }

    group.conversation.participants.forEach(async (member) => {
      const memderSocketId = await getReciverSocketId(member);
      if (memderSocketId) {
        io.to(memderSocketId.socket_id).emit("add-to-group", {
          data: {
            group: group,
            addMembers: newMembers,
          },
        });
      }
    });

    await group.conversation.save();

    return res.status(200).json({ message, group });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const uid = jwt.verify(token, process.env.JWT_SECRET);

    const group = await Group.findById(groupId).populate("conversation");
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (
      group.createBy.toString() !== uid.user_id &&
      !group.admins.includes(uid.user_id)
    ) {
      return res.status(403).json({ error: "You are not authorized" });
    }
    if (!members || members.length < 1) {
      return res.status(400).json({ error: "Members is required" });
    }

    const grMembers = group.conversation.participants;

    members.map(async (member) => {
      if (group.createBy.toString() === member) {
        return res.status(403).json({
          error: "You can't remove creator from group",
        });
      }
      if (group.conversation.participants.includes(member)) {
        if (group.admins.includes(member)) {
          group.admins = group.admins.filter((a) => a.toString() !== member);
        }
        return (group.conversation.participants =
          group.conversation.participants.filter(
            (p) => p.toString() !== member
          ));
      }
    });
    if (group.conversation.participants.length <= 2) {
      return res.status(400).json({
        error: "Group must have at least 2 members",
      });
    }
    await group.conversation.save();
    await group.save();

    grMembers.forEach(async (member) => {
      const memderSocketId = await getReciverSocketId(member);
      if (memderSocketId && members !== uid.user_id) {
        io.to(memderSocketId.socket_id).emit("remove-from-group", {
          group: {
            id: group._id,
            name: group.groupName,
            removeMembers: members,
          },
        });
      }
    });

    return res.status(200).json(group);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const token = req.headers.authorization.split(" ")[1];
    const uid = jwt.verify(token, process.env.JWT_SECRET);

    const group =
      (await Group.findById(groupId).populate("conversation")) || {};
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    const members = group.conversation.participants;

    group.conversation.participants = group.conversation.participants.filter(
      (p) => p.toString() !== uid.user_id
    );
    if (group.createBy.toString() === uid.user_id) {
      return res.status(403).json({
        error: "Creator can't leave group",
      });
    }
    if (group.admins.includes(uid.user_id)) {
      group.admins = group.admins.filter((a) => a.toString() !== uid.user_id);
    }

    if (group.conversation.participants.length <= 2) {
      return res.status(400).json({
        error: "Group must have at least 2 members",
      });
    }

    await group.conversation.save();
    members.forEach(async (member) => {
      const memderSocketId = await getReciverSocketId(member);
      if (memderSocketId) {
        io.to(memderSocketId.socket_id).emit("leave-group", {
          group: {
            id: group._id,
            name: group.groupName,
            leaveMember: uid.user_id,
          },
        });
      }
    });
    return res.status(200).json(group);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.changeAdmins = async (req, res) => {
  try {
    const { members, typeChange, groupId } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const uid = jwt.verify(token, process.env.JWT_SECRET);
    const group = await Group.findById(groupId).populate([
      {
        path: "conversation",
        select: "-messages -createdAt -__v",
        populate: {
          path: "participants",
          select: "profile _id",
        },
      },
      {
        path: "createBy",
        select: "profile _id",
      },
    ]);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (group.createBy._id.toString() !== uid.user_id) {
      return res.status(403).json({ error: "You are not authorized" });
    }
    if (!members || members.length === 0) {
      return res.status(400).json({ error: "Members is required" });
    }
    const result = [];
    if (typeChange === "add") {
      members.forEach(async (member) => {
        const memberExist = group.conversation.participants.some(
          (p) => p._id.toString() === member
        );
        if (!memberExist) {
          result.push({
            type: "error",
            message: "Member not in group",
            member,
          });
          return;
        }
        if (
          group.admins.includes(member) ||
          group.createBy.toString() === member
        ) {
          result.push({
            type: "error",
            message: "Member is admin",
            member,
          });
          return;
        }
        group.admins.push(member);
        result.push({
          type: "success",
          message: "Member added to admin",
          member,
        });
      });
    } else if (typeChange === "remove") {
      members.forEach(async (member) => {
        const memberExist = group.conversation.participants.some(
          (p) => p._id.toString() === member
        );
        if (!memberExist) {
          result.push({
            type: "error",
            message: "Member not in group",
            member,
          });
          return;
        }
        if (!group.admins.includes(member)) {
          result.push({
            type: "error",
            message: "Member is not admin",
            member,
          });
          return;
        }
        group.admins = group.admins.filter((a) => a.toString() !== member);
        result.push({
          type: "success",
          message: "Member removed from admin",
          member,
        });
      });
    } else {
      return res.status(400).json({
        error: "Invalid typeChange",
      });
    }
    await group.save();
    group.conversation.participants.forEach(async (member) => {
      if (member.toString() !== uid.user_id) {
        const memderSocketId = await getReciverSocketId(member);
        if (memderSocketId) {
          io.to(memderSocketId.socket_id).emit("change-admins", {
            group: {
              id: group._id,
              name: group.groupName,
              admins: group.admins,
            },
            members,
            typeChange,
          });
        }
      }
    });

    return res.status(200).json({ group, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

exports.makeMemberToAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    if (!userId || !groupId) {
      return res.status(400).json({ error: "Missing paramaster !" });
    }

    const token = req.headers.authorization.split(" ")[1];
    const uid = jwt.verify(token, process.env.JWT_SECRET);
    const group = await Group.findById(groupId).populate([
      {
        path: "conversation",
        select: "-messages -createdAt -__v",
        populate: {
          path: "participants",
          select: "profile _id",
        },
      },
      {
        path: "createBy",
        select: "profile _id",
      },
    ]);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.createBy._id.toString() !== uid.user_id) {
      return res.status(403).json({ error: "You don't have permisiion !" });
    }

    if (
      !group.conversation.participants.some((p) => p._id.toString() === userId)
    ) {
      return res.status(404).json({ error: "User not in group" });
    }

    if (!group.admins.includes(userId)) {
      group.admins.push(userId);
    }
    const user = await User.findById(userId);
    group.createBy = user;
    group.admins = group.admins.filter((a) => a.toString() !== uid.user_id);
    await group.save();
    group.conversation.participants.forEach(async (member) => {
      if (member.toString() !== uid.user_id) {
        const memderSocketId = await getReciverSocketId(member);
        if (memderSocketId) {
          io.to(memderSocketId.socket_id).emit("member-to-admin", {
            group: {
              id: group._id,
              name: group.groupName,
              admins: group.admins,
              createBy: group.createBy,
            },
          });
        }
      }
    });

    return res.status(200).json({
      group: {
        _id: group._id,
        groupName: group.groupName,
        admins: group.admins,
        createBy: {
          profile: user.profile,
          _id: user._id,
        },
        conversation: group.conversation,
        avatar: group.avatar,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};