import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import "./expenseList.scss";
import ExpenseCard from "./ExpenseItem/expenseItem";
import { getAllExpenses } from "../../store/expenseSlice";
import GroupSelector from "../shared/GroupSelector/GroupSelector";
import { useCurrentGroup } from "../../hooks/useCurrentGroup";
import Fab from "../shared/Fab/Fab";
import QuickAddExpense from "../QuickAddExpense/QuickAddExpense";
import {
  FaArrowRight,
  FaSearch,
  FaTimes,
  FaListUl,
  FaSortAmountDown,
  FaSortAmountUp,
  FaCalendarAlt,
} from "react-icons/fa";

import { ALL_CATEGORIES } from "../../utils/categoryInfer";

const CATEGORIES = ["All", ...ALL_CATEGORIES];

const SORTS = [
  { key: "newest", label: "Newest first", icon: <FaCalendarAlt /> },
  { key: "highest", label: "Amount: high → low", icon: <FaSortAmountDown /> },
  { key: "lowest", label: "Amount: low → high", icon: <FaSortAmountUp /> },
];

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ExpenseListPage = () => {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.group);
  const { expenses, loading } = useSelector((state) => state.expense);

  const [selectedGroup, setSelectedGroup] = useCurrentGroup();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  useEffect(() => {
    if (selectedGroup) dispatch(getAllExpenses(selectedGroup));
  }, [selectedGroup, dispatch]);

  const handleGroupChange = (id) => {
    setSelectedGroup(id);
  };

  const currentGroup = groups.find((g) => g._id === selectedGroup);

  const filtered = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    let list = [...expenses];
    if (activeCategory !== "All") {
      list = list.filter(
        (e) =>
          (e.category || "").toLowerCase() === activeCategory.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.spenderName?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }
    if (sort === "highest") list.sort((a, b) => b.amount - a.amount);
    else if (sort === "lowest") list.sort((a, b) => a.amount - b.amount);
    else
      list.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    return list;
  }, [expenses, activeCategory, search, sort]);

  const total = useMemo(
    () => filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filtered]
  );

  const hasGroup = Boolean(selectedGroup);
  const hasExpenses = expenses && expenses.length > 0;

  return (
    <div className="expList">
      <div className="expList__bg" aria-hidden>
        <div className="expList__grid" />
      </div>

      <header className="expList__topbar">
        <div className="expList__crumbs">
          <span>Dashboard</span>
          <FaArrowRight />
          <span className="active">Expense list</span>
        </div>
        <h1 className="expList__title">All expenses</h1>
        <p className="expList__subtitle">
          Browse, filter, and inspect every expense in the group.
        </p>
      </header>

      <div className="expList__group-row">
        <GroupSelector
          groups={groups}
          selectedId={selectedGroup}
          onSelect={handleGroupChange}
        />
      </div>

      {!hasGroup ? (
        <div className="expList__placeholder">
          <div className="expList__placeholder-icon">
            <FaListUl />
          </div>
          <h3>Pick a group to see its expenses</h3>
          <p>Once you pick a group, every expense logged in it shows up here.</p>
        </div>
      ) : (
        <>
          <div className="expList__filters">
            <div className="expList__search">
              <FaSearch />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, spender, or category…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="expList__sort">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`expList__sort-btn ${
                    sort === s.key ? "expList__sort-btn--active" : ""
                  }`}
                  onClick={() => setSort(s.key)}
                  title={s.label}
                  aria-label={s.label}
                  aria-pressed={sort === s.key}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="expList__categories">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`expList__cat ${
                  activeCategory === c ? "expList__cat--active" : ""
                }`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {hasExpenses && (
            <div className="expList__summary-bar">
              <div>
                <span className="expList__summary-label">Showing</span>
                <strong>
                  {filtered.length} of {expenses.length}
                </strong>
              </div>
              <div>
                <span className="expList__summary-label">
                  Total in view
                </span>
                <strong className="expList__summary-amount">
                  ₹{formatMoney(total)}
                </strong>
              </div>
            </div>
          )}

          <div className="expList__items">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div className="expList__skeleton" key={i}>
                  <div className="expList__skeleton-bar" />
                  <div className="expList__skeleton-bar expList__skeleton-bar--short" />
                </div>
              ))
            ) : !hasExpenses ? (
              <div className="expList__empty">
                <div className="expList__placeholder-icon">
                  <FaListUl />
                </div>
                <h3>No expenses yet</h3>
                <p>Add one from the Add Split tab to start tracking.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="expList__empty">
                <div className="expList__placeholder-icon">
                  <FaSearch />
                </div>
                <h3>No matches</h3>
                <p>Try a different search or clear the category filter.</p>
              </div>
            ) : (
              filtered.map((expense, i) => (
                <ExpenseCard
                  key={expense._id || i}
                  expense={expense}
                />
              ))
            )}
          </div>
        </>
      )}

      <Fab
        onClick={() => setQuickAddOpen(true)}
        disabled={!currentGroup || currentGroup.members?.length === 0}
      />
      <QuickAddExpense
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        group={currentGroup}
      />
    </div>
  );
};

export default ExpenseListPage;
