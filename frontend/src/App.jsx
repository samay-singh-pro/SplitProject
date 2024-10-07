import React from "react";
import MainLayout from "./layouts/MainLayout";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
export default function App() {
  return <><MainLayout></MainLayout><ToastContainer position="top-right" theme="light" /></>;
}
