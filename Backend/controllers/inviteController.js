import GroupInvite from "../models/GroupInvite.js";
import Group from "../models/Group.js";

// GET /invite/me — pending invites for the current user.
// Returns the fields the frontend popover needs to render each row:
// inviter name, group name + category (for the emoji), createdAt.
export const listMyInvites = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const invites = await GroupInvite.find({
      inviteeId: req.user._id,
      status,
    })
      .sort({ createdAt: -1 })
      .populate({ path: "inviterId", select: "username email" })
      .populate({ path: "groupId", select: "name category image" });

    // Shape down to a frontend-friendly payload. Skip rows whose
    // group has been deleted server-side (can happen if cleanup
    // racing or an admin wipe; defensive).
    const out = invites
      .filter((i) => i.groupId)
      .map((i) => ({
        _id: i._id,
        status: i.status,
        createdAt: i.createdAt,
        respondedAt: i.respondedAt,
        groupId: i.groupId._id,
        groupName: i.groupId.name,
        groupCategory: i.groupId.category,
        groupImage: i.groupId.image,
        inviterId: i.inviterId?._id || null,
        inviterName:
          i.inviterId?.username || i.inviterId?.email || "Someone",
      }));

    res.status(200).json({ invites: out });
  } catch (error) {
    console.error("Error listing invites:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /invite/:id — body { action: "accept" | "decline" }
//
// Accept: flips the corresponding group member subdoc to
//   inviteStatus="accepted". The group then surfaces in the
//   invitee's `getUserGroups` response on next fetch.
// Decline: flips the member to "declined" — they don't see the
//   group but stay in the math for bookkeeping (their share is
//   still tracked locally for the group's existing expenses).
export const respondToInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const action = String(req.body.action || "").toLowerCase();
    if (action !== "accept" && action !== "decline") {
      return res.status(400).json({
        message: "Validation failed",
        errors: { action: "Action must be 'accept' or 'decline'." },
      });
    }

    const invite = await GroupInvite.findById(id);
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    // Only the invitee can respond. Inviter can't auto-accept for
    // them, and unrelated users shouldn't see the invite at all.
    if (invite.inviteeId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to respond to this invite" });
    }
    if (invite.status !== "pending") {
      return res
        .status(409)
        .json({ message: "Invite already responded to" });
    }

    const newStatus = action === "accept" ? "accepted" : "declined";

    // Update the matching member subdoc on the group as well so the
    // pending pill on the inviter's side flips immediately.
    const group = await Group.findById(invite.groupId);
    if (!group) {
      // Group was deleted under us — invite is moot. Mark the invite
      // declined silently so it disappears from the inbox and let the
      // frontend handle it gracefully.
      invite.status = "declined";
      invite.respondedAt = new Date();
      await invite.save();
      return res
        .status(410)
        .json({ message: "Group no longer exists; invite was cleared." });
    }

    const member = group.members.id(invite.memberId);
    if (member) {
      member.inviteStatus = newStatus;
      await group.save();
    }

    invite.status = newStatus;
    invite.respondedAt = new Date();
    await invite.save();

    res.status(200).json({
      message: `Invite ${newStatus}.`,
      invite: {
        _id: invite._id,
        status: invite.status,
        respondedAt: invite.respondedAt,
        groupId: invite.groupId,
      },
    });
  } catch (error) {
    console.error("Error responding to invite:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
