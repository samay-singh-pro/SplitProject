import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  settlementExpense: {
    type: Boolean,
    default: false,
    required: false,
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  spenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group.members",
    required: true,
  },
  splitDetails: [
    {
      member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group.members",
        required: true,
      },
      amount: {
        type: Number, // amount each member owes in case of unequal split
      },
      percentage: {
        type: Number, // percentage each member owes in case of percentage split
      },
    },
  ],
  splitType: {
    type: String,
    enum: ["equally", "unequally", "percentage"],
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;
