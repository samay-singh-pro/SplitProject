import React from "react";
import MainLayout from "./layouts/MainLayout";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

const AppContent = () => {
  const { theme } = useTheme();
  
  return (
    <>
      <MainLayout />
      <ToastContainer position="top-right" theme={theme} />
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
