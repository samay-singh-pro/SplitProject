import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaChevronDown,
  FaCheck,
  FaSun,
  FaMoon,
  FaCoins,
  FaEnvelope,
  FaTimes,
} from "react-icons/fa";
import { useTheme } from "../../contexts/ThemeContext";
import {
  logout,
  logoutUser,
  updateProfile,
} from "../../store/loginSlice";
import {
  fetchInvites,
  respondInviteThunk,
  removeInviteLocal,
} from "../../store/inviteSlice";
import { fetchGroups } from "../../store/groupSlice";
import { CATEGORY_EMOJI } from "../../utils/categoryInfer";
import "./ProfileMenu.scss";

// User profile + preferences. The avatar button is the only surface;
// everything (theme, currency, sign-out) lives behind it so the chrome
// stays clean and logout isn't one stray click away.
//
// Two presentations share one body (see `menuBody`):
//   • variant="popover" → compact popover anchored to the trigger. Used
//                         by the Navbar (public pages + mobile dashboard).
//   • variant="inline"  → no trigger, no overlay; renders the body
//                         directly in flow. The desktop SideNav uses this
//                         to morph its rail into an account panel in
//                         place (no pop-up / modal at all).
const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
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

const ProfileMenu = ({ align = "right", variant = "popover" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, isAuthenticated } = useSelector((s) => s.login);
  const { list: invites } = useSelector((s) => s.invite);
  const { theme, toggleTheme } = useTheme();

  const isInline = variant === "inline";

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  // The panel is rendered through a portal to document.body (see below),
  // so it is NOT a DOM descendant of wrapRef. We track it separately so
  // the click-outside handler doesn't treat clicks *inside* the panel as
  // outside clicks (which would close it the instant you touched it).
  const panelRef = useRef(null);
  // Fixed-position coords for the popover, computed from the trigger's
  // bounding rect every time the panel opens (and on scroll/resize).
  // Using `position: fixed` sidesteps the stacking context + clipping
  // issues that came from nesting the popover inside the SideNav rail.
  // (Unused by the drawer, which spans the full viewport height.)
  const [coords, setCoords] = useState(null);

  // Currency is persisted on the User model — the menu reflects
  // userInfo and updates flow through PATCH /me.
  const currencyCode = userInfo?.currency || "INR";
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);

  const currency =
    CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];

  const close = () => {
    setOpen(false);
    setCurrencyOpen(false);
    setConfirmLogout(false);
    setInvitesOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inWrap && !inPanel) close();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Escape closes either surface — expected for a modal-ish drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Hydrate invitations from the backend on mount + whenever auth
  // changes. Also re-fetch when the menu opens so the badge stays
  // honest without polling.
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchInvites());
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (open && isAuthenticated) dispatch(fetchInvites());
  }, [open, isAuthenticated, dispatch]);

  // Compute fixed-position coords whenever the popover opens (and on
  // scroll/resize while it's open). Drawer doesn't anchor to the
  // trigger, so we skip this entirely for it.
  useLayoutEffect(() => {
    if (!open || isInline) return;
    const compute = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const MARGIN = 10; // gap between trigger and panel
      setCoords({
        top: r.bottom + MARGIN,
        right: window.innerWidth - r.right,
      });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, isInline]);

  const inviteCount = invites.length;

  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(logout());
    navigate("/login");
  };

  const pickCurrency = (code) => {
    setCurrencyOpen(false);
    dispatch(updateProfile({ currency: code }));
  };

  // Optimistic invite response — yank the row immediately, then call
  // the API. If the API fails the thunk's rejected case puts the
  // invite back via a refetch (cheaper than tracking rollback state).
  const handleRespond = async (id, action) => {
    dispatch(removeInviteLocal(id));
    const res = await dispatch(respondInviteThunk({ id, action }));
    if (res.meta.requestStatus === "fulfilled") {
      // Accepted invites unlock groups in our list — refresh.
      if (action === "accept") dispatch(fetchGroups());
    } else {
      dispatch(fetchInvites());
    }
  };

  const name = userInfo?.username || "Account";
  const email = userInfo?.email || "—";
  const isDark = theme === "dark";

  // Shared body for both surfaces (popover + drawer) so the two never
  // drift. Containers below just wrap this with their own chrome.
  const menuBody = (
    <>
      {/* Identity */}
      <div className="profileMenu__id">
        <span className="profileMenu__avatar profileMenu__avatar--lg">
          {initials(name)}
        </span>
        <div className="profileMenu__id-meta">
          <strong>{name}</strong>
          <small>{email}</small>
        </div>
      </div>

      <div className="profileMenu__divider" />

      {/* Invitations — only rendered when there are pending ones.
          Collapsed teaser by default; click to expand the inline
          list with Accept / Decline per row. */}
      {invites.length > 0 && (
        <div className="profileMenu__invites">
          <button
            type="button"
            className="profileMenu__invites-toggle"
            onClick={() => setInvitesOpen((v) => !v)}
            aria-expanded={invitesOpen}
          >
            <span className="profileMenu__invites-icon">
              <FaEnvelope />
            </span>
            <div className="profileMenu__invites-label">
              <strong>
                {invites.length} group invite{invites.length === 1 ? "" : "s"}
              </strong>
              <small>Tap to review</small>
            </div>
            <FaChevronDown
              className={`profileMenu__row-icon ${
                invitesOpen ? "profileMenu__row-icon--open" : ""
              }`}
            />
          </button>

          {invitesOpen && (
            <ul className="profileMenu__invites-list">
              {invites.map((inv) => {
                const emoji = CATEGORY_EMOJI[inv.groupCategory] || "👥";
                return (
                  <li key={inv._id} className="profileMenu__invite">
                    <span className="profileMenu__invite-emoji">{emoji}</span>
                    <div className="profileMenu__invite-meta">
                      <strong>{inv.groupName}</strong>
                      <small>
                        from <em>{inv.inviterName}</em>
                      </small>
                    </div>
                    <div className="profileMenu__invite-actions">
                      <button
                        type="button"
                        className="profileMenu__invite-decline"
                        onClick={() => handleRespond(inv._id, "decline")}
                        aria-label={`Decline ${inv.groupName}`}
                      >
                        <FaTimes />
                      </button>
                      <button
                        type="button"
                        className="profileMenu__invite-accept"
                        onClick={() => handleRespond(inv._id, "accept")}
                      >
                        <FaCheck /> Accept
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="profileMenu__divider" />
        </div>
      )}

      {/* Currency */}
      <div className="profileMenu__row">
        <div className="profileMenu__row-label">
          <FaCoins />
          <span>Currency</span>
        </div>
        <button
          type="button"
          className="profileMenu__row-value"
          onClick={() => setCurrencyOpen((v) => !v)}
        >
          <span className="profileMenu__currency-pill">{currency.symbol}</span>
          {currency.code}
          <FaChevronDown
            className={`profileMenu__row-icon ${
              currencyOpen ? "profileMenu__row-icon--open" : ""
            }`}
          />
        </button>

        {currencyOpen && (
          <div className="profileMenu__dropdown" role="listbox">
            {CURRENCIES.map((c) => (
              <button
                type="button"
                key={c.code}
                role="option"
                aria-selected={c.code === currencyCode}
                className={`profileMenu__dropdown-opt ${
                  c.code === currencyCode
                    ? "profileMenu__dropdown-opt--selected"
                    : ""
                }`}
                onClick={() => pickCurrency(c.code)}
              >
                <span className="profileMenu__currency-pill">{c.symbol}</span>
                <span className="profileMenu__dropdown-label">{c.label}</span>
                <small>{c.code}</small>
                {c.code === currencyCode && (
                  <FaCheck className="profileMenu__dropdown-check" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="profileMenu__row">
        <div className="profileMenu__row-label">
          {isDark ? <FaMoon /> : <FaSun />}
          <span>Theme</span>
        </div>
        <button
          type="button"
          className={`profileMenu__switch ${
            isDark ? "profileMenu__switch--on" : ""
          }`}
          onClick={toggleTheme}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle theme"
        >
          <span className="profileMenu__switch-knob">
            {isDark ? <FaMoon /> : <FaSun />}
          </span>
        </button>
      </div>

      <div className="profileMenu__divider" />

      {/* Sign out — kept low-prominence as a quiet link, with a
          two-tap confirm so it can't be hit accidentally. */}
      {!confirmLogout ? (
        <button
          type="button"
          className="profileMenu__signout"
          onClick={() => setConfirmLogout(true)}
        >
          <FaSignOutAlt />
          <span>Sign out</span>
        </button>
      ) : (
        <div className="profileMenu__confirm">
          <span>Sign out of splitit?</span>
          <div className="profileMenu__confirm-actions">
            <button type="button" onClick={() => setConfirmLogout(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="profileMenu__confirm-yes"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Inline variant: just the body, rendered in normal flow. The host
  // (desktop SideNav) owns the open/close + the rail-morph animation, so
  // there's no trigger, portal, or overlay here.
  if (isInline) {
    return <div className="profileMenu profileMenu--inline">{menuBody}</div>;
  }

  return (
    <div className="profileMenu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`profileMenu__trigger ${
          open ? "profileMenu__trigger--open" : ""
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-label={
          inviteCount > 0
            ? `Profile menu, ${inviteCount} pending invites`
            : "Profile menu"
        }
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="profileMenu__avatar">{initials(name)}</span>
        {inviteCount > 0 && (
          <span
            className="profileMenu__badge"
            aria-hidden
            title={`${inviteCount} pending invite${
              inviteCount === 1 ? "" : "s"
            }`}
          >
            {inviteCount > 9 ? "9+" : inviteCount}
          </span>
        )}
      </button>

      {/* Navbar / mobile → compact anchored popover. */}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className={`profileMenu__panel profileMenu__panel--${align}`}
            role="menu"
            style={coords || undefined}
          >
            {menuBody}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProfileMenu;
