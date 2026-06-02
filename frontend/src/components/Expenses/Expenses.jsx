import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import "./Expenses.scss";
import Chart from "react-apexcharts";
import { fetchGroupStats } from "../../store/statsSlice";
import { addExpense, getAllExpenses } from "../../store/expenseSlice";
import { toast } from "react-toastify";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrentGroup } from "../../hooks/useCurrentGroup";
import { useScope } from "../../hooks/useScope";
import GroupSelector from "../shared/GroupSelector/GroupSelector";
import ScopeToggle from "../shared/ScopeToggle/ScopeToggle";
import PersonalReport from "../Personal/PersonalReport";
import { getPersonal } from "../../store/personalSlice";
import Fab from "../shared/Fab/Fab";
import QuickAddExpense from "../QuickAddExpense/QuickAddExpense";
import { getCurrencySymbol, formatMoney } from "../../utils/currency";
import {
  FaArrowRight,
  FaArrowLeft,
  FaChartPie,
  FaCoins,
  FaUsers,
  FaHandshake,
  FaCheckCircle,
  FaExchangeAlt,
  FaListUl,
  FaTimes,
  FaChevronDown,
  FaCheck,
} from "react-icons/fa";

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const CHART_PALETTE = [
  "#6e1a6e",
  "#b366b3",
  "#c04bc0",
  "#55c155",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

// Returns true when the viewport is phone-sized. Used to render charts
// at a tighter height so the report fits in one screen.
const usePhone = () => {
  const [match, setMatch] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 640px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setMatch(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return match;
};

const Expenses = () => {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.group);
  const { stats, loading } = useSelector((state) => state.stats);
  const { expenses } = useSelector((state) => state.expense);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isPhone = usePhone();
  const chartHeight = isPhone ? 200 : 320;

  const [selectedGroup, setSelectedGroup] = useCurrentGroup();
  const [scope, setScope] = useScope();
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);
  const [payer, setPayer] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleSaving, setSettleSaving] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);
  // Two views only: "simplified" (greedy minimum-transaction set, the
  // default) and "simple" (pair-wise "Direct" view that mirrors the real
  // expense history). Same balances, two ways of paying it off.
  const [settleView, setSettleView] = useState("simplified");
  const [payerOpen, setPayerOpen] = useState(false);
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);
  const payerRef = useRef(null);
  const beneficiaryRef = useRef(null);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  // Load the personal feed for the Personal report.
  useEffect(() => {
    if (scope === "personal") dispatch(getPersonal());
  }, [scope, dispatch]);

  // Only fetch once we've confirmed the selected group is actually one
  // the current user belongs to. A group id can linger in localStorage
  // from a previous session/account; fetching it would 403/404 and spam
  // "failed to load" toasts at a user who did nothing wrong.
  useEffect(() => {
    if (selectedGroup && groups.some((g) => g._id === selectedGroup)) {
      dispatch(fetchGroupStats(selectedGroup));
      dispatch(getAllExpenses(selectedGroup));
    }
  }, [selectedGroup, groups, dispatch]);

  const handleGroupChange = (id) => {
    setSelectedGroup(id);
    setExpandedMember(null);
  };

  const group = groups.find((g) => g._id === selectedGroup);
  const members = group?.members || [];
  // Amounts render in the GROUP's currency (chosen by the owner at
  // creation) — never the viewer's personal preference.
  const symbol = getCurrencySymbol(group?.currency);

  // ---------- Derived data ----------
  const pieData = useMemo(() => {
    if (!stats?.memberStats) return [];
    return Object.values(stats.memberStats).map((m) => ({
      name: m.name,
      value: Number(m.totalSpentOnSelfAndByOthers || m.totalShare || 0),
    }));
  }, [stats]);

  const barContributions = useMemo(() => {
    if (!stats?.memberStats) return [];
    return Object.values(stats.memberStats).map((m) => ({
      name: m.name,
      value: Number(m.totalSpent || m.totalPaid || 0),
    }));
  }, [stats]);

  const categoryData = useMemo(() => {
    if (!stats?.categoryWiseSpendings) return [];
    return Object.entries(stats.categoryWiseSpendings)
      .map(([k, v]) => ({ name: k, value: Number(v || 0) }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const simpleSettlements = useMemo(() => {
    return (stats?.directSettlements || [])
      .filter((s) => Number(s.amount) > 0)
      .map((s) => ({
        fromId: s.fromId,
        fromName: s.fromName,
        toId: s.toId,
        toName: s.toName,
        amount: Number(s.amount),
      }));
  }, [stats]);

  const simplifiedSettlements = useMemo(() => {
    return (stats?.settlements || [])
      .filter((s) => Number(s.amount) > 0)
      .map((s) => ({
        fromId: s.fromId,
        fromName: s.fromName,
        toId: s.toId,
        toName: s.toName,
        amount: Number(s.amount),
      }));
  }, [stats]);

  // Only offer the toggle if simplifying actually reduces transactions.
  const canSimplify =
    simplifiedSettlements.length > 0 &&
    simplifiedSettlements.length < simpleSettlements.length;

  const oweData =
    settleView === "simplified" && canSimplify
      ? simplifiedSettlements
      : simpleSettlements;

  const balanceRows = useMemo(() => {
    if (!stats?.memberStats) return [];
    return Object.values(stats.memberStats)
      .map((m) => ({
        id: m._id,
        name: m.name,
        netBalance: Number(
          m.netBalance ??
            Number(m.totalPaid || 0) - Number(m.totalShare || 0)
        ),
        totalPaid: Number(m.totalPaid || m.totalSpent || 0),
        totalShare: Number(
          m.totalShare || m.totalSpentOnSelfAndByOthers || 0
        ),
      }))
      .sort((a, b) => b.netBalance - a.netBalance);
  }, [stats]);

  const totalOutstanding = useMemo(
    () => oweData.reduce((sum, s) => sum + s.amount, 0),
    [oweData]
  );

  // Group settlements by payer so a person's outgoing payments are all
  // visible in one place. (No "owed back" footer here — the Net balances
  // section above already shows each person's true net, so users can
  // reconcile if they're also owed money in a separate row.)
  const groupedByPayer = useMemo(() => {
    const map = new Map();
    for (const s of oweData) {
      if (!map.has(s.fromId)) {
        map.set(s.fromId, {
          fromId: s.fromId,
          fromName: s.fromName,
          items: [],
          total: 0,
        });
      }
      const entry = map.get(s.fromId);
      entry.items.push(s);
      entry.total += Number(s.amount || 0);
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.total - a.total);
  }, [oweData]);

  const totalSpent = Number(stats?.totalSpent || 0);
  const expenseCount = stats?.expenseCount ?? stats?.totalExpenses ?? null;
  const topCategory = categoryData[0];

  // For an expanded balance row: break down exactly what a person lent
  // (covered other people's shares) and what they borrowed (their share
  // in expenses paid by others). Each row is one (expense × counterparty)
  // atom, so the user sees "for what" and "for whom" line by line.
  // Settlement expenses are excluded — they're cash transfers, not shared
  // consumption.
  const breakdownForMember = (memberId) => {
    if (!expenses || expenses.length === 0) {
      return { lent: [], borrowed: [], lentTotal: 0, borrowedTotal: 0 };
    }
    const lent = [];
    const borrowed = [];
    for (const e of expenses) {
      if (e.settlementExpense) continue;
      const spenderKey =
        (e.spenderId?._id || e.spenderId)?.toString?.() || "";
      const spenderName = e.spenderName || e.spenderId?.name || "—";
      for (const sd of e.splitDetails || []) {
        const splitKey =
          (sd.memberId?._id || sd.memberId)?.toString?.() || "";
        const splitName = sd.memberName || sd.memberId?.name || "—";
        const amt = Number(sd.amount || 0);
        if (amt <= 0) continue;
        if (spenderKey === memberId && splitKey !== memberId) {
          lent.push({
            counterpartyId: splitKey,
            counterpartyName: splitName,
            description: e.description || e.category || "Expense",
            amount: amt,
          });
        } else if (spenderKey !== memberId && splitKey === memberId) {
          borrowed.push({
            counterpartyId: spenderKey,
            counterpartyName: spenderName,
            description: e.description || e.category || "Expense",
            amount: amt,
          });
        }
      }
    }
    lent.sort((a, b) => b.amount - a.amount);
    borrowed.sort((a, b) => b.amount - a.amount);
    const lentTotal = lent.reduce((s, x) => s + x.amount, 0);
    const borrowedTotal = borrowed.reduce((s, x) => s + x.amount, 0);
    return { lent, borrowed, lentTotal, borrowedTotal };
  };

  // ---------- Chart options (theme-aware) ----------
  const baseChartOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        fontFamily: "Poppins, sans-serif",
        background: "transparent",
        animations: { enabled: true, easing: "easeinout", speed: 500 },
      },
      theme: { mode: isDark ? "dark" : "light" },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (v) => `${symbol}${formatMoney(v)}` },
      },
      grid: {
        borderColor: isDark ? "#2e2e3e" : "#e0e0e0",
        strokeDashArray: 4,
      },
      colors: CHART_PALETTE,
    }),
    [isDark, symbol]
  );

  const donutOptions = useMemo(
    () => ({
      ...baseChartOptions,
      labels: pieData.map((p) => p.name),
      legend: {
        position: "bottom",
        labels: { colors: isDark ? "#b8b8c8" : "#555" },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total spent",
                color: isDark ? "#b8b8c8" : "#757575",
                fontSize: "12px",
                formatter: () => `${symbol}${formatMoney(totalSpent)}`,
              },
              value: {
                color: isDark ? "#e8e8f0" : "#1a1a1a",
                fontSize: "20px",
                fontWeight: 700,
              },
            },
          },
        },
      },
      stroke: { width: 0 },
      dataLabels: { enabled: false },
    }),
    [baseChartOptions, pieData, totalSpent, isDark, symbol]
  );

  const contributionsOptions = useMemo(
    () => ({
      ...baseChartOptions,
      chart: { ...baseChartOptions.chart, type: "bar" },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "55%",
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: {
        categories: barContributions.map((b) => b.name),
        labels: { style: { colors: isDark ? "#b8b8c8" : "#555" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: isDark ? "#b8b8c8" : "#555" },
          formatter: (v) => `${symbol}${Math.round(v)}`,
        },
      },
    }),
    [baseChartOptions, barContributions, isDark, symbol]
  );

  const categoryOptions = useMemo(
    () => ({
      ...baseChartOptions,
      chart: { ...baseChartOptions.chart, type: "bar" },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: true,
          barHeight: "60%",
          distributed: true,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (v) => `${symbol}${formatMoney(v)}`,
        style: { fontSize: "11px", colors: ["#fff"] },
      },
      legend: { show: false },
      xaxis: {
        categories: categoryData.map((c) => c.name),
        labels: { style: { colors: isDark ? "#b8b8c8" : "#555" } },
      },
      yaxis: {
        labels: { style: { colors: isDark ? "#b8b8c8" : "#555" } },
      },
    }),
    [baseChartOptions, categoryData, isDark, symbol]
  );

  // ---------- Settle handlers ----------
  const openSettle = (entry = null) => {
    if (entry) {
      setPayer(entry.fromId);
      setBeneficiary(entry.toId);
      setSettleAmount(String(entry.amount));
      setSettlePrefill(entry);
    } else {
      setPayer("");
      setBeneficiary("");
      setSettleAmount("");
      setSettlePrefill(null);
    }
    setSettleOpen(true);
  };

  const closeSettle = () => {
    setSettleOpen(false);
    setSettlePrefill(null);
    setPayerOpen(false);
    setBeneficiaryOpen(false);
  };

  // Click-outside handlers for dropdowns
  useEffect(() => {
    if (!payerOpen) return;
    const handler = (e) => {
      if (payerRef.current && !payerRef.current.contains(e.target)) {
        setPayerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [payerOpen]);

  useEffect(() => {
    if (!beneficiaryOpen) return;
    const handler = (e) => {
      if (beneficiaryRef.current && !beneficiaryRef.current.contains(e.target)) {
        setBeneficiaryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [beneficiaryOpen]);

  const handleSettleSubmit = (e) => {
    e?.preventDefault?.();
    if (!payer || !beneficiary || !settleAmount) {
      toast.error("Fill all fields to settle.");
      return;
    }
    if (payer === beneficiary) {
      toast.error("Payer and beneficiary can't be the same.");
      return;
    }
    const expenseData = {
      settlementExpense: true,
      groupId: selectedGroup,
      amount: parseFloat(settleAmount),
      description: "settleUp",
      category: "Others",
      spenderId: payer,
      splitDetails: [
        { member: beneficiary, amount: parseFloat(settleAmount) },
      ],
      splitType: "unequally",
    };
    setSettleSaving(true);
    dispatch(addExpense(expenseData))
      .then((action) => {
        if (action.meta.requestStatus === "fulfilled") {
          closeSettle();
          dispatch(fetchGroupStats(selectedGroup));
          dispatch(getAllExpenses(selectedGroup));
        } else {
          // e.g. a member trying to settle a pair they're not part of —
          // the server rejects it; surface that instead of silently closing.
          toast.error(
            action.payload?.message || "Couldn't record this settlement."
          );
        }
      })
      .finally(() => setSettleSaving(false));
  };

  // ---------- Render ----------
  return (
    <div className="reports">
      <div className="reports__bg" aria-hidden>
        <div className="reports__grid" />
      </div>

      <header className="reports__topbar">
        <div className="reports__crumbs">
          <span>Dashboard</span>
          <FaArrowRight />
          <span className="active">Reports</span>
        </div>
        <h1 className="reports__title">
          {scope === "personal" ? "My spending" : "Reports"}
        </h1>
        <p className="reports__subtitle">
          {scope === "personal"
            ? "Your own spending this month, at a glance."
            : "See where the money went and who still owes what."}
        </p>
      </header>

      <div className="reports__group-row">
        <ScopeToggle scope={scope} onChange={setScope} />
        {scope === "group" && (
          <GroupSelector
            groups={groups}
            selectedId={selectedGroup}
            onSelect={handleGroupChange}
          />
        )}
      </div>

      {scope === "personal" ? (
        <PersonalReport />
      ) : !group ? (
        <div className="reports__placeholder">
          <div className="reports__placeholder-icon">
            <FaChartPie />
          </div>
          <h3>Pick a group to see its report</h3>
          <p>Spending, who paid what, and outstanding balances.</p>
        </div>
      ) : loading && !stats ? (
        <div className="reports__placeholder">
          <div className="reports__spinner" />
          <p>Loading report...</p>
        </div>
      ) : (
        <>
          {/* ---------- KPI tiles ---------- */}
          <section className="reports__kpis">
            <div className="reports__kpi">
              <div className="reports__kpi-icon reports__kpi-icon--brand">
                <FaCoins />
              </div>
              <div>
                <span className="reports__kpi-label">Total spent</span>
                <strong className="reports__kpi-value">
                  {symbol}{formatMoney(totalSpent)}
                </strong>
              </div>
            </div>

            <div className="reports__kpi">
              <div className="reports__kpi-icon reports__kpi-icon--green">
                <FaUsers />
              </div>
              <div>
                <span className="reports__kpi-label">Members</span>
                <strong className="reports__kpi-value">{members.length}</strong>
              </div>
            </div>

            {expenseCount !== null && (
              <div className="reports__kpi">
                <div className="reports__kpi-icon reports__kpi-icon--blue">
                  <FaListUl />
                </div>
                <div>
                  <span className="reports__kpi-label">Expenses</span>
                  <strong className="reports__kpi-value">
                    {expenseCount}
                  </strong>
                </div>
              </div>
            )}

            {topCategory && (
              <div className="reports__kpi">
                <div className="reports__kpi-icon reports__kpi-icon--orange">
                  <FaChartPie />
                </div>
                <div>
                  <span className="reports__kpi-label">Top category</span>
                  <strong className="reports__kpi-value">
                    {topCategory.name}
                  </strong>
                </div>
              </div>
            )}

            <div className="reports__kpi">
              <div className="reports__kpi-icon reports__kpi-icon--red">
                <FaHandshake />
              </div>
              <div>
                <span className="reports__kpi-label">Outstanding</span>
                <strong className="reports__kpi-value">
                  {symbol}{formatMoney(totalOutstanding)}
                </strong>
              </div>
            </div>
          </section>

          {/* ---------- Net balances (flat) ---------- */}
          {balanceRows.length > 0 && (
            <section className="reports__section">
              <div className="reports__section-head">
                <div>
                  <h2>
                    <FaUsers /> Net balances
                  </h2>
                  <p>What each person paid vs. their share.</p>
                </div>
              </div>

              <ul className="reports__balances">
                {balanceRows.map((row) => {
                  const bal = row.netBalance;
                  const isOwed = bal > 0.005;
                  const owes = bal < -0.005;
                  const isOpen = expandedMember === row.id;
                  const { lent, borrowed, lentTotal, borrowedTotal } = isOpen
                    ? breakdownForMember(row.id)
                    : { lent: [], borrowed: [], lentTotal: 0, borrowedTotal: 0 };
                  return (
                    <li key={row.id} className="reports__balance-item">
                      <button
                        type="button"
                        className={`reports__balance-row ${
                          isOpen ? "reports__balance-row--open" : ""
                        }`}
                        onClick={() =>
                          setExpandedMember(isOpen ? null : row.id)
                        }
                        aria-expanded={isOpen}
                      >
                        <span className="reports__settle-avatar">
                          {initials(row.name)}
                        </span>
                        <div className="reports__balance-meta">
                          <strong>{row.name}</strong>
                          <small>
                            paid {symbol}{formatMoney(row.totalPaid)} · share {symbol}
                            {formatMoney(row.totalShare)}
                          </small>
                        </div>

                        {isOwed ? (
                          <span className="reports__balance-amt reports__balance-amt--pos">
                            + {symbol}{formatMoney(bal)}
                            <small>is owed</small>
                          </span>
                        ) : owes ? (
                          <span className="reports__balance-amt reports__balance-amt--neg">
                            − {symbol}{formatMoney(Math.abs(bal))}
                            <small>owes</small>
                          </span>
                        ) : (
                          <span className="reports__balance-amt reports__balance-amt--zero">
                            settled
                          </span>
                        )}

                        <span
                          className="reports__balance-chev"
                          aria-hidden
                        >
                          <FaChevronDown />
                        </span>
                      </button>

                      {isOpen && (
                        <div className="reports__balance-drill">
                          <div className="reports__balance-drill-col reports__balance-drill-col--out">
                            <h4>
                              <FaArrowRight />
                              Lent
                              <em>{symbol}{formatMoney(lentTotal)}</em>
                            </h4>
                            {lent.length === 0 ? (
                              <p className="reports__balance-drill-empty">
                                {row.name} hasn&apos;t paid for anyone else.
                              </p>
                            ) : (
                              <ul>
                                {lent.map((x, i) => (
                                  <li key={i}>
                                    <span className="reports__balance-drill-name">
                                      {x.counterpartyName}
                                    </span>
                                    <span className="reports__balance-drill-for">
                                      {x.description}
                                    </span>
                                    <strong>{symbol}{formatMoney(x.amount)}</strong>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="reports__balance-drill-col reports__balance-drill-col--in">
                            <h4>
                              <FaArrowLeft />
                              Borrowed
                              <em>{symbol}{formatMoney(borrowedTotal)}</em>
                            </h4>
                            {borrowed.length === 0 ? (
                              <p className="reports__balance-drill-empty">
                                Nobody covered any expenses for {row.name}.
                              </p>
                            ) : (
                              <ul>
                                {borrowed.map((x, i) => (
                                  <li key={i}>
                                    <span className="reports__balance-drill-name">
                                      {x.counterpartyName}
                                    </span>
                                    <span className="reports__balance-drill-for">
                                      {x.description}
                                    </span>
                                    <strong>{symbol}{formatMoney(x.amount)}</strong>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ---------- Settlements (flat list, simple vs simplified) ---------- */}
          <section className="reports__section">
            <div className="reports__section-head">
              <div>
                <h2>
                  <FaHandshake /> Settle up
                </h2>
                {oweData.length === 0 ? (
                  <p>All settled — nice work.</p>
                ) : settleView === "simplified" ? (
                  <p>
                    Fewest payments to clear all balances.
                  </p>
                ) : (
                  <p>
                    Every payment matches an expense the two people shared.
                  </p>
                )}
              </div>
              {oweData.length > 0 && (
                <button
                  type="button"
                  className="reports__settle-cta"
                  onClick={() => openSettle()}
                >
                  <FaExchangeAlt /> Record a settlement
                </button>
              )}
            </div>

            {canSimplify && (
              <div className="reports__settle-toggle" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={settleView === "simplified"}
                  className={`reports__settle-tab ${
                    settleView === "simplified"
                      ? "reports__settle-tab--active"
                      : ""
                  }`}
                  onClick={() => setSettleView("simplified")}
                  title={`Reduce to ${simplifiedSettlements.length} payments`}
                >
                  Simplified
                  <span>{simplifiedSettlements.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={settleView === "simple"}
                  className={`reports__settle-tab ${
                    settleView === "simple"
                      ? "reports__settle-tab--active"
                      : ""
                  }`}
                  onClick={() => setSettleView("simple")}
                >
                  Direct
                  <span>{simpleSettlements.length}</span>
                </button>
              </div>
            )}

            {oweData.length === 0 ? (
              <div className="reports__settled">
                <FaCheckCircle />
                <span>Everyone is even.</span>
              </div>
            ) : (
              <div className="reports__settle-groups">
                {groupedByPayer.map((g) => (
                  <div key={g.fromId} className="reports__settle-group">
                    <div className="reports__settle-group-head">
                      <span className="reports__settle-avatar">
                        {initials(g.fromName)}
                      </span>
                      <div className="reports__settle-group-meta">
                        <strong>{g.fromName}</strong>
                        <small>
                          pays {g.items.length}{" "}
                          {g.items.length === 1 ? "person" : "people"}
                        </small>
                      </div>
                      <span className="reports__settle-group-total">
                        {symbol}{formatMoney(g.total)}
                      </span>
                    </div>

                    <ul className="reports__settle-items">
                      {g.items.map((item) => (
                        <li
                          key={item.toId}
                          className="reports__settle-item"
                        >
                          <FaArrowRight />
                          <span className="reports__settle-avatar reports__settle-avatar--alt">
                            {initials(item.toName)}
                          </span>
                          <span className="reports__settle-item-name">
                            {item.toName}
                          </span>
                          <strong className="reports__settle-item-amt">
                            {symbol}{formatMoney(item.amount)}
                          </strong>
                          <button
                            type="button"
                            className="reports__settle-action"
                            onClick={() => openSettle(item)}
                          >
                            Settle
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---------- Charts ---------- */}
          <section className="reports__charts">
            {pieData.length > 0 && (
              <div className="reports__chart">
                <div className="reports__chart-head">
                  <h3>Where money went</h3>
                </div>
                <Chart
                  options={donutOptions}
                  series={pieData.map((p) => p.value)}
                  type="donut"
                  height={chartHeight}
                />
              </div>
            )}

            {barContributions.length > 0 && (
              <div className="reports__chart">
                <div className="reports__chart-head">
                  <h3>Who paid what</h3>
                </div>
                <Chart
                  options={contributionsOptions}
                  series={[
                    {
                      name: "Contributed",
                      data: barContributions.map((b) => b.value),
                    },
                  ]}
                  type="bar"
                  height={chartHeight}
                />
              </div>
            )}

            {categoryData.length > 0 && (
              <div className="reports__chart reports__chart--wide">
                <div className="reports__chart-head">
                  <h3>By category</h3>
                </div>
                <Chart
                  options={categoryOptions}
                  series={[
                    {
                      name: "Spending",
                      data: categoryData.map((c) => c.value),
                    },
                  ]}
                  type="bar"
                  height={Math.max(
                    isPhone ? 180 : 220,
                    categoryData.length * (isPhone ? 28 : 36) +
                      (isPhone ? 40 : 60)
                  )}
                />
              </div>
            )}
          </section>
        </>
      )}

      {/* ---------- Settle modal ---------- */}
      {settleOpen && (
        <div
          className="reports__modal-overlay"
          onClick={closeSettle}
          role="dialog"
        >
          <form
            className="reports__modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSettleSubmit}
          >
            <div className="reports__modal-head">
              <h3>{settlePrefill ? "Settle balance" : "Record a settlement"}</h3>
              <button
                type="button"
                onClick={closeSettle}
                aria-label="Close"
                className="reports__modal-close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="ng-field">
              <label>Who paid</label>
              <div className="reports__modal-dd" ref={payerRef}>
                <button
                  type="button"
                  className={`reports__modal-dd-trigger ${
                    payerOpen ? "reports__modal-dd-trigger--open" : ""
                  }`}
                  onClick={() => setPayerOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={payerOpen}
                >
                  <span className="reports__modal-dd-label">
                    {payer ? members.find((m) => m._id === payer)?.name : "Select member"}
                  </span>
                  <FaChevronDown className="reports__modal-dd-chev" />
                </button>
                {payerOpen && (
                  <div className="reports__modal-dd-menu" role="listbox">
                    {members.map((m) => {
                      const selected = payer === m._id;
                      return (
                        <button
                          type="button"
                          key={m._id}
                          role="option"
                          aria-selected={selected}
                          className={`reports__modal-dd-opt ${
                            selected ? "reports__modal-dd-opt--selected" : ""
                          }`}
                          onClick={() => {
                            setPayer(m._id);
                            setPayerOpen(false);
                          }}
                        >
                          <span className="reports__modal-dd-avatar">
                            {initials(m.name)}
                          </span>
                          <span className="reports__modal-dd-opt-name">{m.name}</span>
                          {selected && (
                            <FaCheck className="reports__modal-dd-opt-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="ng-field">
              <label>Who received</label>
              <div className="reports__modal-dd" ref={beneficiaryRef}>
                <button
                  type="button"
                  className={`reports__modal-dd-trigger ${
                    beneficiaryOpen ? "reports__modal-dd-trigger--open" : ""
                  }`}
                  onClick={() => setBeneficiaryOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={beneficiaryOpen}
                >
                  <span className="reports__modal-dd-label">
                    {beneficiary ? members.find((m) => m._id === beneficiary)?.name : "Select member"}
                  </span>
                  <FaChevronDown className="reports__modal-dd-chev" />
                </button>
                {beneficiaryOpen && (
                  <div className="reports__modal-dd-menu" role="listbox">
                    {members.map((m) => {
                      const selected = beneficiary === m._id;
                      return (
                        <button
                          type="button"
                          key={m._id}
                          role="option"
                          aria-selected={selected}
                          className={`reports__modal-dd-opt ${
                            selected ? "reports__modal-dd-opt--selected" : ""
                          }`}
                          onClick={() => {
                            setBeneficiary(m._id);
                            setBeneficiaryOpen(false);
                          }}
                        >
                          <span className="reports__modal-dd-avatar">
                            {initials(m.name)}
                          </span>
                          <span className="reports__modal-dd-opt-name">{m.name}</span>
                          {selected && (
                            <FaCheck className="reports__modal-dd-opt-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="ng-field">
              <label>Amount</label>
              <input
                type="number"
                inputMode="decimal"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="ng-actions">
              <button
                type="button"
                className="ng-btn ng-btn--ghost"
                onClick={closeSettle}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ng-btn ng-btn--primary"
                disabled={settleSaving}
              >
                {settleSaving ? <span className="btn-spinner" /> : <FaCheckCircle />}{" "}
                {settleSaving ? "Settling…" : "Settle"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- Quick add FAB (group scope only) ---------- */}
      {scope === "group" && (
        <>
          <Fab
            onClick={() => setQuickAddOpen(true)}
            disabled={!group || members.length === 0}
          />
          <QuickAddExpense
            open={quickAddOpen}
            onClose={() => setQuickAddOpen(false)}
            group={group}
          />
        </>
      )}
    </div>
  );
};

export default Expenses;
