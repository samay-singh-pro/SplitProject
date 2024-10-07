import Group from "../models/Group.js";
import mongoose from "mongoose";

export const createGroup = async (req, res) => {
  const { name, description, category, members } = req.body;
  const image = req?.file?.path;
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const membersWithIds = members.map((member) => ({
      _id: new mongoose.Types.ObjectId(),
      name: member,
    }));

    const newGroup = new Group({
      name,
      description,
      category,
      image,
      members: membersWithIds,
      createdBy: req.user._id,
    });

    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const groups = await Group.find({ createdBy: req.user._id });
    res.status(200).json({ groups });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
