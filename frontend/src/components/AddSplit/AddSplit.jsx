import { useState, useEffect, useMemo } from "react";
import "./AddSplit.scss";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import { addExpense } from "../../store/expenseSlice";
import GroupSelector from "../shared/GroupSelector/GroupSelector";
import { useCurrentGroup } from "../../hooks/useCurrentGroup";
import { useScope } from "../../hooks/useScope";
import ScopeToggle from "../shared/ScopeToggle/ScopeToggle";
import PersonalExpenseForm from "../Personal/PersonalExpenseForm";
import { getCurrencySymbol } from "../../utils/currency";
import { toLocalInput } from "../../utils/datetime";
import {
  FaArrowRight,
  FaUsers,
  FaPenFancy,
  FaCheck,
  FaExclamationCircle,
  FaDivide,
  FaPercent,
  FaCoins,
  FaUserCheck,
  FaMagic,
  FaChevronDown,
  FaSearch,
  FaTimes,
  FaRegClock,
} from "react-icons/fa";

// Above this count, the member pickers show a search box + scrollable cap
// so 10+ members don't sprawl across the form.
const PICKER_SEARCH_THRESHOLD = 5;
import {
  inferCategory,
  CATEGORY_EMOJI,
  ALL_CATEGORIES,
} from "../../utils/categoryInfer";

const SPLIT_TYPES = [
  {
    key: "equally",
    label: "Equally",
    sub: "Same share for everyone",
    icon: <FaDivide />,
  },
  {
    key: "unequally",
    label: "By amount",
    sub: "Custom amounts",
    icon: <FaCoins />,
  },
  {
    key: "percentage",
    label: "By percent",
    sub: "Custom %",
    icon: <FaPercent />,
  },
];

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const formatMoney = (n) =>
  isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

