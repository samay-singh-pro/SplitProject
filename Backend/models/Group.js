import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  name: { type: String, required: true, trim: true },
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
    members: [memberSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);
export default Group;
