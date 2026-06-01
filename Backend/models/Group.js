import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  name: { type: String, required: true, trim: true },
  // Optional email — the discovery key. If it matches an existing
  // User's email we link the account + send an invite; otherwise the
  // member stays offline (just a name on the books). Stored lowercased.
  email: { type: String, default: null, trim: true, lowercase: true },
  // Optional link to a real account. Set when the inviter typed an
  // email that matched an existing User. Used by `getUserGroups` to
  // surface groups in the invitee's "My groups" list, but only once
  // they've accepted (see `inviteStatus`).
  linkedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // Lifecycle of this member within the group:
  //   offline  — name only, no linked account (default)
  //   pending  — linked to a user, invite sent but not yet accepted
  //   accepted — linked + accepted, group appears in invitee's account
  //   declined — linked but declined; member stays as bookkeeping
  //              (their share is still tracked) but they don't see the
  //              group in their own account
  inviteStatus: {
    type: String,
    enum: ["offline", "pending", "accepted", "declined"],
    default: "offline",
  },
  // Soft-delete flag. Members who have past expense involvement but a
  // zero net balance get this set so their name still resolves in
  // historical records, but they're hidden from new-expense selectors.
  removed: { type: Boolean, default: false },
});

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: {
      type: String,
      required: true,
      enum: [
        "Household",
        "Travel",
        "Entertainment",
        "Groceries",
        "Dining",
        "Shopping",
        "Gifts",
        "Utilities",
        "Social",
        "Bill",
        "Subscriptions",
        "Education",
        "Health",
        "Others",
      ],
    },
    image: {
     type:String,
    },
    // The group's display currency, chosen by the owner at creation and
    // fixed thereafter. Every member sees amounts in THIS currency — no
    // per-user conversion. Stored as an uppercase code (e.g. INR, USD).
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    members: [memberSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index speeds up "find groups where I'm a member" — used
// by getUserGroups whenever a user logs in.
groupSchema.index({ "members.linkedUserId": 1, "members.inviteStatus": 1 });

const Group = mongoose.model("Group", groupSchema);
export default Group;
