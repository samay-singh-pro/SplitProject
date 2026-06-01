import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import "./EditExpenseModal.scss";
import {
  FaTimes,
  FaCheck,
  FaDivide,
  FaPercent,
  FaCoins,
  FaExclamationCircle,
  FaChevronDown,
  FaSearch,
} from "react-icons/fa";

// Above this count, picker shows a search box + scrollable cap.
const PICKER_SEARCH_THRESHOLD = 5;
import {
  inferCategory,
  ALL_CATEGORIES,
  CATEGORY_EMOJI,
} from "../../../utils/categoryInfer";
import { updateExpense, getAllExpenses } from "../../../store/expenseSlice";
import { fetchGroupStats } from "../../../store/statsSlice";
import { getCurrencySymbol } from "../../../utils/currency";

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const SPLIT_TYPES = [
  { key: "equally", label: "Equally", icon: <FaDivide /> },
  { key: "unequally", label: "By amount", icon: <FaCoins /> },
  { key: "percentage", label: "By %", icon: <FaPercent /> },
];

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const idOf = (v) => (v?._id || v)?.toString?.() || "";

const EditExpenseModal = ({ open, onClose, expense, group }) => {
  const dispatch = useDispatch();
  // Edits display in the group's currency, not the viewer's.
  const symbol = getCurrencySymbol(group?.currency);
  const members = useMemo(
    () => (group?.members || []).filter((m) => !m.removed),
    [group]
  );

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Others");
  const [spender, setSpender] = useState("");
  const [splitType, setSplitType] = useState("equally");
  const [splitAmong, setSplitAmong] = useState([]);
  const [unequalSplits, setUnequalSplits] = useState({});
  const [percentageSplits, setPercentageSplits] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef(null);
  const [paidSearch, setPaidSearch] = useState("");
  const [splitSearch, setSplitSearch] = useState("");

  const needsSearch = members.length > PICKER_SEARCH_THRESHOLD;

  const filterMembers = (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name?.toLowerCase().includes(q));
  };

  const paidFiltered = useMemo(
    () => filterMembers(paidSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paidSearch, members]
  );
  const splitFiltered = useMemo(
    () => filterMembers(splitSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [splitSearch, members]
  );

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

  // Pre-fill whenever the modal opens with a new expense.
  useEffect(() => {
    if (!open || !expense) return;
    setAmount(String(expense.amount ?? ""));
    setDescription(expense.description || "");
    setCategory(expense.category || "Others");
    setSpender(idOf(expense.spenderId));
    setSplitType(expense.splitType || "equally");
    const ids = (expense.splitDetails || []).map((s) => idOf(s.memberId));
    setSplitAmong(ids);

    const uneq = {};
    const pct = {};
    for (const s of expense.splitDetails || []) {
      const id = idOf(s.memberId);
      if (s.amount !== undefined) uneq[id] = String(s.amount);
      if (s.percentage !== undefined) pct[id] = String(s.percentage);
    }
    setUnequalSplits(uneq);
    setPercentageSplits(pct);
    setErrors({});
  }, [open, expense]);

  if (!open || !expense) return null;

  const amountNum = parseFloat(amount) || 0;
  const isSettlement = !!expense.settlementExpense;

  const toggleSplitAmong = (id) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const unequalTotal = splitAmong.reduce(
    (s, id) => s + (parseFloat(unequalSplits[id]) || 0),
    0
  );
  const percentageTotal = splitAmong.reduce(
    (s, id) => s + (parseFloat(percentageSplits[id]) || 0),
    0
  );

  const handleDescriptionChange = (val) => {
    setDescription(val);
    // Auto-recategorize on description change unless user already
    // picked a category that doesn't match the inferred one.
    const guess = inferCategory(val);
    if (guess) setCategory(guess);
  };

  const validate = () => {
    const next = {};
    if (!amount || amountNum <= 0)
      next.amount = "Enter an amount greater than 0.";
    if (!description.trim() && !isSettlement)
      next.description = "Describe the expense.";
    if (!spender) next.spender = "Pick who paid.";
    if (splitAmong.length === 0)
      next.splitAmong = "At least one person in the split.";

    if (splitType === "unequally" && splitAmong.length > 0) {
      if (Math.abs(unequalTotal - amountNum) > 0.01) {
        next.unequal = `Amounts add up to ${symbol}${formatMoney(
          unequalTotal
        )}, not ${symbol}${formatMoney(amountNum)}.`;
      }
    }
    if (splitType === "percentage" && splitAmong.length > 0) {
      if (Math.abs(percentageTotal - 100) > 0.01) {
        next.percentage = `Percentages add up to ${percentageTotal}, not 100.`;
      }
    }
    return next;
  };

  const handleSave = (e) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const payload = {
      expenseId: expense._id,
      amount: amountNum,
      description: description.trim(),
      category,
      spenderId: spender,
      splitType,
      splitDetails: [],
    };

    if (splitType === "unequally") {
      payload.splitDetails = splitAmong.map((id) => ({
        member: id,
        amount: parseFloat(unequalSplits[id]) || 0,
      }));
    } else if (splitType === "percentage") {
      payload.splitDetails = splitAmong.map((id) => ({
        member: id,
        percentage: parseFloat(percentageSplits[id]) || 0,
      }));
    } else {
      payload.splitDetails = splitAmong.map((id) => ({ member: id }));
    }

    setSaving(true);
    dispatch(updateExpense(payload)).then((action) => {
      setSaving(false);
      if (action.meta.requestStatus === "fulfilled") {
        dispatch(getAllExpenses(expense.groupId));
        dispatch(fetchGroupStats(expense.groupId));
        onClose();
      }
    });
  };

  return createPortal(
    <div className="editExpModal" role="dialog" onClick={onClose}>
      <form
        className="editExpModal__panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
      >
        <div className="editExpModal__head">
          <h3>{isSettlement ? "Edit settlement" : "Edit expense"}</h3>
          <button
            type="button"
            className="editExpModal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="editExpModal__body">
          <div className="ng-field">
            <label>Amount</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((p) => ({ ...p, amount: undefined }));
              }}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.amount && (
              <span className="ng-field__error">
                <FaExclamationCircle /> {errors.amount}
              </span>
            )}
          </div>

          {!isSettlement && (
            <div className="ng-field">
              <label>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="e.g. Dinner at Mainland China"
              />
              {errors.description && (
                <span className="ng-field__error">
                  <FaExclamationCircle /> {errors.description}
                </span>
              )}
            </div>
          )}

          {!isSettlement && (
            <div className="ng-field">
              <label>Category</label>
              <div className="editExpModal__dd" ref={catRef}>
                <button
                  type="button"
                  className={`editExpModal__dd-trigger ${
                    catOpen ? "editExpModal__dd-trigger--open" : ""
                  }`}
                  onClick={() => setCatOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={catOpen}
                >
                  <span className="editExpModal__dd-emoji">
                    {CATEGORY_EMOJI[category] || "✨"}
                  </span>
                  <span className="editExpModal__dd-label">{category}</span>
                  <FaChevronDown className="editExpModal__dd-chev" />
                </button>
                {catOpen && (
                  <div className="editExpModal__dd-menu" role="listbox">
                    {ALL_CATEGORIES.map((c) => {
                      const selected = category === c;
                      return (
                        <button
                          type="button"
                          key={c}
                          role="option"
                          aria-selected={selected}
                          className={`editExpModal__dd-opt ${
                            selected ? "editExpModal__dd-opt--selected" : ""
                          }`}
                          onClick={() => {
                            setCategory(c);
                            setCatOpen(false);
                          }}
                        >
                          <span className="editExpModal__dd-emoji">
                            {CATEGORY_EMOJI[c] || "✨"}
                          </span>
                          <span className="editExpModal__dd-opt-name">{c}</span>
                          {selected && (
                            <FaCheck className="editExpModal__dd-opt-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ng-field">
            <label>Who paid</label>

            {needsSearch && (
              <div className="editExpModal__picker-search">
                <FaSearch />
                <input
                  type="text"
                  value={paidSearch}
                  onChange={(e) => setPaidSearch(e.target.value)}
                  placeholder="Search members…"
                />
                {paidSearch && (
                  <button
                    type="button"
                    onClick={() => setPaidSearch("")}
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            )}

            <div className="editExpModal__avatars">
              {paidFiltered.length === 0 ? (
                <p className="editExpModal__picker-empty">No matches.</p>
              ) : (
                paidFiltered.map((m) => {
                  const active = spender === m._id;
                  return (
                    <button
                      type="button"
                      key={m._id}
                      className={`editExpModal__chip ${
                        active ? "editExpModal__chip--active" : ""
                      }`}
                      onClick={() => {
                        setSpender(m._id);
                        setErrors((p) => ({ ...p, spender: undefined }));
                      }}
                    >
                      <span className="editExpModal__avatar">
                        {initials(m.name)}
                      </span>
                      <span className="editExpModal__chip-name">{m.name}</span>
                      {active && (
                        <span className="editExpModal__chip-tick">
                          <FaCheck />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {errors.spender && (
              <span className="ng-field__error">
                <FaExclamationCircle /> {errors.spender}
              </span>
            )}
          </div>

          {!isSettlement && (
            <div className="ng-field">
              <label>How to split</label>
              <div className="editExpModal__seg" role="tablist">
                {SPLIT_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    role="tab"
                    aria-selected={splitType === t.key}
                    className={`editExpModal__seg-btn ${
                      splitType === t.key
                        ? "editExpModal__seg-btn--active"
                        : ""
                    }`}
                    onClick={() => setSplitType(t.key)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ng-field">
            <label>
              {isSettlement ? "Who received" : "Split with"}
              {!isSettlement && (
                <span className="editExpModal__picker-meta">
                  <span className="editExpModal__picker-count">
                    {splitAmong.length} of {members.length}
                  </span>
                  <button
                    type="button"
                    className="editExpModal__link"
                    onClick={() =>
                      setSplitAmong(
                        splitAmong.length === members.length
                          ? []
                          : members.map((m) => m._id)
                      )
                    }
                  >
                    {splitAmong.length === members.length
                      ? "Clear"
                      : "Select all"}
                  </button>
                </span>
              )}
            </label>

            {needsSearch && (
              <div className="editExpModal__picker-search">
                <FaSearch />
                <input
                  type="text"
                  value={splitSearch}
                  onChange={(e) => setSplitSearch(e.target.value)}
                  placeholder="Search members…"
                />
                {splitSearch && (
                  <button
                    type="button"
                    onClick={() => setSplitSearch("")}
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            )}

            <div className="editExpModal__avatars">
              {splitFiltered.length === 0 ? (
                <p className="editExpModal__picker-empty">No matches.</p>
              ) : (
                splitFiltered.map((m) => {
                  const active = isSettlement
                    ? splitAmong[0] === m._id
                    : splitAmong.includes(m._id);
                  return (
                    <button
                      type="button"
                      key={m._id}
                      className={`editExpModal__chip ${
                        active ? "editExpModal__chip--active" : ""
                      }`}
                      onClick={() => {
                        if (isSettlement) {
                          setSplitAmong(active ? [] : [m._id]);
                        } else {
                          toggleSplitAmong(m._id);
                        }
                        setErrors((p) => ({ ...p, splitAmong: undefined }));
                      }}
                    >
                      <span className="editExpModal__avatar">
                        {initials(m.name)}
                      </span>
                      <span className="editExpModal__chip-name">{m.name}</span>
                      {active && (
                        <span className="editExpModal__chip-tick">
                          <FaCheck />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Per-member amount/percent inputs only when relevant. */}
            {!isSettlement &&
              (splitType === "unequally" || splitType === "percentage") &&
              splitAmong.length > 0 && (
                <div className="editExpModal__splits">
                  {splitAmong.map((id) => {
                    const m = members.find((x) => x._id === id);
                    return (
                      <div key={id} className="editExpModal__split-row">
                        <span className="editExpModal__avatar editExpModal__avatar--sm">
                          {initials(m?.name)}
                        </span>
                        <span className="editExpModal__split-name">
                          {m?.name}
                        </span>
                        <div className="editExpModal__split-input">
                          {splitType === "unequally" && <span>{symbol}</span>}
                          <input
                            type="number"
                            inputMode="decimal"
                            value={
                              splitType === "unequally"
                                ? unequalSplits[id] || ""
                                : percentageSplits[id] || ""
                            }
                            onChange={(e) => {
                              if (splitType === "unequally") {
                                setUnequalSplits((p) => ({
                                  ...p,
                                  [id]: e.target.value,
                                }));
                              } else {
                                setPercentageSplits((p) => ({
                                  ...p,
                                  [id]: e.target.value,
                                }));
                              }
                            }}
                            placeholder={
                              splitType === "unequally" ? "0.00" : "0"
                            }
                            min="0"
                            max={splitType === "percentage" ? "100" : undefined}
                            step={splitType === "percentage" ? "0.1" : "0.01"}
                          />
                          {splitType === "percentage" && <span>%</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            {errors.splitAmong && (
              <span className="ng-field__error">
                <FaExclamationCircle /> {errors.splitAmong}
              </span>
            )}

            {!isSettlement &&
              splitType === "unequally" &&
              splitAmong.length > 0 && (
                <div
                  className={`editExpModal__total ${
                    Math.abs(unequalTotal - amountNum) < 0.01 && amountNum > 0
                      ? "editExpModal__total--ok"
                      : "editExpModal__total--bad"
                  }`}
                >
                  Sum {symbol}{formatMoney(unequalTotal)} / {symbol}{formatMoney(amountNum)}
                </div>
              )}

            {!isSettlement &&
              splitType === "percentage" &&
              splitAmong.length > 0 && (
                <div
                  className={`editExpModal__total ${
                    Math.abs(percentageTotal - 100) < 0.01
                      ? "editExpModal__total--ok"
                      : "editExpModal__total--bad"
                  }`}
                >
                  Sum {percentageTotal}% / 100%
                </div>
              )}

            {errors.unequal && (
              <span className="ng-field__error">
                <FaExclamationCircle /> {errors.unequal}
              </span>
            )}
            {errors.percentage && (
              <span className="ng-field__error">
                <FaExclamationCircle /> {errors.percentage}
              </span>
            )}
          </div>
        </div>

        <div className="editExpModal__actions">
          <button
            type="button"
            className="ng-btn ng-btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ng-btn ng-btn--primary"
            disabled={saving}
          >
            <FaCheck /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default EditExpenseModal;
