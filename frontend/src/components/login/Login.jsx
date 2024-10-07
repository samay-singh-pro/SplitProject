import React, { useState, useEffect } from "react";
import loginImage from "../../assets/login.jpg";
import secureImage from "../../assets/secure.png";
import "./Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/loginSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.login
  );

  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  const validate = () => {
    let isValid = true;
    if (!email) {
      toast.error("Email is required", {
        position: "top-right",
        autoClose: 3000,
      });
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Invalid email format", {
        position: "top-right",
        autoClose: 3000,
      });
      isValid = false;
    }
    if (!password) {
      toast.error("Password is required", {
        position: "top-right",
        autoClose: 3000,
      });
      isValid = false;
    } else if (password.length < 6) {
      toast.error("Password must be at least 6 characters long", {
        position: "top-right",
        autoClose: 3000,
      });
      isValid = false;
    }
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      dispatch(loginUser({ email, password }));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      toast.success("Login successful!", {
        position: "top-right",
        autoClose: 3000,
      });
      navigate("/");
    }

    if (error) {
      toast.error(error, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  }, [isAuthenticated, error, navigate]);

  return (
    <div className="login">
      <div className="login__section">
        <h3>Login</h3>
        <form onSubmit={handleSubmit}>
          <div className="input">
            <label htmlFor="email">Email</label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input">
            <label htmlFor="password">Password</label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="links">
          <a href="">Reset password</a>
          <Link to="/signup">SignUp</Link>
        </div>

        <div className="secure">
          <img src={secureImage} alt="Secure" />
        </div>
      </div>

      <div className="login__image">
        <img src={loginImage} alt="Login Illustration" />
      </div>
    </div>
  );
};

export default Login;
