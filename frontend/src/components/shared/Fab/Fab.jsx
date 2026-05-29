import "./Fab.scss";
import { FaPlus } from "react-icons/fa";

const Fab = ({ onClick, label = "Add expense", disabled = false }) => (
  <button
    type="button"
    className="fab"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={disabled ? "Pick a group first" : label}
  >
    <span className="fab__icon">
      <FaPlus />
    </span>
    <span className="fab__label">{label}</span>
  </button>
);

export default Fab;
