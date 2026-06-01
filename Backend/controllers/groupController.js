import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import User, { normalizeEmail } from "../models/User.js";
import GroupInvite from "../models/GroupInvite.js";
import mongoose from "mongoose";
import cloudinaryModule from "cloudinary";

const cloudinary = cloudinaryModule.v2;

// ---------- Shared helpers ----------

const toCents = (n) => Math.round(Number(n || 0) * 100);

// Parse the multipart "members" field. Each entry can be either a
// plain name string (legacy) or a JSON-encoded {name, email}. Returns
// an array of normalized {name, email} objects with bad rows skipped.
export const parseMembersField = (raw) => {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const entry of arr) {
    if (entry == null) continue;
    if (typeof entry === "object") {
      // Already an object (JSON body endpoints).
      const name = String(entry.name || "").trim();
      if (!name) continue;
      out.push({ name, email: normalizeEmail(entry.email) || null });
      continue;
    }
    const s = String(entry).trim();
    if (!s) continue;
    // Try parsing as JSON first; fall back to "just a name".
    if (s.startsWith("{")) {
      try {
        const obj = JSON.parse(s);
        const name = String(obj.name || "").trim();
        if (!name) continue;
        out.push({ name, email: normalizeEmail(obj.email) || null });
        continue;
      } catch {
        /* fall through to plain-name path */
      }
    }
    out.push({ name: s, email: null });
  }
  return out;
};

// For each member that has an email, see if a user account exists for
// that email. If yes → set linkedUserId + inviteStatus="pending" and
// create a GroupInvite row. If no → leave as offline.
//
// Pass `inviterId` so the invite carries the sender. `targetMembers`
// is the subset we're inviting now (used by addMember which only
// processes the newly-added rows, not the whole group).
//
// Returns { invitesCreated } so the caller can include the count in
// the response if it wants to.
// Maximum invites a single user can send per rolling 24h. Anything
// past this is silently swallowed (member is saved as offline). Keeps
// a hostile / compromised account from flooding the platform with
// spam invites.
const INVITE_DAILY_CAP = 50;

