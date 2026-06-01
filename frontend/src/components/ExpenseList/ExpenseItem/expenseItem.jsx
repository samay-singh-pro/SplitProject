import { useState } from "react";
import "./ExpenseCard.scss";
import { FaChevronDown, FaUser, FaPen, FaTrash } from "react-icons/fa";
import { CATEGORY_EMOJI } from "../../../utils/categoryInfer";

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const ExpenseCard = ({ expense, onEdit, onDelete, symbol = "₹" }) => {
  const [open, setOpen] = useState(false);

  const {
    amount,
    description,
    category,
    spenderName,
    splitDetails = [],
    createdAt,
  } = expense || {};

  const emoji = CATEGORY_EMOJI[category] || "✨";

  const toggle = () => setOpen((v) => !v);

  return (
    <article className={`expCard ${open ? "expCard--open" : ""}`}>
      <div
        className="expCard__head"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={open}
      >
        <div className="expCard__icon">
          <span>{emoji}</span>
        </div>

        <div className="expCard__info">
          <h3 className="expCard__title">{description || "Untitled"}</h3>
          <div className="expCard__meta">
            <span className="expCard__category">{category || "Others"}</span>
            <span className="expCard__dot" />
            <span className="expCard__spender">
              <FaUser /> {spenderName || "—"}
            </span>
            {createdAt && (
              <>
                <span className="expCard__dot" />
                <span className="expCard__date">{formatDate(createdAt)}</span>
              </>
            )}
          </div>
        </div>

        <div className="expCard__amount">
          {symbol}{formatMoney(amount)}
        </div>

        <div className="expCard__icons">
          <span className="expCard__amount-mobile">
            {symbol}{formatMoney(amount)}
          </span>
          <div className="expCard__actions">
            {onEdit && (
              <button
                type="button"
                className="expCard__icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(expense);
                }}
                title="Edit expense"
                aria-label="Edit expense"
              >
                <FaPen />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="expCard__icon-btn expCard__icon-btn--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(expense);
                }}
                title="Delete expense"
                aria-label="Delete expense"
              >
                <FaTrash />
              </button>
            )}
          </div>
        </div>

        <span className="expCard__chevron" aria-hidden>
          <FaChevronDown />
        </span>
      </div>

      {open && (
        <div className="expCard__body">
          <span className="expCard__body-title">Split details</span>
          {splitDetails.length === 0 ? (
            <p className="expCard__empty">No split details available.</p>
          ) : (
            <ul className="expCard__splits">
              {splitDetails.map((m, i) => (
                <li key={m.memberId || i}>
                  <span className="expCard__avatar">
                    {initials(m.memberName)}
                  </span>
                  <span className="expCard__split-name">{m.memberName}</span>
                  <strong>
                    {m.percentage !== undefined ? (
                      `${m.percentage}%`
                    ) : (
                      `${symbol}${formatMoney(m.amount)}`
                    )}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
};

export default ExpenseCard;
