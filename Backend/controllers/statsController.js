import Group from "../models/Group.js";
import Expense from "../models/Expense.js";

// ------------------------------------------------------------------
// Money math: do everything in integer cents/paise to avoid FP drift,
// convert back to 2-decimal rupees only at the API boundary.
// ------------------------------------------------------------------

// `Number.EPSILON` is way too small for currency comparisons.
// Allow ±0.5 paise tolerance everywhere.
const TOLERANCE_RUPEES = 0.005;

const toCents = (n) => Math.round(Number(n || 0) * 100);
const toRupees = (cents) => Math.round(cents) / 100;

// Compute each split's share in integer cents. Sum is guaranteed to
// equal the expense amount in cents (any rounding remainder is given
// to the last split, which is the standard convention).
const computeSharesCents = (expense) => {
  const { amount, splitType, splitDetails } = expense;
  const n = splitDetails.length;
  if (n === 0) return [];

  const totalCents = toCents(amount);

  // First pass: each share rounded independently.
  const shares = splitDetails.map((s) => {
    if (splitType === "equally") {
      // Equal floor share — remainder distributed below.
      return Math.floor(totalCents / n);
    }
    if (splitType === "unequally") {
      return toCents(s.amount);
    }
    if (splitType === "percentage") {
      // Round per-member percentage shares to nearest cent.
      return Math.round((totalCents * Number(s.percentage || 0)) / 100);
    }
    return 0;
  });

  // Second pass: ensure shares sum exactly to total.
  const sum = shares.reduce((a, b) => a + b, 0);
  let diff = totalCents - sum;
  if (diff !== 0 && shares.length > 0) {
    if (splitType === "equally") {
      // Spread remainder paise across the first |diff| members
      // (positive diff) or pull paise off them (negative).
      const step = diff > 0 ? 1 : -1;
      let i = 0;
      while (diff !== 0 && i < shares.length) {
        shares[i] += step;
        diff -= step;
        i++;
      }
    } else {
      // Unequal / percentage: park the remainder on the last entry.
      shares[shares.length - 1] += diff;
    }
  }

  return splitDetails.map((s, i) => ({
    memberId: s.member.toString(),
    shareCents: shares[i],
  }));
};

// Direct (pair-wise) debt graph: who owes whom based on the actual
// expense history. Mutual debts within a pair are netted out (if A owes
// B 100 and B owes A 30, the result is A owes B 70). Crucially, debts
// are NOT propagated through chains, so the resulting transfers always
// match expenses the two people actually shared together — much easier
// for users to recognise than the greedy minimum-transactions view.
const computeDirectDebtsCents = (expenses, settlementExpenses) => {
  // Map "debtorId|creditorId" -> cents
  const debt = {};

  const add = (fromId, toId, cents) => {
    if (fromId === toId || cents <= 0) return;
    const key = `${fromId}|${toId}`;
    debt[key] = (debt[key] || 0) + cents;
  };

  // A settlement reduces existing debt from payer->beneficiary; if the
  // settlement exceeds that debt, the excess becomes debt in the
  // opposite direction (beneficiary now owes payer).
  const settle = (fromId, toId, cents) => {
    if (fromId === toId || cents <= 0) return;
    const key = `${fromId}|${toId}`;
    const rkey = `${toId}|${fromId}`;
    const existing = debt[key] || 0;
    if (cents <= existing) {
      debt[key] = existing - cents;
      if (debt[key] === 0) delete debt[key];
    } else {
      const excess = cents - existing;
      delete debt[key];
      debt[rkey] = (debt[rkey] || 0) + excess;
    }
  };

  expenses.forEach((expense) => {
    const spenderKey = expense.spenderId.toString();
    const shares = computeSharesCents(expense);
    shares.forEach(({ memberId, shareCents }) => {
      if (memberId !== spenderKey) add(memberId, spenderKey, shareCents);
    });
  });

  settlementExpenses.forEach((expense) => {
    if (!expense.splitDetails?.length) return;
    const payerKey = expense.spenderId.toString();
    const beneficiaryKey = expense.splitDetails[0].member.toString();
    settle(payerKey, beneficiaryKey, toCents(expense.amount));
  });

  // Net out mutual debts within each unordered pair.
  const out = [];
  const seen = new Set();
  for (const key of Object.keys(debt)) {
    const [a, b] = key.split("|");
    const pairKey = [a, b].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const forward = debt[`${a}|${b}`] || 0;
    const reverse = debt[`${b}|${a}`] || 0;
    const net = forward - reverse;
    if (net > 0) out.push({ fromId: a, toId: b, cents: net });
    else if (net < 0) out.push({ fromId: b, toId: a, cents: -net });
  }

  // Stable sort for deterministic output.
  out.sort((a, b) => b.cents - a.cents || a.fromId.localeCompare(b.fromId));
  return out;
};

