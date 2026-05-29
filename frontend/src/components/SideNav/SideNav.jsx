import "./SideNav.scss";
import {
  FaPlus,
  FaUsers,
  FaReceipt,
  FaChartBar,
  FaListUl,
} from "react-icons/fa";

const NAV_ITEMS = [
  { key: "AddGroup", label: "Add Group", short: "New", icon: <FaPlus /> },
  { key: "Groups", label: "Groups", short: "Groups", icon: <FaUsers /> },
  { key: "AddSplit", label: "Add Split", short: "Add", icon: <FaReceipt /> },
  {
    key: "ViewSplits",
    label: "View Reports",
    short: "Reports",
    icon: <FaChartBar />,
  },
  {
    key: "ExpenseList",
    label: "Expense List",
    short: "List",
    icon: <FaListUl />,
  },
];

const SideNav = ({ onNavClick, active }) => {
  return (
    <aside className="sideNav" aria-label="Primary navigation">
      <div className="sideNav__brand">
        <span className="sideNav__label">Workspace</span>
      </div>

      <nav className="sideNav__list">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              type="button"
              key={item.key}
              className={`sideNav__item ${
                isActive ? "sideNav__item--active" : ""
              }`}
              onClick={() => onNavClick(item.key)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="sideNav__icon">{item.icon}</span>
              <span className="sideNav__text sideNav__text--long">
                {item.label}
              </span>
              <span className="sideNav__text sideNav__text--short">
                {item.short}
              </span>
              {isActive && <span className="sideNav__indicator" aria-hidden />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideNav;
