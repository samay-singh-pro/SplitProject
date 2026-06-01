import { useEffect, useState } from "react";
// Reuse the .authPage two-pane styles defined for Login.
import "../login/Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signupUser, resetState } from "../../store/signupSlice.js";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaArrowRight,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, success, error } = useSelector((state) => state.signup);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const markTouched = (field) =>
    setTouched((t) => ({ ...t, [field]: true }));

  // Field-level validation only after the user has interacted.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailError =
    touched.email && (!formData.email
      ? "Email is required."
      : !emailRegex.test(formData.email)
      ? "That doesn't look like a valid email."
      : "");
  const usernameError =
    touched.username && (!formData.username.trim()
      ? "Pick a username so people know it's you."
      : "");
  const passwordError =
    touched.password && (!formData.password
      ? "Password is required."
      : formData.password.length < 6
      ? "At least 6 characters, please."
      : "");
  const confirmError =
    touched.confirmPassword && formData.confirmPassword &&
    formData.confirmPassword !== formData.password
      ? "Passwords don't match."
      : "";

  const canSubmit =
    formData.email &&
    formData.username &&
    formData.password &&
    formData.confirmPassword &&
    !emailError &&
    !usernameError &&
    !passwordError &&
    !confirmError &&
    !loading;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({
      email: true,
      username: true,
      password: true,
      confirmPassword: true,
    });
    if (!canSubmit) return;
    dispatch(signupUser(formData));
  };

  // Signup auto-logs the user in (loginSlice consumes signupUser.fulfilled
  // and sets the session), so send them straight to the dashboard. A brief
  // success beat is shown inline before navigating.
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        navigate("/dashboard");
        dispatch(resetState());
      }, 900);
      return () => clearTimeout(t);
    }
  }, [success, navigate, dispatch]);

  return (
    <div className="authPage">
      {/* Left: form */}
      <section className="authPage__form-pane">
        <div className="authPage__form-wrap">
          <header className="authPage__form-head">
            <h1>Create your account</h1>
            <p>Track shared spends with your people in under a minute.</p>
          </header>

          {/* Inline banner — replaces floating toast for success + errors. */}
          {(success || error) && (
            <div
              className={`authPage__alert ${
                success ? "authPage__alert--info" : "authPage__alert--error"
              }`}
              role="alert"
            >
              {success ? <FaCheckCircle /> : <FaExclamationCircle />}
              <span>
                {success
                  ? "Account created — taking you to sign in…"
                  : error}
              </span>
            </div>
          )}

          <form className="authPage__form" onSubmit={handleSubmit} noValidate>
            <div
              className={`authPage__field ${
                emailError ? "authPage__field--error" : ""
              }`}
            >
              <label htmlFor="su-email">Email</label>
              <div className="authPage__input">
                <FaEnvelope />
                <input
                  id="su-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => markTouched("email")}
                  placeholder="you@example.com"
                />
              </div>
              {emailError && (
                <span className="authPage__error">{emailError}</span>
              )}
            </div>

            <div
              className={`authPage__field ${
                usernameError ? "authPage__field--error" : ""
              }`}
            >
              <label htmlFor="su-username">Username</label>
              <div className="authPage__input">
                <FaUser />
                <input
                  id="su-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={() => markTouched("username")}
                  placeholder="How should we call you?"
                />
              </div>
              {usernameError && (
                <span className="authPage__error">{usernameError}</span>
              )}
            </div>

            <div
              className={`authPage__field ${
                passwordError ? "authPage__field--error" : ""
              }`}
            >
              <label htmlFor="su-password">Password</label>
              <div className="authPage__input">
                <FaLock />
                <input
                  id="su-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => markTouched("password")}
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

            <div
              className={`authPage__field ${
                confirmError ? "authPage__field--error" : ""
              }`}
            >
              <label htmlFor="su-confirm">Confirm password</label>
              <div className="authPage__input">
                <FaLock />
                <input
                  id="su-confirm"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => markTouched("confirmPassword")}
                  placeholder="Same as above"
                />
                <button
                  type="button"
                  className="authPage__reveal"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={
                    showConfirm ? "Hide password" : "Show password"
                  }
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {confirmError && (
                <span className="authPage__error">{confirmError}</span>
              )}
            </div>

            <button
              type="submit"
              className="authPage__submit"
              disabled={!canSubmit}
            >
              {loading ? (
                "Creating account…"
              ) : (
                <>
                  Create account <FaArrowRight />
                </>
              )}
            </button>
          </form>

          <p className="authPage__alt">
            Already have an account?{" "}
            <Link to="/login" className="authPage__alt-link">
              Sign in
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
            Group expenses, settled in the fewest steps. No spreadsheets, no
            awkward reminders.
          </p>

          <ul className="authPage__brand-list">
            <li>
              <FaCheckCircle /> Free for personal use
            </li>
            <li>
              <FaCheckCircle /> Add members by name — no accounts needed
            </li>
            <li>
              <FaCheckCircle /> Real-time settlement math
            </li>
          </ul>

          <div className="authPage__mock-wrap">
            {/* Animated toast that slides in */}
            <div className="authPage__mock-toast">
              <span className="authPage__mock-toast-dot" />
              <div>
                <strong>Expense added</strong>
                <small>&quot;pizza for friends&quot; → Dining 🍕</small>
              </div>
            </div>

            <div className="authPage__mock">
              <div className="authPage__mock-head">
                <span>Goa trip 2026</span>
                <small>Net balances</small>
              </div>
              <div className="authPage__mock-row">
                <span className="authPage__mock-av">JO</span>
                <em>Jordan</em>
                <strong className="authPage__mock-pos">+ ₹1,025</strong>
              </div>
              <div className="authPage__mock-row">
                <span className="authPage__mock-av authPage__mock-av--alt">
                  AL
                </span>
                <em>Alex</em>
                <strong className="authPage__mock-neg">− ₹825</strong>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Signup;
