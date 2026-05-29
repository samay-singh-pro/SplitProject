import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addExpense, getAllExpenses } from "../../store/expenseSlice";
import { fetchGroupStats } from "../../store/statsSlice";
import "./QuickAddExpense.scss";
import {
  FaTimes,
  FaUser,
  FaUsers,
  FaCheck,
  FaChevronDown,
  FaMagic,
} from "react-icons/fa";
import {
  inferCategory,
  CATEGORY_EMOJI,
  ALL_CATEGORIES,
} from "../../utils/categoryInfer";

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const QuickAddExpense = ({ open, onClose, group }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.expense);
  const amountRef = useRef(null);

  // Only active (non-removed) members can take part in new expenses.
  const members = useMemo(
    () => (group?.members || []).filter((m) => !m.removed),
    [group]
  );

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Others");
  const [categoryAuto, setCategoryAuto] = useState(true); // category came from inference
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [openSection, setOpenSection] = useState(null);
  const [errors, setErrors] = useState({});

  // Initialise smart defaults whenever the sheet opens with a group.
  useEffect(() => {
    if (!open || !group) return;
    setAmount("");
    setDescription("");
    setCategory("Others");
    setCategoryAuto(true);
    setPaidBy(members[0]?._id || "");
    setSplitAmong(members.map((m) => m._id));
    setOpenSection(null);
    setErrors({});
    // Focus the amount on next tick so the keyboard pops on mobile.
    requestAnimationFrame(() => amountRef.current?.focus());
  }, [open, group, members]);

  if (!open || !group) return null;

  const categoryEmoji = CATEGORY_EMOJI[category] || "✨";
  const payer = members.find((m) => m._id === paidBy);

  const handleDescriptionChange = (val) => {
    setDescription(val);
    setErrors((er) => ({ ...er, description: undefined }));
    // Only auto-update category while user hasn't manually picked one.
    if (categoryAuto) {
      const guess = inferCategory(val);
      if (guess) setCategory(guess);
      else if (!val.trim()) setCategory("Others");
    }
  };

  const toggleSplit = (id) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setErrors((e) => ({ ...e, splitAmong: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) next.amount = "Enter an amount.";
    if (!description.trim()) next.description = "What was it?";
    if (!paidBy) next.paidBy = "Who paid?";
    if (splitAmong.length === 0) next.splitAmong = "Split with at least one person.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      // Auto-open the section that needs attention.
      if (next.paidBy) setOpenSection("payer");
      else if (next.splitAmong) setOpenSection("split");
      return;
    }

    dispatch(
      addExpense({
        groupId: group._id,
        amount: amt,
        description: description.trim(),
        category,
        spenderId: paidBy,
        splitType: "equally",
        splitDetails: splitAmong.map((id) => ({ member: id })),
      })
    ).then((result) => {
      if (result.type?.endsWith("/fulfilled")) {
        // Refresh both stats and list so UI updates immediately.
        dispatch(fetchGroupStats(group._id));
        dispatch(getAllExpenses(group._id));
        onClose();
      }
    });
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="quickAdd-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add expense"
      onMouseDown={handleBackdrop}
    >
      <form className="quickAdd" onSubmit={handleSubmit}>
        <header className="quickAdd__head">
          <div>
            <h3>Quick add</h3>
            <span>{group.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="quickAdd__close"
          >
            <FaTimes />
          </button>
        </header>

        {/* ---------- Amount ---------- */}
        <div
          className={`quickAdd__amount ${
            errors.amount ? "quickAdd__amount--error" : ""
          }`}
        >
          <span className="quickAdd__currency">₹</span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((er) => ({ ...er, amount: undefined }));
            }}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        {errors.amount && (
          <span className="quickAdd__err">{errors.amount}</span>
        )}

        {/* ---------- Description ---------- */}
        <div
          className={`quickAdd__desc ${
            errors.description ? "quickAdd__desc--error" : ""
          }`}
        >
          <input
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="What was it for?"
          />
        </div>
        {errors.description && (
          <span className="quickAdd__err">{errors.description}</span>
        )}

        {/* Inferred category tag — tap to change if wrong */}
        <button
          type="button"
          className={`quickAdd__autotag ${
            openSection === "category" ? "quickAdd__autotag--open" : ""
          }`}
          onClick={() =>
            setOpenSection(openSection === "category" ? null : "category")
          }
          title={
            categoryAuto
              ? "We picked this from your description. Tap to change."
              : "Tap to change"
          }
        >
          {categoryAuto && <FaMagic />}
          <span>{categoryEmoji}</span>
          <strong>{category}</strong>
          {categoryAuto && <small>auto</small>}
          <FaChevronDown className="quickAdd__chev" />
        </button>

        {/* ---------- Smart-default chips ---------- */}
        <div className="quickAdd__chips">
          <button
            type="button"
            className={`quickAdd__chip ${
              openSection === "payer" ? "quickAdd__chip--open" : ""
            }`}
            onClick={() =>
              setOpenSection(openSection === "payer" ? null : "payer")
            }
          >
            <FaUser />
            <span>
              <small>Paid by</small>
              <strong>{payer?.name || "Choose"}</strong>
            </span>
            <FaChevronDown className="quickAdd__chev" />
          </button>

          <button
            type="button"
            className={`quickAdd__chip ${
              openSection === "split" ? "quickAdd__chip--open" : ""
            }`}
            onClick={() =>
              setOpenSection(openSection === "split" ? null : "split")
            }
          >
            <FaUsers />
            <span>
              <small>Split with</small>
              <strong>
                {splitAmong.length === members.length
                  ? "Everyone"
                  : `${splitAmong.length} ${
                      splitAmong.length === 1 ? "person" : "people"
                    }`}
              </strong>
            </span>
            <FaChevronDown className="quickAdd__chev" />
          </button>
        </div>

        {/* ---------- Expandable sections ---------- */}
        {openSection === "payer" && (
          <div className="quickAdd__section">
            <div className="quickAdd__people">
              {members.map((m) => (
                <button
                  type="button"
                  key={m._id}
                  className={`quickAdd__person ${
                    paidBy === m._id ? "quickAdd__person--active" : ""
                  }`}
                  onClick={() => {
                    setPaidBy(m._id);
                    setErrors((er) => ({ ...er, paidBy: undefined }));
                    setOpenSection(null);
                  }}
                >
                  <span className="quickAdd__avatar">{initials(m.name)}</span>
                  <span className="quickAdd__person-name">{m.name}</span>
                  {paidBy === m._id && (
                    <span className="quickAdd__tick">
                      <FaCheck />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {openSection === "category" && (
          <div className="quickAdd__section">
            <div className="quickAdd__cats">
              {ALL_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`quickAdd__cat ${
                    category === c ? "quickAdd__cat--active" : ""
                  }`}
                  onClick={() => {
                    setCategory(c);
                    setCategoryAuto(false);
                    setOpenSection(null);
                  }}
                >
                  <span>{CATEGORY_EMOJI[c]}</span>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {openSection === "split" && (
          <div className="quickAdd__section">
            <div className="quickAdd__bulk">
              <button
                type="button"
                onClick={() => setSplitAmong(members.map((m) => m._id))}
              >
                Everyone
              </button>
              <button type="button" onClick={() => setSplitAmong([])}>
                Clear
              </button>
            </div>
            <div className="quickAdd__people">
              {members.map((m) => {
                const active = splitAmong.includes(m._id);
                return (
                  <button
                    type="button"
                    key={m._id}
                    className={`quickAdd__person ${
                      active ? "quickAdd__person--active" : ""
                    }`}
                    onClick={() => toggleSplit(m._id)}
                  >
                    <span className="quickAdd__avatar">
                      {initials(m.name)}
                    </span>
                    <span className="quickAdd__person-name">{m.name}</span>
                    {active && (
                      <span className="quickAdd__tick">
                        <FaCheck />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(errors.paidBy || errors.splitAmong) && (
          <span className="quickAdd__err">
            {errors.paidBy || errors.splitAmong}
          </span>
        )}

        <button
          type="submit"
          className="quickAdd__submit"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save expense"}
        </button>
      </form>
    </div>
  );
};

export default QuickAddExpense;
