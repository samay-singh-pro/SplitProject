import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addPersonal,
  updatePersonal,
  getPersonal,
} from "../../store/personalSlice";
import {
  inferCategory,
  CATEGORY_EMOJI,
  ALL_CATEGORIES,
} from "../../utils/categoryInfer";
import { toLocalInput } from "../../utils/datetime";
import {
  FaCoins,
  FaPenFancy,
  FaTag,
  FaRegClock,
  FaCheck,
  FaChevronDown,
  FaExclamationCircle,
} from "react-icons/fa";

// Solo personal expense form (no group, no split). Reused inline on the
// Add Split → Personal screen and inside the edit modal in the list.
const PersonalExpenseForm = ({ symbol = "₹", expense = null, onDone }) => {
  const dispatch = useDispatch();
  const editing = Boolean(expense);

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense?.description || "");
  const [category, setCategory] = useState(expense?.category || "Others");
  const [auto, setAuto] = useState(!editing);
  const [showCat, setShowCat] = useState(false);
  // Date + time, defaulted to now. Lets the user log a past spend.
  const [date, setDate] = useState(toLocalInput(expense?.date));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const onDesc = (v) => {
    setDescription(v);
    setErrors((p) => ({ ...p, description: undefined }));
    if (auto) {
      const g = inferCategory(v);
      if (g) setCategory(g);
      else if (!v.trim()) setCategory("Others");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const next = {};
    if (!amount || !(amt > 0)) next.amount = "Enter an amount greater than 0.";
    if (!description.trim()) next.description = "Describe the expense.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setSaving(true);
    const payload = {
      amount: amt,
      description: description.trim(),
      category,
      date,
    };
    const action = editing
      ? await dispatch(updatePersonal({ id: expense._id, ...payload }))
      : await dispatch(addPersonal(payload));
    setSaving(false);
    if (action.meta.requestStatus === "fulfilled") {
      dispatch(getPersonal());
      if (!editing) {
        setAmount("");
        setDescription("");
        setCategory("Others");
        setAuto(true);
        setDate(toLocalInput());
      }
      onDone?.();
    } else {
      setErrors(
        action.payload?.errors || {
          amount: action.payload?.message || "Couldn't save this expense.",
        }
      );
    }
  };

  return (
    <form className="pf" onSubmit={submit} noValidate>
      <div className={`ng-field ${errors.amount ? "ng-field--error" : ""}`}>
        <label htmlFor="pf-amount">
          <FaCoins /> Amount<span className="ng-required">*</span>
        </label>
        <div className="pf__amount">
          <span>{symbol}</span>
          <input
            id="pf-amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            min="0"
            step="0.01"
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((p) => ({ ...p, amount: undefined }));
            }}
          />
        </div>
        {errors.amount && (
          <span className="ng-field__error">
            <FaExclamationCircle /> {errors.amount}
          </span>
        )}
      </div>

      <div
        className={`ng-field ${errors.description ? "ng-field--error" : ""}`}
      >
        <label htmlFor="pf-desc">
          <FaPenFancy /> Description<span className="ng-required">*</span>
        </label>
        <input
          id="pf-desc"
          type="text"
          placeholder="e.g. Coffee, Metro card, Groceries"
          value={description}
          onChange={(e) => onDesc(e.target.value)}
          maxLength={80}
        />
        {errors.description && (
          <span className="ng-field__error">
            <FaExclamationCircle /> {errors.description}
          </span>
        )}
      </div>

      <div className="pf__row">
        <div className="pf__cat">
          <label className="pf__cat-label">
            <FaTag /> Category
          </label>
          <button
            type="button"
            className={`pf__cat-trigger ${showCat ? "is-open" : ""}`}
            onClick={() => setShowCat((v) => !v)}
          >
            <span>{CATEGORY_EMOJI[category] || "✨"}</span>
            <strong>{category}</strong>
            <FaChevronDown />
          </button>
          {showCat && (
            <div className="pf__chips">
              {ALL_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`pf__chip ${category === c ? "is-active" : ""}`}
                  onClick={() => {
                    setCategory(c);
                    setAuto(false);
                    setShowCat(false);
                  }}
                >
                  <span>{CATEGORY_EMOJI[c]}</span>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pf__date">
          <label htmlFor="pf-date">
            <FaRegClock /> Date &amp; time
          </label>
          <input
            id="pf-date"
            type="datetime-local"
            value={date}
            max={toLocalInput()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        className="ng-btn ng-btn--primary pf__submit"
        disabled={saving}
      >
        {saving ? <span className="btn-spinner" /> : <FaCheck />}{" "}
        {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
      </button>
    </form>
  );
};

export default PersonalExpenseForm;
