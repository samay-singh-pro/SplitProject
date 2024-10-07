import React, { useState } from "react";
import logo from "../assets/logo.png";
import "./Navbar.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faInfoCircle,
  faConciergeBell,
  faSignOutAlt,
  faSignInAlt,
  faEnvelope,
  faTachometerAlt,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, logoutUser } from "../store/loginSlice";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.login);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(logout());
    setIsOpen(!isOpen);
    navigate("/login");
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar__logo">
          <img src={logo} alt="logo" />
        </div>
        <div className="navbar__links stylish-border">
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About us</Link>
            </li>
            <li>
              <Link to="/offerings">Our offerings</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div className="navbar__login">
          {isAuthenticated ? (
            <button onClick={handleLogout}>Logout</button>
          ) : (
            <button>
              <Link to="/login">Login</Link>
            </button>
          )}
        </div>
        <div className="menu-icon" onClick={toggleMenu}>
          {!isOpen ? <div>&#9776;</div> : <div>&#10006;</div>}
        </div>

        {/* Side menu */}
        <nav className={`side-menu ${isOpen ? "open" : "closed"}`}>
          <div className="title">Welcome to SplitIt</div>
          <ul>
            <li onClick={toggleMenu}>
              <FontAwesomeIcon className="icon home" icon={faHome} />
              <Link to="/">Home</Link>
            </li>
            {isAuthenticated ? (
              <li onClick={toggleMenu}>
                <FontAwesomeIcon  className="icon dash" icon={faTachometerAlt}/><Link to='/dashboard'>Dashboard</Link>
              </li>
            ) : (
              ""
            )}
            <li onClick={toggleMenu}>
              <FontAwesomeIcon className="icon about" icon={faInfoCircle} />{" "}
              <Link to="/about">About us</Link>
            </li>
            <li onClick={toggleMenu}>
              <FontAwesomeIcon className="icon offer" icon={faConciergeBell} />{" "}
              <Link to="/offerings">Our offerings</Link>
            </li>
            <li onClick={toggleMenu}>
              <FontAwesomeIcon className="icon contact" icon={faEnvelope} />{" "}
              <Link to="/contact"> Contact Us</Link>
            </li>
            {isAuthenticated ? (
              <li onClick={handleLogout}>
                <FontAwesomeIcon className="icon logout" icon={faSignOutAlt} />{" "}
                <Link> Log Out</Link>
              </li>
            ) : (
              <li onClick={toggleMenu}>
                <FontAwesomeIcon className="icon logout" icon={faSignInAlt} />{" "}
                <Link to="login"> Log in</Link>
              </li>
            )}
          </ul>
        </nav>
      </nav>
    </>
  );
};

export default Navbar;
