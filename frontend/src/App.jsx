import React from "react";
import MainLayout from "./layouts/MainLayout";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/notifications.scss";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

const AppContent = () => {
  const { theme } = useTheme();

  return (
    <>
      <MainLayout />
      {/* Compact, native-feeling notifications (styled in
          styles/notifications.scss): slim slide-in, auto-dismiss, capped
          stack so confirmations never pile into a wall, swipe/tap to
          dismiss on phones. */}
      <ToastContainer
        position="top-right"
        theme={theme}
        transition={Slide}
        autoClose={3500}
        hideProgressBar
        newestOnTop
        limit={3}
        closeOnClick
        draggable
        pauseOnHover
      />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
