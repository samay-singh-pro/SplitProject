import mongoose from "mongoose";

// A solo expense the user logs just for themselves — no group, no
// splitting. Used by the Personal tab to track individual spending.
// Amounts are in the user's personal (profile) currency; we don't store
// a currency here because the Personal view is single-currency by
// design (no conversion).
const personalExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, default: "Others", trim: true },
    // When the spend happened (user-editable), independent of createdAt.
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PersonalExpense = mongoose.model(
  "PersonalExpense",
  personalExpenseSchema
);
export default PersonalExpense;
