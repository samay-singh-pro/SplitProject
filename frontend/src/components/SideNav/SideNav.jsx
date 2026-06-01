import { useState } from "react";
import "./SideNav.scss";
import {
  FaPlus,
  FaUsers,
  FaReceipt,
  FaChartBar,
  FaListUl,
  FaArrowLeft,
  FaChevronRight,
} from "react-icons/fa";
import ProfileMenu from "../ProfileMenu/ProfileMenu";
import { useSelector } from "react-redux";

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

const initials = (value) => {
  if (!value) return "?";
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

const SideNav = ({ onNavClick, active }) => {
  const { userInfo } = useSelector((s) => s.login);
  const inviteCount = useSelector((s) => s.invite.list.length);
  const name = userInfo?.username || "Account";
  const email = userInfo?.email || "";

  // Desktop only: the rail morphs in-place between "nav" and "account"
  // modes instead of opening a pop-up. On mobile the rail is a bottom
  // tab bar and the Navbar carries the account popover, so this state
  // simply never flips there (the account view is hidden via CSS).
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <aside
      className={`sideNav ${accountOpen ? "sideNav--account" : ""}`}
      aria-label="Primary navigation"
    >
      {/* ---- Nav mode ---- */}
      <div className="sideNav__view sideNav__view--nav" aria-hidden={accountOpen}>
        <div className="sideNav__brand">
          <span className="brandMark">splitit</span>
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
                tabIndex={accountOpen ? -1 : 0}
              >
                <span className="sideNav__icon">{item.icon}</span>
                <span className="sideNav__text sideNav__text--long">
                  {item.label}
                </span>
                <span className="sideNav__text sideNav__text--short">
                  {item.short}
                </span>
                {isActive && (
                  <span className="sideNav__indicator" aria-hidden />
                )}
              </button>
            );
          })}
        </nav>

        {/* Tapping the identity card flips the rail to account mode. */}
        <button
          type="button"
          className="sideNav__profile"
          onClick={() => setAccountOpen(true)}
          aria-label="Open account and preferences"
          tabIndex={accountOpen ? -1 : 0}
        >
          <span className="sideNav__profile-avatar">
            {initials(name)}
            {inviteCount > 0 && (
              <span className="sideNav__profile-dot" aria-hidden />
            )}
          </span>
          <span className="sideNav__profile-who">
            <strong>{name}</strong>
            {email && <small>{email}</small>}
          </span>
          <FaChevronRight className="sideNav__profile-chevron" />
        </button>
      </div>

      {/* ---- Account mode (morphs in over the same rail) ---- */}
      <div
        className="sideNav__view sideNav__view--account"
        aria-hidden={!accountOpen}
      >
        <div className="sideNav__accountHead">
          <button
            type="button"
            className="sideNav__back"
            onClick={() => setAccountOpen(false)}
            aria-label="Back to navigation"
            tabIndex={accountOpen ? 0 : -1}
          >
            <FaArrowLeft />
          </button>
          <span className="sideNav__accountTitle">Account</span>
        </div>
        <div className="sideNav__accountBody">
          <ProfileMenu variant="inline" />
        </div>
      </div>
    </aside>
  );
};

export default SideNav;
