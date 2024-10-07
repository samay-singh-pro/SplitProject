import Expense from "../models/Expense.js";
import Group from "../models/Group.js";

export const getAllExpense = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId).populate("members");
    if (!group) return res.status(404).json({ message: "Group not found" });
    
    const members = group.members;
    const memberNameMap = new Map(members.map((m) => [m._id.toString(), m.name]));
    
    const getNameById = (id) => memberNameMap.get(id.toString()) || "Unknown member";

    const expenses = await Expense.find({
      groupId,
      settlementExpense: false
    });

    const formattedExpenses = expenses.map(expense => {
      const {
        amount, description, category, spenderId, splitDetails, splitType, createdAt
      } = expense;

      const formattedSplitDetails = splitDetails.map(split => {
        const memberName = getNameById(split.member);
        let splitAmount = 0;

        if (splitType === "equally") {
          splitAmount = amount / splitDetails.length;
        } else if (splitType === "unequally") {
          splitAmount = split.amount; 
        } else if (splitType === "percentage") {
          splitAmount = (amount * split.percentage) / 100; 
        }

        return {
          memberId: split.member,
          memberName: memberName,
          amount: parseFloat(splitAmount.toFixed(2)),
        };
      });

      const totalSplitAmount = formattedSplitDetails.reduce((sum, split) => sum + split.amount, 0);
      if (totalSplitAmount !== amount) {
        console.warn(`Warning: Split amounts do not match the total amount for expense ${expense._id}`);
      }

      const formattedDate = new Date(createdAt).toLocaleString();

      return {
        groupId: expense.groupId,
        amount: amount,
        description: description,
        category: category,
        spenderId: spenderId,
        spenderName: getNameById(spenderId),
        splitDetails: formattedSplitDetails,
        createdAt: formattedDate
      };
    });

    res.status(200).json({ expenses: formattedExpenses });
    
  } catch (error) {
    console.error(error);
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
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to log expenses for this group",
      });
    }

    const spender = group.members.find(
      (member) => member._id.toString() === spenderId
    );
    if (!spender) {
      return res
        .status(400)
        .json({ message: "Spender is not part of this group" });
    }

    const invalidMembers = splitDetails.filter(
      (split) =>
        !group.members.some(
          (member) => member._id.toString() === split.member.toString()
        )
    );
    if (invalidMembers.length > 0) {
      return res.status(400).json({
        message: "One or more members in split are not part of this group",
      });
    }

    if (splitType === "unequally") {
      if (splitDetails.some((split) => !split.amount)) {
        return res.status(400).json({
          message: "For unequal split, amounts are required for each member",
        });
      }
      const totalContributions = splitDetails.reduce(
        (acc, member) => acc + member.amount,
        0
      );

      if (totalContributions !== amount) {
        return res
          .status(400)
          .json({
            error: "Total contributions do not match the total expense amount",
          });
      }
    } else if (splitType === "percentage") {
      if (splitDetails.some((split) => !split.percentage)) {
        return res.status(400).json({
          message:
            "For percentage split, percentages are required for each member",
        });
      }

      const totalPercentage = splitDetails.reduce(
        (acc, split) => acc + split.percentage,
        0
      );
      if (totalPercentage !== 100) {
        return res
          .status(400)
          .json({ message: "The total percentage must equal 100%" });
      }
    } else if (splitType === "equally") {
      const splitAmount = amount / splitDetails.length;
      splitDetails.forEach((split) => (split.amount = splitAmount));
    }

    const expense = new Expense({
      settlementExpense,
      groupId,
      amount,
      description,
      category,
      spenderId,
      splitDetails,
      splitType,
      createdBy: req.user._id,
    });

    await expense.save();

    res.status(201).json({ message: "Expense logged successfully", expense });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