// Greedy debt simplification: given net balances per member (in cents),
// produce a minimal-ish list of transfers that brings every balance to
// zero. Cycle-free by construction: each transfer always closes at
// least one party's balance.
//
// (Min-transactions is NP-hard in the general case; this greedy is what
// Splitwise et al. use and is provably correct — sum of balances is 0
// and each step removes at least one party, so we terminate in <= N-1
// transfers.)
const simplifyDebtsCents = (balancesCents) => {
  // Sort deterministically: largest abs balance first, ties broken by id.
  const creditors = Object.entries(balancesCents)
    .filter(([, c]) => c > 0)
    .map(([id, c]) => ({ id, cents: c }))
    .sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));

  const debtors = Object.entries(balancesCents)
    .filter(([, c]) => c < 0)
    .map(([id, c]) => ({ id, cents: -c }))
    .sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));

  const settlements = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const cred = creditors[ci];
    const deb = debtors[di];
    const amt = Math.min(cred.cents, deb.cents);

    if (amt > 0) {
      settlements.push({
        fromId: deb.id,
        toId: cred.id,
        cents: amt,
      });
    }

    cred.cents -= amt;
    deb.cents -= amt;
    if (cred.cents === 0) ci += 1;
    if (deb.cents === 0) di += 1;
  }

  return settlements;
};

