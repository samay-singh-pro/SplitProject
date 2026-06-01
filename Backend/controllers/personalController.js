import PersonalExpense from "../models/PersonalExpense.js";
import Group from "../models/Group.js";
import Expense from "../models/Expense.js";

// GET /personal — the user's individual spending feed:
//   • their solo personal expenses, PLUS
//   • group expenses they personally PAID (spenderId = their member),
//     limited to groups whose currency matches the user's personal
//     currency (we never convert, so mixed-currency group spend stays
//     in its own group view).
// Returns one merged, date-desc list + the personal currency. Insights
// (month total, trend, categories, avg) are derived on the client.
export const getPersonalExpenses = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const userId = req.user._id;
    const currency = req.user.currency || "INR";

    // 1) Solo personal expenses.
    const solo = await PersonalExpense.find({ userId }).lean();
    const soloItems = solo.map((e) => ({
      _id: e._id,
      amount: e.amount,
      description: e.description,
      category: e.category || "Others",
      date: e.date || e.createdAt,
      sourceType: "personal",
      groupId: null,
      groupName: null,
      editable: true,
    }));

    // 2) Group expenses the user paid — only same-currency groups where
    // they're an accepted, active, linked member.
    const groups = await Group.find({
      currency,
      members: {
        $elemMatch: {
          linkedUserId: userId,
          inviteStatus: "accepted",
          removed: { $ne: true },
        },
      },
    }).lean();

    const metaByGroup = new Map();
    for (const g of groups) {
      const mine = (g.members || []).find(
        (m) =>
          m.linkedUserId?.toString() === userId.toString() &&
          m.inviteStatus === "accepted" &&
          !m.removed
      );
      if (mine) {
        metaByGroup.set(g._id.toString(), {
          groupName: g.name,
          memberId: mine._id.toString(),
        });
      }
    }

    let groupItems = [];
    if (metaByGroup.size > 0) {
      const groupIds = [...metaByGroup.keys()];
      const memberIds = [...metaByGroup.values()].map((m) => m.memberId);
      const paid = await Expense.find({
        groupId: { $in: groupIds },
        spenderId: { $in: memberIds },
        settlementExpense: { $ne: true },
      }).lean();
      groupItems = paid
        .filter((e) => {
          const meta = metaByGroup.get(e.groupId?.toString());
          return meta && e.spenderId?.toString() === meta.memberId;
        })
        .map((e) => {
          const meta = metaByGroup.get(e.groupId.toString());
          return {
            _id: e._id,
            amount: e.amount,
            description: e.description,
            category: e.category || "Others",
            date: e.createdAt,
            sourceType: "group",
            groupId: e.groupId,
            groupName: meta.groupName,
            editable: false,
          };
        });
    }

    const expenses = [...soloItems, ...groupItems].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.status(200).json({ currency, expenses });
  } catch (error) {
    console.error("Error in getPersonalExpenses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const validateBody = (body) => {
  const amount = Number(body.amount);
  const description = String(body.description || "").trim();
  const category = String(body.category || "Others").trim() || "Others";
  const errors = {};
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }
  if (!description) errors.description = "Add a short description.";
  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) errors.date = "Invalid date.";
  return { amount, description, category, date, errors };
};

export const addPersonalExpense = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const { amount, description, category, date, errors } = validateBody(
      req.body
    );
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }
    const expense = await PersonalExpense.create({
      userId: req.user._id,
      amount,
      description,
      category,
      date,
    });
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error in addPersonalExpense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePersonalExpense = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const expense = await PersonalExpense.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    const { amount, description, category, date, errors } = validateBody(
      req.body
    );
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }
    expense.amount = amount;
    expense.description = description;
    expense.category = category;
    expense.date = date;
    await expense.save();
    res.status(200).json(expense);
  } catch (error) {
    console.error("Error in updatePersonalExpense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deletePersonalExpense = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const deleted = await PersonalExpense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.status(200).json({ message: "Deleted", id: req.params.id });
  } catch (error) {
    console.error("Error in deletePersonalExpense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