export const linkMembersToUsers = async (
  group,
  targetMembers,
  inviterId
) => {
  // Collect distinct emails we actually need to look up.
  const emails = Array.from(
    new Set(
      targetMembers
        .map((m) => m.email && normalizeEmail(m.email))
        .filter(Boolean)
    )
  );
  if (emails.length === 0) return { invitesCreated: 0 };

  // Rolling 24h cap. We count rows by `createdAt` so retroactively
  // accepted / declined invites still count toward the day's spend.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentToday = await GroupInvite.countDocuments({
    inviterId,
    createdAt: { $gte: dayAgo },
  });
  let remainingBudget = Math.max(0, INVITE_DAILY_CAP - sentToday);
  if (remainingBudget === 0) {
    // Nothing left in budget. Leave every match as offline — the
    // group still saves, just without invites. Surfaced via the
    // `rateLimited` flag in the result so the caller can warn.
    return { invitesCreated: 0, rateLimited: true };
  }

  // Single round-trip — email is unique-indexed so this hits the index
  // regardless of list size.
  const matches = await User.find(
    { email: { $in: emails } },
    { _id: 1, email: 1, acceptInvitesFrom: 1 }
  );
  if (matches.length === 0) return { invitesCreated: 0 };

  // Build a quick email → user map. Skip users who've opted out of
  // invites entirely (acceptInvitesFrom = "nobody").
  const userByEmail = new Map();
  for (const u of matches) {
    if (u.acceptInvitesFrom === "nobody") continue;
    userByEmail.set(u.email, u);
  }

  let invitesCreated = 0;
  let rateLimited = false;
  for (const member of targetMembers) {
    if (!member.email) continue;
    const user = userByEmail.get(member.email);
    if (!user) continue;
    // Skip self-invite (the inviter shouldn't see their own group
    // pop up as a pending invite).
    if (user._id.toString() === inviterId.toString()) continue;
    // Stop creating invites once today's budget is spent. The member
    // is still saved on the group, just without a linked user/invite.
    if (remainingBudget <= 0) {
      rateLimited = true;
      continue;
    }

    member.linkedUserId = user._id;
    member.inviteStatus = "pending";

    // Try to create the invite. Compound unique index (groupId,
    // inviteeId) ensures only one row per pair — if it already
    // exists (e.g. owner re-added the same person) we just bump it
    // back to pending instead of erroring out.
    try {
      await GroupInvite.create({
        groupId: group._id,
        inviterId,
        inviteeId: user._id,
        memberId: member._id,
        status: "pending",
      });
      invitesCreated += 1;
      remainingBudget -= 1;
    } catch (err) {
      if (err?.code === 11000) {
        await GroupInvite.updateOne(
          { groupId: group._id, inviteeId: user._id },
          {
            $set: {
              status: "pending",
              memberId: member._id,
              respondedAt: null,
              inviterId,
            },
          }
        );
        invitesCreated += 1;
        remainingBudget -= 1;
      } else {
        // Don't fail the whole group create if a single invite blows
        // up — log and move on. The member is still saved as offline.
        console.error("Invite create failed:", err);
        member.linkedUserId = null;
        member.inviteStatus = "offline";
      }
    }
  }

  return { invitesCreated, rateLimited };
};

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
    // Group currency is fixed at creation. Normalize to an uppercase
    // 3-5 letter code; anything invalid/missing falls back to INR.
    const rawCurrency = String(req.body.currency || "")
      .trim()
      .toUpperCase();
    const currency = /^[A-Z]{3,5}$/.test(rawCurrency) ? rawCurrency : "INR";

    // Each member is either a plain name string (legacy) or a JSON-
    // encoded {name, email} so multipart form-data can carry both.
    const memberInputs = parseMembersField(req.body.members);

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

    const membersWithIds = memberInputs.map((m) => ({
      _id: new mongoose.Types.ObjectId(),
      name: m.name,
      email: m.email || null,
      linkedUserId: null,
      inviteStatus: "offline",
    }));

    // Optionally add the creator as an accepted member (so expenses they
    // pay here flow into their Personal tab). Avoid a display-name clash
    // with a typed member.
    if (String(req.body.includeMe) === "true") {
      const base = req.user.username || "Me";
      let name = base;
      let n = 2;
      while (
        membersWithIds.some(
          (m) => m.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        name = `${base} (${n++})`;
      }
      membersWithIds.push({
        _id: new mongoose.Types.ObjectId(),
        name,
        email: req.user.email || null,
        linkedUserId: req.user._id,
        inviteStatus: "accepted",
      });
    }

    const newGroup = new Group({
      name,
      description,
      category,
      currency,
      image: imageUrl,
      members: membersWithIds,
      createdBy: req.user._id,
    });

    // Email-match BEFORE the first save so the linked + pending
    // statuses land in the same document and the response carries
    // the final shape (no second round-trip from the client).
    const { invitesCreated, rateLimited } = await linkMembersToUsers(
      newGroup,
      newGroup.members,
      req.user._id
    );

    const savedGroup = await newGroup.save();
    res.status(201).json({
      ...savedGroup.toObject(),
      invitesCreated,
      rateLimited: !!rateLimited,
    });
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

    // A group shows up in your list if:
    //   (a) you created it, OR
    //   (b) you're a member of it via an invite you've accepted.
    // Pending / declined invites stay hidden — only after accept does
    // the group surface on the invitee's side.
    const groups = await Group.find({
      $or: [
        { createdBy: req.user._id },
        {
          members: {
            $elemMatch: {
              linkedUserId: req.user._id,
              inviteStatus: "accepted",
              removed: { $ne: true },
            },
          },
        },
      ],
    });
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
    const email = normalizeEmail(req.body.email) || null;
    if (!name) {
      return res.status(400).json({
        message: "Validation failed",
        errors: { name: "Member name is required." },
      });
    }
    // Basic email shape check (optional field, but if present it must
    // look like an email so matching has a chance).
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: "Validation failed",
        errors: { email: "That doesn't look like a valid email." },
      });
    }

    // Reject duplicates (case-insensitive) among ACTIVE members.
    const dupName = group.members.find(
      (m) => !m.removed && m.name.toLowerCase() === name.toLowerCase()
    );
    if (dupName) {
      return res.status(409).json({
        message: "Validation failed",
        errors: { name: "A member with that name already exists." },
      });
    }
    if (email) {
      const dupEmail = group.members.find(
        (m) => !m.removed && m.email === email
      );
      if (dupEmail) {
        return res.status(409).json({
          message: "Validation failed",
          errors: { email: "Another member already uses that email." },
        });
      }
    }

    const newMember = {
      _id: new mongoose.Types.ObjectId(),
      name,
      email,
      linkedUserId: null,
      inviteStatus: "offline",
      removed: false,
    };
    group.members.push(newMember);

    // Email-match just the new row. The helper mutates in place.
    const justAdded = group.members[group.members.length - 1];
    await linkMembersToUsers(group, [justAdded], req.user._id);

    const saved = await group.save();
    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in addMember:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------- Include the current user as a member ----------
// Lets a logged-in user add THEMSELVES to a group (linked + accepted),
// so expenses they pay there flow into their Personal tab. Mainly used
// by the owner (who isn't auto-added as a member at creation).
export const includeMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const uid = req.user._id.toString();
    const isOwner = group.createdBy?.toString() === uid;
    const existing = group.members.find(
      (m) => m.linkedUserId?.toString() === uid && !m.removed
    );
    // Only people who already belong to the group (owner or an accepted
    // member) can act here.
    if (!isOwner && !existing) {
      return res.status(403).json({ message: "Not part of this group." });
    }
    // Already linked — just ensure they're accepted, then return.
    if (existing) {
      if (existing.inviteStatus !== "accepted") {
        existing.inviteStatus = "accepted";
        await group.save();
      }
      return res.status(200).json(group);
    }

    // Add the current user, avoiding a display-name clash.
    const base = req.user.username || "Me";
    let name = base;
    let n = 2;
    const taken = (nm) =>
      group.members.some(
        (m) => !m.removed && m.name.toLowerCase() === nm.toLowerCase()
      );
    while (taken(name)) name = `${base} (${n++})`;

    group.members.push({
      _id: new mongoose.Types.ObjectId(),
      name,
      email: req.user.email || null,
      linkedUserId: req.user._id,
      inviteStatus: "accepted",
      removed: false,
    });
    const saved = await group.save();
    res.status(200).json(saved);
  } catch (error) {
    console.error("Error in includeMe:", error);
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
    // Pending invites for a deleted group are pointless — wipe them
    // so they don't haunt the invitee's inbox.
    await GroupInvite.deleteMany({ groupId: group._id });
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
