import "./Personal.scss";
import { FaTimes } from "react-icons/fa";
import PersonalExpenseForm from "./PersonalExpenseForm";

// Modal wrapper around the personal form — used by the list to add or
// edit a solo expense.
const AddPersonalExpense = ({ open, onClose, symbol, expense = null }) => {
  if (!open) return null;
  return (
    <div
      className="pModal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="pModal">
        <header className="pModal__head">
          <h3>{expense ? "Edit expense" : "Add personal expense"}</h3>
          <button
            type="button"
            className="pModal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </header>
        <div className="pModal__body">
          <PersonalExpenseForm
            symbol={symbol}
            expense={expense}
            onDone={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default AddPersonalExpense;
