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
import { useScope } from "../../hooks/useScope";
import ScopeToggle from "../shared/ScopeToggle/ScopeToggle";
import PersonalList from "../Personal/PersonalList";
import { getPersonal } from "../../store/personalSlice";
import Fab from "../shared/Fab/Fab";
import QuickAddExpense from "../QuickAddExpense/QuickAddExpense";
import { getCurrencySymbol } from "../../utils/currency";
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
  const { userInfo } = useSelector((state) => state.login);

  const [selectedGroup, setSelectedGroup] = useCurrentGroup();
  const [scope, setScope] = useScope();
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

  // Pull the personal feed whenever the user switches to Personal scope.
  useEffect(() => {
    if (scope === "personal") dispatch(getPersonal());
  }, [scope, dispatch]);

  // Only fetch once the selected group is confirmed to be one of the
  // current user's groups. A stale id can persist in localStorage from a
  // previous session/account; fetching it would 403/404 and show a
  // "failed to load" toast to a user who did nothing wrong.
  useEffect(() => {
    if (selectedGroup && groups.some((g) => g._id === selectedGroup)) {
      dispatch(getAllExpenses(selectedGroup));
    }
  }, [selectedGroup, groups, dispatch]);

  const handleGroupChange = (id) => {
    setSelectedGroup(id);
  };

  const currentGroup = groups.find((g) => g._id === selectedGroup);
  // Amounts render in the group's currency (set at creation), shared by
  // all members — not the viewer's personal preference.
  const symbol = getCurrencySymbol(currentGroup?.currency);

  // Splitwise-style permissions: the group owner can edit/delete any
  // expense (moderator); everyone else can only touch the ones they
  // created. `createdBy` comes back on each expense from the API.
  const myId = userInfo?._id?.toString();
  const isOwner =
    currentGroup && String(currentGroup.createdBy) === String(myId);
  const canModify = (expense) =>
    isOwner || String(expense?.createdBy) === String(myId);

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

  // Treat the page as "has a group" only when the selection resolves to
  // one of the user's groups — a stale/foreign id shows the placeholder
  // rather than an empty list for a group that isn't theirs.
  const hasGroup = Boolean(currentGroup);
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
        <h1 className="expList__title">
          {scope === "personal" ? "My expenses" : "All expenses"}
        </h1>
        <p className="expList__subtitle">
          {scope === "personal"
            ? "Everything you've spent — your solo logs and what you paid in groups."
            : "Browse, filter, and inspect every expense in the group."}
        </p>
      </header>

      <div className="expList__group-row">
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
        <div className="expList__items">
          <PersonalList />
        </div>
      ) : !hasGroup ? (
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
                  {symbol}{formatMoney(total)}
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
                  symbol={symbol}
                  onEdit={canModify(expense) ? (e) => setEditing(e) : undefined}
                  onDelete={
                    canModify(expense) ? (e) => setConfirmDelete(e) : undefined
                  }
                />
              ))
            )}
          </div>
        </>
      )}

      {scope === "group" && (
        <>
          <Fab
            onClick={() => setQuickAddOpen(true)}
            disabled={!currentGroup || currentGroup.members?.length === 0}
          />
          <QuickAddExpense
            open={quickAddOpen}
            onClose={() => setQuickAddOpen(false)}
            group={currentGroup}
          />
        </>
      )}

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
              <strong>{confirmDelete.description || "Untitled"}</strong> for {symbol}
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
                {deleting ? <span className="btn-spinner" /> : <FaTrash />}{" "}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseListPage;
