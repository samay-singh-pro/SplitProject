import React, { useEffect, useState } from "react";
import signup from "../../assets/login.jpg";
import secure from "../../assets/secure.png";
import "./Signup.scss";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signupUser, resetState } from "../../store/signupSlice.js";
import { toast } from "react-toastify";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, success, error } = useSelector((state) => state.signup);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasError = false;
    if (formData.password !== formData.confirmPassword) {
      hasError = true;
      toast.error("password do not match!");
    }
    if (formData.password.length < 6) {
      console.log(formData.password);
      hasError = true;
      toast.error("password must be min 6 characters");
    }

    if (!emailRegex.test(formData.email)) {
      hasError = true;
      toast.error("please enter a valid email");
    }
    if (!hasError) {
      dispatch(signupUser(formData));
    }
  };

  useEffect(() => {
    if (success) {
      toast.success("Signup successful! Redirecting to login..,");
      setTimeout(() => {
        navigate("/login");
        dispatch(resetState());
      }, 2000);
    }
    if (error) {
      toast.error(error);
    }
  }, [success, error, navigate, dispatch]);

  return (
    <div className="signup">
      <div className="signup__image">
        <img src={signup} alt="SignUp" />
      </div>
      <div className="signup__section">
        <h3>SignUp</h3>
        <form onSubmit={handleSubmit}>
          <div className="input">
            <label htmlFor="email">Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input">
            <label htmlFor="username">Username</label>
            <input
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input">
            <label htmlFor="password">Password</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Signing Up..." : "Signup"}
          </button>
        </form>
        <div className="links">
          <a>having trouble ?</a>
          <Link to="/login">SignIn</Link>
        </div>
        <div className="secure">
          <img src={secure} alt="" />
        </div>
      </div>
    </div>
  );
};

export default Signup;