const AddSplit = () => {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.group);
  const { userInfo } = useSelector((state) => state.login);
  const [scope, setScope] = useScope();

  const [selectedGroup, setSelectedGroup] = useCurrentGroup();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [spender, setSpender] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [category, setCategory] = useState("Others");
  const [categoryAuto, setCategoryAuto] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [splitType, setSplitType] = useState("equally");
  const [saving, setSaving] = useState(false);
  const [unequalSplits, setUnequalSplits] = useState({});
  const [percentageSplits, setPercentageSplits] = useState({});
  const [errors, setErrors] = useState({});
  const [paidSearch, setPaidSearch] = useState("");
  const [splitSearch, setSplitSearch] = useState("");
  // Date + time of the expense, defaulted to now (lets users log a
  // past expense). Sent to the server which stores it as the record's
  // timestamp.
  const [date, setDate] = useState(toLocalInput());

  const handleDescriptionChange = (val) => {
    setDescription(val);
    setErrors((p) => ({ ...p, description: undefined }));
    if (categoryAuto) {
      const guess = inferCategory(val);
      if (guess) setCategory(guess);
      else if (!val.trim()) setCategory("Others");
    }
  };

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const group = groups.find((g) => g._id === selectedGroup);
  // Amounts use the GROUP's currency, not the viewer's personal one.
  const symbol = getCurrencySymbol(group?.currency);
  // Active members only — removed members can't take part in new expenses.
  const members = (group?.members || []).filter((m) => !m.removed);
  const amountNum = parseFloat(amount) || 0;
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

  const handleGroupChange = (id) => {
    setSelectedGroup(id);
    setSpender("");
    setSplitAmong([]);
    setUnequalSplits({});
    setPercentageSplits({});
    setErrors((p) => ({ ...p, group: undefined }));
  };

  const toggleSplitAmong = (id) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setErrors((p) => ({ ...p, splitAmong: undefined }));
  };

  const selectAll = () => setSplitAmong(members.map((m) => m._id));
  const clearAll = () => setSplitAmong([]);

  const unequalTotal = useMemo(
    () =>
      splitAmong.reduce(
        (sum, id) => sum + (parseFloat(unequalSplits[id]) || 0),
        0
      ),
    [splitAmong, unequalSplits]
  );

  const percentageTotal = useMemo(
    () =>
      splitAmong.reduce(
        (sum, id) => sum + (parseFloat(percentageSplits[id]) || 0),
        0
      ),
    [splitAmong, percentageSplits]
  );

  const validate = () => {
    const next = {};
    if (!selectedGroup) next.group = "Pick a group first.";
    if (!amount || amountNum <= 0)
      next.amount = "Enter an amount greater than 0.";
    if (!description.trim()) next.description = "Describe the expense.";
    if (!spender) next.spender = "Who paid?";
    if (splitAmong.length === 0)
      next.splitAmong = "Select at least one person.";

    if (splitType === "unequally" && splitAmong.length > 0) {
      if (Math.abs(unequalTotal - amountNum) > 0.01) {
        next.unequal = `Amounts add up to ${formatMoney(unequalTotal)}, not ${formatMoney(amountNum)}.`;
      }
    }
    if (splitType === "percentage" && splitAmong.length > 0) {
      if (Math.abs(percentageTotal - 100) > 0.01) {
        next.percentage = `Percentages add up to ${percentageTotal}, not 100.`;
      }
    }
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const expenseData = {
      groupId: selectedGroup,
      amount: amountNum,
      description: description.trim(),
      category,
      spenderId: spender,
      splitType,
      date,
      splitDetails: [],
    };

    if (splitType === "unequally") {
      expenseData.splitDetails = splitAmong.map((id) => ({
        member: id,
        amount: parseFloat(unequalSplits[id]) || 0,
      }));
    } else if (splitType === "percentage") {
      expenseData.splitDetails = splitAmong.map((id) => ({
        member: id,
        percentage: parseFloat(percentageSplits[id]) || 0,
      }));
    } else {
      expenseData.splitDetails = splitAmong.map((id) => ({ member: id }));
    }

    setSaving(true);
    dispatch(addExpense(expenseData))
      .then((action) => {
        // Only clear the form on success so a failed save keeps the
        // user's input instead of silently wiping it.
        if (action.meta?.requestStatus === "fulfilled") resetForm();
      })
      .finally(() => setSaving(false));
  };

  // Wipe all fields back to their initial state. Used both after a
  // successful save and from the explicit "Reset" button in the
  // form actions.
  const resetForm = () => {
    setAmount("");
    setDescription("");
    setSpender("");
    setCategory("Others");
    setCategoryAuto(true);
    setShowCategoryPicker(false);
    setSplitAmong([]);
    setUnequalSplits({});
    setPercentageSplits({});
    setSplitType("equally");
    setPaidSearch("");
    setSplitSearch("");
    setDate(toLocalInput());
    setErrors({});
  };

  return (
    <div className="addSplit">
      <div className="addSplit__bg" aria-hidden>
        <div className="addSplit__grid" />
      </div>

      <header className="addSplit__topbar">
        <div className="addSplit__crumbs">
          <span>Dashboard</span>
          <FaArrowRight />
          <span className="active">Add split</span>
        </div>
        <h1 className="addSplit__title">
          {scope === "personal" ? "Add a personal expense" : "Add an expense"}
        </h1>
        <p className="addSplit__subtitle">
          {scope === "personal"
            ? "Just for you — no group, no splitting."
            : "Track what was spent and how it should be split."}
        </p>
      </header>

      <div className="addSplit__group-row">
        <ScopeToggle scope={scope} onChange={setScope} />
        {scope === "group" && (
          <GroupSelector
            groups={groups}
            selectedId={selectedGroup}
            onSelect={handleGroupChange}
          />
        )}
        {scope === "group" && errors.group && (
          <span className="ng-field__error ng-field__error--block">
            <FaExclamationCircle />
            {errors.group}
          </span>
        )}
      </div>

      {scope === "personal" ? (
        <div className="addSplit__layout">
          <div className="addSplit__card addSplit__form">
            <PersonalExpenseForm
              symbol={getCurrencySymbol(userInfo?.currency)}
            />
          </div>
        </div>
      ) : (
      <div className="addSplit__layout">
        <form
          className="addSplit__card addSplit__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="addSplit__cols">
            <div className="addSplit__col">
          {/* ----- What ----- */}
          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">1</span>
              <div>
                <h2>What was it?</h2>
              </div>
            </div>

            <div
              className={`ng-field addSplit__amount ${
                errors.amount ? "ng-field--error" : ""
              }`}
            >
              <label htmlFor="as-amount">
                <FaCoins /> Amount<span className="ng-required">*</span>
              </label>
              <div className="addSplit__amount-input">
                <span>{symbol}</span>
                <input
                  id="as-amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrors((p) => ({ ...p, amount: undefined }));
                  }}
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.amount && (
                <span className="ng-field__error">
                  <FaExclamationCircle /> {errors.amount}
                </span>
              )}
            </div>

            <div
              className={`ng-field ${
                errors.description ? "ng-field--error" : ""
              }`}
            >
              <label htmlFor="as-desc">
                <FaPenFancy /> Description
                <span className="ng-required">*</span>
              </label>
              <input
                id="as-desc"
                type="text"
                placeholder="e.g. Dinner at Mainland China"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
              />
              {errors.description && (
                <span className="ng-field__error">
                  <FaExclamationCircle /> {errors.description}
                </span>
              )}
            </div>

            {/* Inferred category, hidden picker until user wants to change. */}
            <div className="addSplit__autocat">
              <button
                type="button"
                className={`addSplit__autotag ${
                  showCategoryPicker ? "addSplit__autotag--open" : ""
                }`}
                onClick={() => setShowCategoryPicker((v) => !v)}
              >
                {categoryAuto && <FaMagic />}
                <span>{CATEGORY_EMOJI[category] || "✨"}</span>
                <strong>{category}</strong>
                {categoryAuto && <small>auto</small>}
                <FaChevronDown className="addSplit__autotag-chev" />
              </button>
              {showCategoryPicker && (
                <div className="ng-chips addSplit__autocat-chips">
                  {ALL_CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`ng-chip ${
                        category === c ? "ng-chip--active" : ""
                      }`}
                      onClick={() => {
                        setCategory(c);
                        setCategoryAuto(false);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <span className="ng-chip__emoji">
                        {CATEGORY_EMOJI[c]}
                      </span>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ng-field addSplit__when">
              <label htmlFor="as-date">
                <FaRegClock /> Date &amp; time
              </label>
              <input
                id="as-date"
                type="datetime-local"
                value={date}
                max={toLocalInput()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </section>

          {/* ----- Who paid ----- */}
          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">2</span>
              <div>
                <h2>Who paid?</h2>
              </div>
            </div>

            {!group ? (
              <div className="addSplit__hint">
                <FaUsers /> Pick a group above to see members.
              </div>
            ) : members.length === 0 ? (
              <div className="addSplit__hint">
                This group has no members yet.
              </div>
            ) : (
              <>
                {needsSearch && (
                  <div className="addSplit__picker-search">
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

                <div className="addSplit__avatars">
                  {paidFiltered.length === 0 ? (
                    <p className="addSplit__picker-empty">No matches.</p>
                  ) : (
                    paidFiltered.map((m) => (
                      <button
                        type="button"
                        key={m._id}
                        className={`addSplit__avatar-chip ${
                          spender === m._id
                            ? "addSplit__avatar-chip--active"
                            : ""
                        }`}
                        onClick={() => {
                          setSpender(m._id);
                          setErrors((p) => ({ ...p, spender: undefined }));
                        }}
                      >
                        <span className="addSplit__avatar">
                          {initials(m.name)}
                        </span>
                        <span className="addSplit__avatar-name">{m.name}</span>
                        {spender === m._id && (
                          <span className="addSplit__avatar-tick">
                            <FaCheck />
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                {errors.spender && (
                  <span className="ng-field__error ng-field__error--block">
                    <FaExclamationCircle /> {errors.spender}
                  </span>
                )}
              </>
            )}
          </section>
            </div>
            <div className="addSplit__col">

          {/* ----- Split among ----- */}
          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">3</span>
              <div>
                <h2>Split with</h2>
              </div>
            </div>

            {group && members.length > 0 && (
              <div className="addSplit__bulk">
                <span className="addSplit__picker-count">
                  {splitAmong.length} of {members.length} selected
                </span>
                <button type="button" onClick={selectAll}>
                  <FaUserCheck /> Select all
                </button>
                {splitAmong.length > 0 && (
                  <button type="button" onClick={clearAll}>
                    Clear ({splitAmong.length})
                  </button>
                )}
              </div>
            )}

            {!group ? (
              <div className="addSplit__hint">
                <FaUsers /> Pick a group above to see members.
              </div>
            ) : (
              <>
                {needsSearch && (
                  <div className="addSplit__picker-search">
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

                <div className="addSplit__avatars">
                  {splitFiltered.length === 0 ? (
                    <p className="addSplit__picker-empty">No matches.</p>
                  ) : (
                    splitFiltered.map((m) => {
                      const active = splitAmong.includes(m._id);
                      return (
                        <button
                          type="button"
                          key={m._id}
                          className={`addSplit__avatar-chip ${
                            active ? "addSplit__avatar-chip--active" : ""
                          }`}
                          onClick={() => toggleSplitAmong(m._id)}
                        >
                          <span className="addSplit__avatar">
                            {initials(m.name)}
                          </span>
                          <span className="addSplit__avatar-name">
                            {m.name}
                          </span>
                          {active && (
                            <span className="addSplit__avatar-tick">
                              <FaCheck />
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {errors.splitAmong && (
                  <span className="ng-field__error ng-field__error--block">
                    <FaExclamationCircle /> {errors.splitAmong}
                  </span>
                )}
              </>
            )}
          </section>

          {/* ----- How to split ----- */}
          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">4</span>
              <div>
                <h2>How to split?</h2>
              </div>
            </div>

            <div className="addSplit__segmented" role="tablist">
              {SPLIT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  role="tab"
                  aria-selected={splitType === t.key}
                  className={`addSplit__seg ${
                    splitType === t.key ? "addSplit__seg--active" : ""
                  }`}
                  onClick={() => setSplitType(t.key)}
                >
                  <span className="addSplit__seg-icon">{t.icon}</span>
                  <span className="addSplit__seg-label">{t.label}</span>
                  <span className="addSplit__seg-sub">{t.sub}</span>
                </button>
              ))}
            </div>

            {splitType === "unequally" && splitAmong.length > 0 && (
              <div className="addSplit__split-table">
                {splitAmong.map((id) => {
                  const m = members.find((x) => x._id === id);
                  return (
                    <div key={id} className="addSplit__split-row">
                      <span className="addSplit__avatar addSplit__avatar--sm">
                        {initials(m?.name)}
                      </span>
                      <span className="addSplit__split-name">{m?.name}</span>
                      <div className="addSplit__split-input">
                        <span>{symbol}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={unequalSplits[id] || ""}
                          onChange={(e) =>
                            setUnequalSplits((p) => ({
                              ...p,
                              [id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  );
                })}
                <div
                  className={`addSplit__total ${
                    Math.abs(unequalTotal - amountNum) < 0.01 && amountNum > 0
                      ? "addSplit__total--ok"
                      : "addSplit__total--bad"
                  }`}
                >
                  Sum: {symbol}{formatMoney(unequalTotal)} of {symbol}{formatMoney(amountNum)}
                </div>
                {errors.unequal && (
                  <span className="ng-field__error ng-field__error--block">
                    <FaExclamationCircle /> {errors.unequal}
                  </span>
                )}
              </div>
            )}

            {splitType === "percentage" && splitAmong.length > 0 && (
              <div className="addSplit__split-table">
                {splitAmong.map((id) => {
                  const m = members.find((x) => x._id === id);
                  return (
                    <div key={id} className="addSplit__split-row">
                      <span className="addSplit__avatar addSplit__avatar--sm">
                        {initials(m?.name)}
                      </span>
                      <span className="addSplit__split-name">{m?.name}</span>
                      <div className="addSplit__split-input">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={percentageSplits[id] || ""}
                          onChange={(e) =>
                            setPercentageSplits((p) => ({
                              ...p,
                              [id]: e.target.value,
                            }))
                          }
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <span>%</span>
                      </div>
                    </div>
                  );
                })}
                <div
                  className={`addSplit__total ${
                    Math.abs(percentageTotal - 100) < 0.01
                      ? "addSplit__total--ok"
                      : "addSplit__total--bad"
                  }`}
                >
                  Sum: {percentageTotal}% of 100%
                </div>
                {errors.percentage && (
                  <span className="ng-field__error ng-field__error--block">
                    <FaExclamationCircle /> {errors.percentage}
                  </span>
                )}
              </div>
            )}
          </section>
            </div>
          </div>

          <div className="ng-actions">
            <button
              type="button"
              className="ng-btn ng-btn--ghost"
              onClick={resetForm}
            >
              Reset
            </button>
            <button
              type="submit"
              className="ng-btn ng-btn--primary"
              disabled={saving}
            >
              {saving ? <span className="btn-spinner" /> : <FaCheck />}{" "}
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
};

export default AddSplit;
