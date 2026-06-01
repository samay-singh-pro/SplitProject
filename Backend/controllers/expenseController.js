import Expense from "../models/Expense.js";
import Group from "../models/Group.js";

const TOLERANCE = 0.01; // rupees — allow 1 paise of rounding drift

const toCents = (n) => Math.round(Number(n || 0) * 100);

// Shared validation + normalization used by both logExpense and updateExpense.
// Returns { errors } if invalid; { normalizedSplits, amt } if valid.
const validateExpensePayload = ({
  group,
  amount,
  splitDetails,
  spenderId,
  splitType,
  settlementExpense,
}) => {
  const errors = {};

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
    errors.splitDetails = "At least one member must be in the split.";
  }

  const spender = group.members.find(
    (member) =>
      member._id.toString() === spenderId?.toString?.() && !member.removed
  );
  if (!spender) {
    errors.spenderId = "Spender is not an active member of this group.";
  }

  if (Array.isArray(splitDetails) && splitDetails.length > 0) {
    const invalidMembers = splitDetails.filter(
      (s) =>
        !group.members.some(
          (m) => m._id.toString() === s.member?.toString?.() && !m.removed
        )
    );
    if (invalidMembers.length > 0) {
      errors.splitDetails =
        "One or more split members aren't active in this group.";
    }

    const ids = splitDetails.map((s) => s.member?.toString?.());
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      errors.splitDetails =
        "Each member can only appear once in the split.";
    }

    if (splitType === "unequally") {
      const total = splitDetails.reduce(
        (acc, s) => acc + Number(s.amount || 0),
        0
      );
      if (Math.abs(total - amt) > TOLERANCE) {
        errors.unequal = `Per-member amounts sum to ₹${total.toFixed(
          2
        )}, expected ₹${amt.toFixed(2)}.`;
      }
      if (splitDetails.some((s) => Number(s.amount) < 0)) {
        errors.unequal = "Per-member amounts can't be negative.";
      }
    } else if (splitType === "percentage") {
      const totalPct = splitDetails.reduce(
        (acc, s) => acc + Number(s.percentage || 0),
        0
      );
      if (Math.abs(totalPct - 100) > TOLERANCE) {
        errors.percentage = `Percentages sum to ${totalPct}, expected 100.`;
      }
      if (
        splitDetails.some(
          (s) => Number(s.percentage) < 0 || Number(s.percentage) > 100
        )
      ) {
        errors.percentage = "Each percentage must be between 0 and 100.";
      }
    }
  }

  if (settlementExpense) {
    if (splitDetails?.length !== 1) {
      errors.settlement =
        "A settlement must record exactly one beneficiary.";
    } else if (
      splitDetails[0].member?.toString?.() === spenderId?.toString?.()
    ) {
      errors.settlement =
        "Payer and beneficiary of a settlement must be different.";
    }
  }

  if (Object.keys(errors).length > 0) return { errors };

  let normalizedSplits = splitDetails;
  if (splitType === "equally") {
    normalizedSplits = splitDetails.map((s) => ({ member: s.member }));
  } else if (splitType === "unequally") {
    normalizedSplits = splitDetails.map((s) => ({
      member: s.member,
      amount: Number(s.amount),
    }));
  } else if (splitType === "percentage") {
    normalizedSplits = splitDetails.map((s) => ({
      member: s.member,
      percentage: Number(s.percentage),
    }));
  }

  return { normalizedSplits, amt };
};

// ---------- Group authorization (Splitwise-style) ----------
// A user relates to a group in one of three ways:
//   "owner"  — they created the group (group.createdBy). Acts as the
//              moderator: can add/edit/delete ANY expense or settlement.
//   "member" — an accepted, linked member row. Can add expenses (for
//              anyone), edit/delete only the ones THEY created, and
//              record settlements that involve them.
//   "none"   — no relationship; no read or write access.
const getGroupRole = (group, user) => {
  if (!user) return "none";
  const uid = user._id?.toString?.();
  if (group.createdBy?.toString?.() === uid) return "owner";
  const linked = group.members?.some(
    (m) =>
      m.linkedUserId?.toString?.() === uid && m.inviteStatus === "accepted"
  );
  return linked ? "member" : "none";
};

// The requesting user's own member._id within the group (the accepted,
// linked row), or null. Used to enforce "settlements must involve you".
const findMyMemberId = (group, user) => {
  const uid = user?._id?.toString?.();
  const mine = group.members?.find(
    (m) =>
      m.linkedUserId?.toString?.() === uid && m.inviteStatus === "accepted"
  );
  return mine ? mine._id.toString() : null;
};

