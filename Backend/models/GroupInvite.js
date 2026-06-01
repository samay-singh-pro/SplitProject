import mongoose from "mongoose";

// One row per (group, invitee) pair. Created when the group owner
// adds a member whose email matches an existing User. The invitee
// gets to Accept or Decline from their profile menu; nothing about
// their group membership changes until they do.
const groupInviteSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    // The user-doc of the person sending the invite. Used by the
    // invitee's UI to show "Invited by Alex".
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The user-doc of the recipient. Looked up at invite-creation
    // time by phone — see groupController#linkMembersToUsers.
    inviteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Pointer back to the member subdoc inside the group, so accept/
    // decline can mutate the right row.
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "revoked"],
      default: "pending",
      index: true,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hot path: invitee opens the app → "give me my pending invites".
groupInviteSchema.index({ inviteeId: 1, status: 1, createdAt: -1 });

// One invite per (group, invitee) — prevents spam re-invites and keeps
// the accept/decline state authoritative.
groupInviteSchema.index({ groupId: 1, inviteeId: 1 }, { unique: true });

const GroupInvite = mongoose.model("GroupInvite", groupInviteSchema);
export default GroupInvite;
