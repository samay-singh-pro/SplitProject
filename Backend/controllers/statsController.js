import Group from "../models/Group.js";
import Expense from "../models/Expense.js";

export const getGroupStats = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate("members");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const members = group.members;
    const memberNameMap = new Map(
      members.map((m) => [m._id.toString(), m.name])
    );
    const getNameById = (id) => {
      return memberNameMap.get(id.toString()) || "Unknown member";
    };

    const expenses = await Expense.find({
      groupId,
      settlementExpense: false,
    });

    let totalSpent = 0;
    const memberStats = {};
    const categoryWiseSpendings = {};

    expenses.forEach((expense) => {
      const { amount, category, spenderId, splitType, splitDetails } = expense;
      totalSpent += amount;

      if (!categoryWiseSpendings[category]) {
        categoryWiseSpendings[category] = 0;
      }
      categoryWiseSpendings[category] += amount;

      if (!memberStats[spenderId]) {
        const memberName = getNameById(spenderId);
        memberStats[spenderId] = {
          name: memberName,
          totalSpent: 0,
          lent: {},
          owe: {},
          totalSpentOnSelfAndByOthers: 0,
        };
      }
      memberStats[spenderId].totalSpent += amount;

      splitDetails.forEach((split) => {
        const { member, amount: splitAmount, percentage } = split;

        if (!memberStats[member]) {
          const memberName = getNameById(member);
          memberStats[member] = {
            name: memberName,
            totalSpent: 0,
            lent: {},
            owe: {},
            totalSpentOnSelfAndByOthers: 0,
          };
        }

        let oweamount = 0;
        if (splitType === "equally") {
          oweamount = amount / splitDetails.length;
        } else if (splitType === "unequally") {
          oweamount = splitAmount;
        } else if (splitType === "percentage") {
          oweamount = (amount * percentage) / 100;
        }

        // Round to 2 decimal places
        oweamount = parseFloat(oweamount.toFixed(2));

        memberStats[member].totalSpentOnSelfAndByOthers += oweamount;

        if (spenderId.toString() !== member.toString()) {
          if (!memberStats[member].owe[spenderId]) {
            memberStats[member].owe[spenderId] = {
              name: getNameById(spenderId),
              amount: 0,
            };
          }
          memberStats[member].owe[spenderId].amount += oweamount;
          memberStats[member].owe[spenderId].amount = parseFloat(
            memberStats[member].owe[spenderId].amount.toFixed(2)
          );

          if (!memberStats[spenderId].lent[member]) {
            memberStats[spenderId].lent[member] = {
              name: getNameById(member),
              amount: 0,
            };
          }
          memberStats[spenderId].lent[member].amount += oweamount;
          memberStats[spenderId].lent[member].amount = parseFloat(
            memberStats[spenderId].lent[member].amount.toFixed(2)
          );
        }
      });
    });

    const settlementExpenses = await Expense.find({
      groupId,
      settlementExpense: true,
    });

    settlementExpenses.forEach((expense) => {
      const { amount, spenderId, splitDetails } = expense;
      const { member } = splitDetails[0];
      memberStats[spenderId].totalSpent += amount;
      memberStats[spenderId].owe[member].amount =
        memberStats[spenderId].owe[member].amount - amount;
      memberStats[member].totalSpent -= amount;
      memberStats[member].lent[spenderId].amount =
        memberStats[member].lent[spenderId].amount - amount;
    });

    // Neutralize the amounts
    Object.keys(memberStats).forEach((memberId) => {
      const memberData = memberStats[memberId];
      const oweMap = memberData.owe;
      const lentMap = memberData.lent;

      Object.keys(oweMap).forEach((otherMemberId) => {
        if (lentMap[otherMemberId]) {
          const oweAmount = oweMap[otherMemberId].amount;
          const lentAmount = lentMap[otherMemberId].amount;

          // Round before comparing and calculating net
          const roundedOweAmount = parseFloat(oweAmount.toFixed(2));
          const roundedLentAmount = parseFloat(lentAmount.toFixed(2));

          // Calculate net amount and neutralize
          if (roundedOweAmount > roundedLentAmount) {
            oweMap[otherMemberId].amount = parseFloat(
              (roundedOweAmount - roundedLentAmount).toFixed(2)
            );
            delete lentMap[otherMemberId];
          } else if (roundedLentAmount > roundedOweAmount) {
            lentMap[otherMemberId].amount = parseFloat(
              (roundedLentAmount - roundedOweAmount).toFixed(2)
            );
            delete oweMap[otherMemberId];
          } else {
            // If amounts are equal, remove both entries
            delete oweMap[otherMemberId];
            delete lentMap[otherMemberId];
          }
        }
      });
    });

    const response = {
      groupId,
      totalSpent: parseFloat(totalSpent.toFixed(2)), // Round total spent
      categoryWiseSpendings: Object.fromEntries(
        Object.entries(categoryWiseSpendings).map(([category, amount]) => [
          category,
          parseFloat(amount.toFixed(2)), // Round category spendings
        ])
      ),
      memberStats,
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