export const getGroupStats = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate("members");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const memberNameMap = new Map(
      group.members.map((m) => [m._id.toString(), m.name])
    );
    const getName = (id) =>
      memberNameMap.get(id?.toString?.()) || "Unknown member";

    // Initialize per-member stat record for every current group member.
    const memberStats = {};
    const ensureMember = (id) => {
      const key = id.toString();
      if (!memberStats[key]) {
        memberStats[key] = {
          _id: key,
          name: getName(key),
          totalPaid: 0,      // sum of amounts they paid out
          totalShare: 0,     // sum of their share of expenses (incl. own)
          netBalance: 0,     // totalPaid - totalShare (in rupees, signed)
          // Legacy compat for older clients:
          totalSpent: 0,
          totalSpentOnSelfAndByOthers: 0,
          owe: {},
          lent: {},
        };
      }
      return memberStats[key];
    };

    group.members.forEach((m) => ensureMember(m._id));

    // Work in integer cents to keep arithmetic exact.
    const paidCents = {};   // memberId -> cents paid out
    const shareCents = {};  // memberId -> cents owed (their consumption)

    const bump = (bucket, id, c) => {
      bucket[id] = (bucket[id] || 0) + c;
    };

    // ------------------------------------------------------------------
    // Pass 1: regular expenses (settlementExpense !== true)
    // ------------------------------------------------------------------
    const expenses = await Expense.find({
      groupId,
      settlementExpense: { $ne: true },
    });

    let totalSpentCents = 0;
    const categoryCents = {};

    expenses.forEach((expense) => {
      const { amount, category, spenderId } = expense;
      const spenderKey = spenderId.toString();
      ensureMember(spenderKey);

      const amountCents = toCents(amount);
      totalSpentCents += amountCents;
      bump(paidCents, spenderKey, amountCents);

      if (category) {
        categoryCents[category] = (categoryCents[category] || 0) + amountCents;
      }

      const shares = computeSharesCents(expense);
      shares.forEach(({ memberId, shareCents: sc }) => {
        ensureMember(memberId);
        bump(shareCents, memberId, sc);
      });
    });

    // ------------------------------------------------------------------
    // Pass 2: settlement expenses. A settlement is "X paid Y N" — it
    // affects balances exactly like any expense where Y consumed N and
    // X paid N, but it doesn't count toward group totalSpent / categories.
    // ------------------------------------------------------------------
    const settlementExpenses = await Expense.find({
      groupId,
      settlementExpense: true,
    });

    settlementExpenses.forEach((expense) => {
      const { amount, spenderId, splitDetails } = expense;
      if (!splitDetails?.length) return;
      const payerKey = spenderId.toString();
      const beneficiaryKey = splitDetails[0].member.toString();
      ensureMember(payerKey);
      ensureMember(beneficiaryKey);

      const c = toCents(amount);
      bump(paidCents, payerKey, c);
      bump(shareCents, beneficiaryKey, c);
    });

    // ------------------------------------------------------------------
    // Compute net balances per member, in cents.
    // Positive = owed money (creditor); Negative = owes money (debtor).
    // ------------------------------------------------------------------
    const balancesCents = {};
    Object.keys(memberStats).forEach((id) => {
      const paid = paidCents[id] || 0;
      const owed = shareCents[id] || 0;
      const net = paid - owed;
      balancesCents[id] = net;

      const stat = memberStats[id];
      stat.totalPaid = toRupees(paid);
      stat.totalShare = toRupees(owed);
      stat.netBalance = toRupees(net);
      // Legacy fields kept in sync:
      stat.totalSpent = stat.totalPaid;
      stat.totalSpentOnSelfAndByOthers = stat.totalShare;
    });

    // ------------------------------------------------------------------
    // Direct (pair-wise) view — settlements that mirror actual expense
    // history between two people. Default view in the UI.
    // ------------------------------------------------------------------
    const directRaw = computeDirectDebtsCents(expenses, settlementExpenses);
    const directSettlements = directRaw.map((s) => ({
      fromId: s.fromId,
      fromName: getName(s.fromId),
      toId: s.toId,
      toName: getName(s.toId),
      amount: toRupees(s.cents),
    }));

    // ------------------------------------------------------------------
    // Simplified view — minimum-transaction set via greedy debt
    // simplification. May introduce transfers between people who never
    // directly shared an expense, so it's opt-in in the UI.
    // ------------------------------------------------------------------
    const rawSettlements = simplifyDebtsCents(balancesCents);
    const settlements = rawSettlements.map((s) => ({
      fromId: s.fromId,
      fromName: getName(s.fromId),
      toId: s.toId,
      toName: getName(s.toId),
      amount: toRupees(s.cents),
    }));

    // Mirror the direct settlements into memberStats[].owe/.lent so older
    // clients show the intuitive "who owes whom" rather than the greedy
    // re-routed pairs.
    directSettlements.forEach((s) => {
      memberStats[s.fromId].owe[s.toId] = {
        name: s.toName,
        amount: s.amount,
      };
      memberStats[s.toId].lent[s.fromId] = {
        name: s.fromName,
        amount: s.amount,
      };
    });

    res.status(200).json({
      groupId,
      totalSpent: toRupees(totalSpentCents),
      expenseCount: expenses.length,
      categoryWiseSpendings: Object.fromEntries(
        Object.entries(categoryCents).map(([k, c]) => [k, toRupees(c)])
      ),
      memberStats,
      directSettlements,
      settlements,
    });
  } catch (error) {
    console.error("Error in getGroupStats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
