import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import "./expenseList.scss";
import ExpenseCard from "./ExpenseItem/expenseItem";
import EditExpenseModal from "./EditExpenseModal/EditExpenseModal";
import { getAllExpenses, deleteExpense } from "../../store/expenseSlice";
import { fetchGroupStats } from "../../store/statsSlice";
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
  FaTrash,
  FaExclamationTriangle,
  FaChevronDown,
  FaFilter,
  FaCheck,
} from "react-icons/fa";

import { ALL_CATEGORIES, CATEGORY_EMOJI } from "../../utils/categoryInfer";

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
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);

  useEffect(() => {
    if (!catOpen) return;
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) {
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [catOpen]);

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

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    dispatch(deleteExpense(confirmDelete._id)).then((action) => {
      setDeleting(false);
      if (action.meta.requestStatus === "fulfilled") {
        setConfirmDelete(null);
        // Stats need refreshing — balances change when an expense is removed.
        if (selectedGroup) dispatch(fetchGroupStats(selectedGroup));
      }
    });
  };

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

            <div className="expList__cat-dd" ref={catRef}>
              <button
                type="button"
                className={`expList__cat-trigger ${
                  catOpen ? "expList__cat-trigger--open" : ""
                }`}
                onClick={() => setCatOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={catOpen}
              >
                <FaFilter />
                <span className="expList__cat-trigger-label">
                  {activeCategory === "All"
                    ? "All categories"
                    : activeCategory}
                </span>
                {activeCategory !== "All" && (
                  <span className="expList__cat-trigger-emoji">
                    {CATEGORY_EMOJI[activeCategory] || ""}
                  </span>
                )}
                <FaChevronDown className="expList__cat-trigger-chev" />
              </button>

              {catOpen && (
                <div className="expList__cat-menu" role="listbox">
                  {CATEGORIES.map((c) => {
                    const selected = activeCategory === c;
                    return (
                      <button
                        type="button"
                        key={c}
                        role="option"
                        aria-selected={selected}
                        className={`expList__cat-opt ${
                          selected ? "expList__cat-opt--selected" : ""
                        }`}
                        onClick={() => {
                          setActiveCategory(c);
                          setCatOpen(false);
                        }}
                      >
                        <span className="expList__cat-opt-emoji">
                          {c === "All" ? "🗂️" : CATEGORY_EMOJI[c] || "✨"}
                        </span>
                        <span className="expList__cat-opt-name">
                          {c === "All" ? "All categories" : c}
                        </span>
                        {selected && (
                          <FaCheck className="expList__cat-opt-check" />
                        )}
                      </button>
                    );
                  })}
                </div>
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
                  onEdit={(e) => setEditing(e)}
                  onDelete={(e) => setConfirmDelete(e)}
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

      <EditExpenseModal
        open={!!editing}
        onClose={() => setEditing(null)}
        expense={editing}
        group={currentGroup}
      />

      {confirmDelete && (
        <div
          className="expList__confirm"
          role="dialog"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="expList__confirm-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expList__confirm-icon">
              <FaExclamationTriangle />
            </div>
            <h3>Delete this expense?</h3>
            <p>
              <strong>{confirmDelete.description || "Untitled"}</strong> for ₹
              {Number(confirmDelete.amount || 0).toFixed(2)} will be removed
              and balances will be recomputed. This can&apos;t be undone.
            </p>
            <div className="expList__confirm-actions">
              <button
                type="button"
                className="ng-btn ng-btn--ghost"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="expList__confirm-delete"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                <FaTrash /> {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseListPage;
