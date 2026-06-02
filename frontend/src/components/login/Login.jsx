import { useState, useEffect } from "react";
import "./Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/loginSlice";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

// Two-pane auth screen. Form left, branded panel right (desktop).
// Mobile collapses to single column form with a small branded strip on top.

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [info, setInfo] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.login
  );

  const emailError =
    touched.email && (!email
      ? "Email is required."
      : !/\S+@\S+\.\S+/.test(email)
      ? "That doesn't look like a valid email."
      : "");
  const passwordError =
    touched.password && (!password
      ? "Password is required."
      : password.length < 6
      ? "At least 6 characters, please."
      : "");

  const canSubmit =
    email && password && !emailError && !passwordError && !loading;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setInfo("");
    if (!email || !password) return;
    if (emailError || passwordError) return;
    dispatch(loginUser({ email, password }));
  };

  // Silent success — just navigate. The destination screen IS the
  // success feedback, no need for a popup.
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  return (
    <div className="authPage">
      {/* Left: form */}
      <section className="authPage__form-pane">
        <div className="authPage__form-wrap">
          <header className="authPage__form-head">
            <h1>Welcome back</h1>
            <p>Sign in to pick up where you left off.</p>
          </header>

          {/* Inline banner replaces the floating toast. Backend errors
              from the loginUser thunk appear here, plus the "forgot
              password — coming soon" notice. */}
          {(error || info) && (
            <div
              className={`authPage__alert ${
                info ? "authPage__alert--info" : "authPage__alert--error"
              }`}
              role="alert"
            >
              {info ? <FaCheckCircle /> : <FaExclamationCircle />}
              <span>{info || error}</span>
            </div>
          )}

          <form className="authPage__form" onSubmit={handleSubmit} noValidate>
            <div
              className={`authPage__field ${
                emailError ? "authPage__field--error" : ""
              }`}
            >
              <label htmlFor="login-email">Email</label>
              <div className="authPage__input">
                <FaEnvelope />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="you@example.com"
                />
              </div>
              {emailError && (
                <span className="authPage__error">{emailError}</span>
              )}
            </div>

            <div
              className={`authPage__field ${
                passwordError ? "authPage__field--error" : ""
              }`}
            >
              <label htmlFor="login-password">Password</label>
              <div className="authPage__input">
                <FaLock />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  className="authPage__reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {passwordError && (
                <span className="authPage__error">{passwordError}</span>
              )}
            </div>

            <div className="authPage__row">
              <span />
              <button
                type="button"
                className="authPage__inline-link"
                onClick={() =>
                  setInfo("Password reset will be live shortly.")
                }
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="authPage__submit"
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <FaArrowRight />
                </>
              )}
            </button>
          </form>

          <p className="authPage__alt">
            New here?{" "}
            <Link to="/signup" className="authPage__alt-link">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      {/* Right: branded panel with stylized mock card */}
      <aside className="authPage__brand-pane" aria-hidden>
        <div className="authPage__brand-glow" />
        <div className="authPage__brand-orb authPage__brand-orb--a" />
        <div className="authPage__brand-orb authPage__brand-orb--b" />
        <div className="authPage__brand-content">
          <div className="brandMark-orbit authPage__brand-orbit">
            <span className="brandMark brandMark--lg">splitit</span>
          </div>
          <p className="authPage__brand-tag">
            Track shared spends with no drama. Built for trips, roommates, and
            that friend who always picks up the bill.
          </p>

          <ul className="authPage__brand-list">
            <li>
              <FaCheckCircle /> Cent-precise math, no rounding surprises
            </li>
            <li>
              <FaCheckCircle /> Direct or simplified settlements
            </li>
            <li>
              <FaCheckCircle /> Edit any expense, anytime
            </li>
          </ul>

          <div className="authPage__mock-wrap">
            {/* Animated toast that slides in */}
            <div className="authPage__mock-toast">
              <span className="authPage__mock-toast-dot" />
              <div>
                <strong>Settlement recorded</strong>
                <small>Alex paid Jordan ₹825</small>
              </div>
            </div>

            <div className="authPage__mock">
              <div className="authPage__mock-head">
                <span>Goa weekend</span>
                <small>3 settlements</small>
              </div>
              <div className="authPage__mock-row">
                <span className="authPage__mock-av">AL</span>
                <em>Alex → Jordan</em>
                <strong>₹825</strong>
              </div>
              <div className="authPage__mock-row">
                <span className="authPage__mock-av authPage__mock-av--alt">
                  SA
                </span>
                <em>Sam → Riley</em>
                <strong>₹175</strong>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Login;