export const getAllExpense = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate("members");
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only group participants (owner or accepted members) can read.
    if (getGroupRole(group, req.user) === "none") {
      return res
        .status(403)
        .json({ message: "You're not a member of this group." });
    }

    const memberNameMap = new Map(
      group.members.map((m) => [m._id.toString(), m.name])
    );
    const getNameById = (id) =>
      memberNameMap.get(id?.toString?.()) || "Unknown member";

    const expenses = await Expense.find({
      groupId,
      settlementExpense: { $ne: true },
    }).sort({ createdAt: -1 });

    const formattedExpenses = expenses.map((expense) => {
      const {
        amount,
        description,
        category,
        spenderId,
        splitDetails,
        splitType,
        createdAt,
      } = expense;

      // Compute each member's share in cents so the displayed splits
      // sum exactly to the expense amount (no missing paise).
      const totalCents = toCents(amount);
      const n = splitDetails.length;
      const shareCents = splitDetails.map((s) => {
        if (splitType === "equally") {
          return Math.floor(totalCents / n);
        }
        if (splitType === "unequally") {
          return toCents(s.amount);
        }
        if (splitType === "percentage") {
          return Math.round((totalCents * Number(s.percentage || 0)) / 100);
        }
        return 0;
      });

      // Distribute rounding remainder.
      let diff = totalCents - shareCents.reduce((a, b) => a + b, 0);
      if (diff !== 0) {
        if (splitType === "equally") {
          const step = diff > 0 ? 1 : -1;
          let i = 0;
          while (diff !== 0 && i < shareCents.length) {
            shareCents[i] += step;
            diff -= step;
            i++;
          }
        } else if (shareCents.length > 0) {
          shareCents[shareCents.length - 1] += diff;
        }
      }

      const formattedSplitDetails = splitDetails.map((split, i) => {
        const details = {
          memberId: split.member,
          memberName: getNameById(split.member),
          amount: shareCents[i] / 100,
        };
        // Include percentage if the split type is percentage
        if (splitType === "percentage" && split.percentage !== undefined) {
          details.percentage = split.percentage;
        }
        return details;
      });

      return {
        _id: expense._id,
        groupId: expense.groupId,
        amount,
        description,
        category,
        spenderId,
        spenderName: getNameById(spenderId),
        splitType,
        splitDetails: formattedSplitDetails,
        // Surfaced so the client can show edit/delete only to the
        // expense's creator (or the group owner).
        createdBy: expense.createdBy,
        createdAt,
      };
    });

    res.status(200).json({ expenses: formattedExpenses });
  } catch (error) {
    console.error("Error in getAllExpense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logExpense = async (req, res) => {
  try {
    const {
      settlementExpense,
      groupId,
      amount,
      description,
      category,
      spenderId,
      splitDetails,
      splitType,
      date,
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const role = getGroupRole(group, req.user);
    if (role === "none") {
      return res.status(403).json({
        message: "You're not a member of this group.",
      });
    }
    // A non-owner may only record settlements that involve them (as the
    // payer or the beneficiary). Owners can record any settlement.
    if (settlementExpense && role !== "owner") {
      const myMemberId = findMyMemberId(group, req.user);
      const involvesMe =
        myMemberId &&
        (spenderId?.toString?.() === myMemberId ||
          (Array.isArray(splitDetails) &&
            splitDetails.some(
              (s) => s.member?.toString?.() === myMemberId
            )));
      if (!involvesMe) {
        return res.status(403).json({
          message: "You can only record settlements that involve you.",
        });
      }
    }

    const result = validateExpensePayload({
      group,
      amount,
      splitDetails,
      spenderId,
      splitType,
      settlementExpense,
    });

    if (result.errors) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: result.errors });
    }

    // Use the client-supplied date as the expense timestamp (lets users
    // log past expenses); fall back to now if absent/invalid.
    const when = date ? new Date(date) : new Date();
    const createdAt = Number.isNaN(when.getTime()) ? new Date() : when;

    const expense = new Expense({
      settlementExpense: !!settlementExpense,
      groupId,
      amount: result.amt,
      description,
      category,
      spenderId,
      splitDetails: result.normalizedSplits,
      splitType,
      createdBy: req.user._id,
      createdAt,
    });

    await expense.save();
    res.status(201).json({ message: "Expense logged successfully", expense });
  } catch (error) {
    console.error("Error in logExpense:", error);
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

export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const {
      amount,
      description,
      category,
      spenderId,
      splitDetails,
      splitType,
    } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Owner can edit anything; a member can edit only what they created.
    const isCreator =
      expense.createdBy?.toString?.() === req.user._id.toString();
    if (getGroupRole(group, req.user) !== "owner" && !isCreator) {
      return res.status(403).json({
        message: "You can only edit expenses you added.",
      });
    }

    const result = validateExpensePayload({
      group,
      amount,
      splitDetails,
      spenderId,
      splitType,
      // Preserve original settlement flag — clients shouldn't be able
      // to flip a normal expense into a settlement (or vice-versa)
      // by editing; that would require a delete + re-create.
      settlementExpense: expense.settlementExpense,
    });

    if (result.errors) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: result.errors });
    }

    expense.amount = result.amt;
    if (description !== undefined) expense.description = description;
    if (category !== undefined) expense.category = category;
    expense.spenderId = spenderId;
    expense.splitDetails = result.normalizedSplits;
    expense.splitType = splitType;

    await expense.save();
    res.status(200).json({ message: "Expense updated", expense });
  } catch (error) {
    console.error("Error in updateExpense:", error);
    if (error.name === "ValidationError") {
      const errs = {};
      for (const field of Object.keys(error.errors)) {
        errs[field] = error.errors[field].message;
      }
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errs });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Owner can delete anything; a member can delete only what they created.
    const isCreator =
      expense.createdBy?.toString?.() === req.user._id.toString();
    if (getGroupRole(group, req.user) !== "owner" && !isCreator) {
      return res.status(403).json({
        message: "You can only delete expenses you added.",
      });
    }

    await expense.deleteOne();
    res.status(200).json({ message: "Expense deleted", expenseId });
  } catch (error) {
    console.error("Error in deleteExpense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
