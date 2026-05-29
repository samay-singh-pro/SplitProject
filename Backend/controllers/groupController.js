import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import mongoose from "mongoose";
import cloudinaryModule from "cloudinary";

const cloudinary = cloudinaryModule.v2;

// ---------- Shared helpers ----------

const toCents = (n) => Math.round(Number(n || 0) * 100);

// Compute one member's net balance in cents from the full expense
// history. Mirrors the equal/unequal/percentage logic the stats
// controller uses so the check stays consistent.
const computeMemberBalanceCents = async (groupId, memberId) => {
  const targetId = memberId.toString();
  const expenses = await Expense.find({ groupId });

  let paidCents = 0;
  let shareCents = 0;
  let touched = false;

  for (const e of expenses) {
    const spender = e.spenderId?.toString?.();
    if (spender === targetId) {
      paidCents += toCents(e.amount);
      touched = true;
    }

    const totalCents = toCents(e.amount);
    const n = e.splitDetails.length;
    if (n === 0) continue;

    const indexInSplit = e.splitDetails.findIndex(
      (s) => s.member?.toString?.() === targetId
    );
    if (indexInSplit === -1) continue;

    touched = true;
    let share = 0;
    if (e.settlementExpense) {
      share = totalCents;
    } else if (e.splitType === "equally") {
      const floor = Math.floor(totalCents / n);
      const remainder = totalCents - floor * n;
      share = floor + (indexInSplit < remainder ? 1 : 0);
    } else if (e.splitType === "unequally") {
      share = toCents(e.splitDetails[indexInSplit].amount);
    } else if (e.splitType === "percentage") {
      const pct = Number(e.splitDetails[indexInSplit].percentage || 0);
      share = Math.round((totalCents * pct) / 100);
      // For percentage, the last splitter absorbs any rounding remainder.
      if (indexInSplit === n - 1) {
        const others = e.splitDetails.reduce((sum, sd, i) => {
          if (i === n - 1) return sum;
          return sum + Math.round((totalCents * Number(sd.percentage || 0)) / 100);
        }, 0);
        share = totalCents - others;
      }
    }
    shareCents += share;
  }

  return {
    paidCents,
    shareCents,
    netCents: paidCents - shareCents,
    hasHistory: touched,
  };
};

const ownsGroup = (group, user) =>
  group.createdBy.toString() === user._id.toString();

export const createGroup = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const name = (req.body.name || "").trim();
    const description = (req.body.description || "").trim();
    const category = (req.body.category || "").trim();

    // Multipart form-data sends a single-value array key as a string,
    // so normalize members to always be an array.
    let members = req.body.members;
    if (!members) members = [];
    else if (!Array.isArray(members)) members = [members];
    members = members
      .map((m) => (typeof m === "string" ? m.trim() : ""))
      .filter(Boolean);

    const errors = {};
    if (!name) errors.name = "Group name is required.";
    if (!category) errors.category = "Please choose a category.";
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "group_images", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    const membersWithIds = members.map((memberName) => ({
      _id: new mongoose.Types.ObjectId(),
      name: memberName,
    }));

    const newGroup = new Group({
      name,
      description,
      category,
      image: imageUrl,
      members: membersWithIds,
      createdBy: req.user._id,
    });

    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    if (error.name === "ValidationError") {
      const errors = {};
      for (const field of Object.keys(error.errors)) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({ message: "Validation failed", errors });
    }
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

// ---------- Update group basics (name / description / category / image) ----------
export const updateGroup = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!ownsGroup(group, req.user)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this group" });
    }

    const errors = {};

    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      if (!name) errors.name = "Group name can't be empty.";
      else group.name = name;
    }

    if (typeof req.body.description === "string") {
      group.description = req.body.description.trim();
    }

    if (typeof req.body.category === "string" && req.body.category.trim()) {
      group.category = req.body.category.trim();
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // Optional new cover image
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "group_images", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      group.image = uploadResult.secure_url;
    }

    const saved = await group.save();
    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in updateGroup:", error);
    if (error.name === "ValidationError") {
      const errs = {};
      for (const field of Object.keys(error.errors)) {
        errs[field] = error.errors[field].message;
      }
      return res.status(400).json({ message: "Validation failed", errors: errs });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- Add a member ----------
export const addMember = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!ownsGroup(group, req.user)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this group" });
    }

    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({
        message: "Validation failed",
        errors: { name: "Member name is required." },
      });
    }

    // Reject duplicates (case-insensitive) among ACTIVE members.
    const dup = group.members.find(
      (m) => !m.removed && m.name.toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      return res.status(409).json({
        message: "Validation failed",
        errors: { name: "A member with that name already exists." },
      });
    }

    group.members.push({
      _id: new mongoose.Types.ObjectId(),
      name,
      removed: false,
    });
    const saved = await group.save();
    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in addMember:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- Remove a member (with safety checks) ----------
export const removeMember = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!ownsGroup(group, req.user)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this group" });
    }

    const { memberId } = req.params;
    const member = group.members.id(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found in group" });
    }

    const { hasHistory, netCents, paidCents, shareCents } =
      await computeMemberBalanceCents(group._id, memberId);

    // Tier 3: refuse if money is still in flight. We never touch
    // historical expenses, so an unsettled balance would leave the
    // group's debt graph broken.
    if (Math.abs(netCents) >= 1) {
      return res.status(409).json({
        message: "Member has an unsettled balance",
        code: "UNSETTLED_BALANCE",
        details: {
          name: member.name,
          netBalance: netCents / 100,
          totalPaid: paidCents / 100,
          totalShare: shareCents / 100,
          direction: netCents > 0 ? "is_owed" : "owes",
        },
      });
    }

    if (!hasHistory) {
      // Tier 1: clean. Hard-remove from the array.
      group.members.pull(memberId);
    } else {
      // Tier 2: settled but referenced in past expenses. Soft-delete so
      // their name still resolves in historical records.
      member.removed = true;
    }

    const saved = await group.save();
    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in removeMember:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- Delete an entire group (and its expenses) ----------
export const deleteGroup = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!ownsGroup(group, req.user)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this group" });
    }

    const deletedExpenses = await Expense.deleteMany({ groupId: group._id });
    await group.deleteOne();

    res.status(200).json({
      message: "Group deleted",
      groupId: group._id,
      deletedExpenses: deletedExpenses.deletedCount,
    });
  } catch (error) {
    console.error("Error in deleteGroup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
