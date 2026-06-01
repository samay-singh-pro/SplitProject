import "./ScopeToggle.scss";
import { FaUsers, FaUser } from "react-icons/fa";

// Segmented "Group | Personal" switch shown in the header of the
// group-scoped screens. Group = shared group data; Personal = the
// logged-in user's own spending.
const ScopeToggle = ({ scope, onChange }) => (
  <div className="scopeToggle" role="tablist" aria-label="View scope">
    <span
      className="scopeToggle__thumb"
      data-scope={scope}
      aria-hidden="true"
    />
    <button
      type="button"
      role="tab"
      aria-selected={scope === "group"}
      className={`scopeToggle__btn ${
        scope === "group" ? "scopeToggle__btn--active" : ""
      }`}
      onClick={() => onChange("group")}
    >
      <FaUsers />
      <span>Group</span>
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={scope === "personal"}
      className={`scopeToggle__btn ${
        scope === "personal" ? "scopeToggle__btn--active" : ""
      }`}
      onClick={() => onChange("personal")}
    >
      <FaUser />
      <span>Personal</span>
    </button>
  </div>
);

export default ScopeToggle;
