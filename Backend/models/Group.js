import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId
  },
  name: { type: String, required: true },
});

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        "Household",
        "Travel",
        "Entertainment",
        "Groceries",
        "Dining",
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
