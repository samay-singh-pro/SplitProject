import { useState } from "react";
// Reuse the .authPage two-pane styles from Login.
import "./Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { forgotPassword, resetPassword } from "../../store/loginSlice";
import {
  FaEnvelope,
  FaLock,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("request"); // "request" | "verify"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const requestCode = async (e) => {
    e?.preventDefault?.();
    setError("");
    setInfo("");
    if (!emailRegex.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    const action = await dispatch(forgotPassword(email.trim()));
    setLoading(false);
    if (action.meta.requestStatus === "fulfilled") {
      setPhase("verify");
      setInfo(`If an account exists for ${email.trim()}, a 6-digit code is on its way.`);
    } else {
      setError(action.payload?.message || "Couldn't send the code. Try again.");
    }
  };

  const submitReset = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const action = await dispatch(
      resetPassword({ email: email.trim(), otp: otp.trim(), password })
    );
    setLoading(false);
    if (action.meta.requestStatus === "fulfilled") {
      toast.success("Password updated. Please log in.");
      navigate("/login");
    } else {
      setError(
        action.payload?.errors?.otp ||
          action.payload?.message ||
          "Couldn't reset your password. Try again."
      );
    }
  };

  return (
    <div className="authPage">
      <section className="authPage__form-pane">
        <div className="authPage__form-wrap">
          <header className="authPage__form-head">
            <h1>Reset your password</h1>
            <p>
              {phase === "request"
                ? "Enter your email and we'll send you a reset code."
                : "Enter the code we emailed you and choose a new password."}
            </p>
          </header>

          {(error || info) && (
            <div
              className={`authPage__alert ${
                error ? "authPage__alert--error" : "authPage__alert--info"
              }`}
              role="alert"
            >
              {error ? <FaExclamationCircle /> : <FaCheckCircle />}
              <span>{error || info}</span>
            </div>
          )}

          {phase === "request" ? (
            <form className="authPage__form" onSubmit={requestCode} noValidate>
              <div className="authPage__field">
                <label htmlFor="rp-email">Email</label>
                <div className="authPage__input">
                  <FaEnvelope />
                  <input
                    id="rp-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="authPage__submit"
                disabled={loading || !email}
              >
                {loading ? "Sending…" : (<>Send reset code <FaArrowRight /></>)}
              </button>
            </form>
          ) : (
            <form className="authPage__form" onSubmit={submitReset} noValidate>
              <div className="authPage__field">
                <label htmlFor="rp-otp">6-digit code</label>
                <div className="authPage__input">
                  <FaKey />
                  <input
                    id="rp-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="authPage__field">
                <label htmlFor="rp-pass">New password</label>
                <div className="authPage__input">
                  <FaLock />
                  <input
                    id="rp-pass"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    className="authPage__reveal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="authPage__field">
                <label htmlFor="rp-confirm">Confirm password</label>
                <div className="authPage__input">
                  <FaLock />
                  <input
                    id="rp-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Same as above"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="authPage__submit"
                disabled={loading}
              >
                {loading ? "Resetting…" : (<>Reset password <FaArrowRight /></>)}
              </button>

              <div className="authPage__row">
                <button
                  type="button"
                  className="authPage__inline-link"
                  onClick={requestCode}
                  disabled={loading}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  className="authPage__inline-link"
                  onClick={() => {
                    setPhase("request");
                    setError("");
                    setInfo("");
                    setOtp("");
                  }}
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          <p className="authPage__alt">
            <Link to="/login" className="authPage__alt-link">
              <FaArrowLeft style={{ marginRight: 6 }} />
              Back to sign in
            </Link>
          </p>
        </div>
      </section>

      <aside className="authPage__brand-pane" aria-hidden>
        <div className="authPage__brand-glow" />
        <div className="authPage__brand-content">
          <div className="brandMark-orbit authPage__brand-orbit">
            <span className="brandMark brandMark--lg">splitit</span>
          </div>
          <p className="authPage__brand-tag">
            Forgot it happens. We&apos;ll get you back to splitting in a
            minute.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default ResetPassword;
