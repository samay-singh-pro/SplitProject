import { useState, useEffect } from "react";
import "./Navbar.scss";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import ProfileMenu from "./ProfileMenu/ProfileMenu";

// Lean top bar.
// - Logged out (on landing): brand + Theme + "Sign in" / "Get started" CTAs.
// - Logged in (dashboard): brand + Theme + Logout. Nav happens via SideNav,
//   so we don't bloat the top bar with redundant links.
// - On auth pages (Login/Signup): minimal — brand + Theme only. The two-pane
//   auth screens own their own CTAs.
const Navbar = ({ onDashboard = false }) => {
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.login);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <nav
      className={`navbar ${scrolled ? "navbar--scrolled" : ""} ${
        onDashboard ? "navbar--on-dashboard" : ""
      }`}
    >
      <Link
        to={isAuthenticated ? "/dashboard" : "/"}
        className="navbar__brand"
        aria-label="splitit home"
      >
        <span className="brandMark">splitit</span>
      </Link>

      <div className="navbar__actions">
        {!isAuthenticated && !onAuthPage && (
          <>
            <Link to="/login" className="navbar__link">
              Sign in
            </Link>
            <Link to="/signup" className="navbar__cta">
              Get started
            </Link>
          </>
        )}

        {/* Theme + sign-out now live inside the ProfileMenu popover.
            Keeping them off the top bar removes the accidental-logout
            risk and de-clutters the public chrome. */}
        {isAuthenticated && <ProfileMenu align="right" />}
      </div>
    </nav>
  );
};

export default Navbar;
