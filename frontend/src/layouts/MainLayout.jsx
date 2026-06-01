import Navbar from "../components/Navbar";
import Home from "../components/home/Home";
import Login from "../components/login/Login";
import ResetPassword from "../components/login/ResetPassword";
import Signup from "../components/SignUp/Signup";
import DashboardLayout from "./DashboardLayout";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getMe } from "../store/loginSlice";
import NotFound from "../components/NotFound/NotFound";

// Navbar shows on public routes only. The dashboard owns its own chrome
// (SideNav rail with logout + theme), so a second top bar would be noise.
const InnerLayout = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.login);
  const location = useLocation();
  const onDashboard = location.pathname === "/dashboard";

  // On boot (or whenever we believe we're authenticated), verify the
  // stored token against the server. If the account is gone or the token
  // is stale, getMe 401s and the global interceptor logs the user out —
  // which flips the route guards over to /login automatically.
  useEffect(() => {
    if (isAuthenticated) dispatch(getMe());
  }, [isAuthenticated, dispatch]);

  return (
    <>
      {/* Navbar is rendered everywhere; CSS hides it on desktop dashboard
          where the SideNav rail carries theme + logout itself. On mobile
          dashboard the Navbar stays visible because the SideNav becomes
          a bottom tab bar with no room for theme/logout. */}
      <Navbar onDashboard={onDashboard} />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Home />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <ResetPassword />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DashboardLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const MainLayout = () => (
  <Router>
    <InnerLayout />
  </Router>
);

export default MainLayout;
