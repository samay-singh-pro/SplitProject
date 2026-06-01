import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import App from "./App.jsx";
import "./index.css";
import { Provider } from "react-redux";
import store from "./store/store.js";
import { logout } from "./store/loginSlice.js";

// Global auth guard: any 401 from the API while a session token exists
// means that session is no longer valid (expired token, deleted account,
// DB reset, blacklisted token). Reset auth state so the route guards
// bounce the user to /login. We gate on a token being present so a 401
// from the login/signup screens (e.g. bad credentials) is left alone.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
