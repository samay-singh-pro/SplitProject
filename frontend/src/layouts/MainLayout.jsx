import React from "react";
import Navbar from "../components/Navbar";
import Home from "../components/home/Home";
import Footer from "../components/Footer/Footer";
import Login from "../components/login/Login";
import Signup from "../components/SignUp/Signup";
import DashboardLayout from "./DashboardLayout";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";
import ContactUs from "../components/ContactUs/ContactUs";
import AboutUs from "../components/AboutUs/AboutUs";
import Offerings from "../components/OurOffering/OurOffering";
import NotFound from "../components/NotFound/NotFound";

const MainLayout = () => {
  const { isAuthenticated } = useSelector((state) => state.login); // Check the authentication state

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
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
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DashboardLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/offerings" element={<Offerings />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default MainLayout;
