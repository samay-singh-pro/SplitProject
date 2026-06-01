import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import BASE_URL from "../config";
import { signupUser } from "./signupSlice";

export const logoutUser = createAsyncThunk("login/logout", async () => {
  const token = localStorage.getItem("token");
  try {
    await axios.post(
      `${BASE_URL}/user/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
  } catch (error) {
    toast.error("Failed to log out. Please try again.");
    throw error;
  }
});

export const loginUser = createAsyncThunk(
  "login/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/user/signin`,
        credentials,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      localStorage.setItem("token", response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data || error.message);
    }
  }
);

// PATCH the current user's profile (currency, invite prefs).
// On success the reducer replaces userInfo so every consumer (header
// avatar, profile menu, currency formatter, etc.) re-renders.
export const updateProfile = createAsyncThunk(
  "login/updateProfile",
  async (patch, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(`${BASE_URL}/user/me`, patch, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Validate the stored token against the server (called on app boot).
// If the account is gone or the token is stale this 401s and the global
// axios interceptor logs the user out; on success we refresh the cached
// userInfo so it never drifts from the server.
export const getMe = createAsyncThunk(
  "login/getMe",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Request a 6-digit reset code by email.
export const forgotPassword = createAsyncThunk(
  "login/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}/user/forgot-password`, {
        email,
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

// Verify the code + set a new password.
export const resetPassword = createAsyncThunk(
  "login/resetPassword",
  async ({ email, otp, password }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}/user/reset-password`, {
        email,
        otp,
        password,
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

const loginSlice = createSlice({
  name: "login",
  initialState: {
    loading: false,
    error: null,
    userInfo: localStorage.getItem("userInfo")
      ? JSON.parse(localStorage.getItem("userInfo"))
      : null,
    token: localStorage.getItem("token") || null,
    isAuthenticated: !!localStorage.getItem("token"),
  },
  reducers: {
    logout: (state) => {
      state.loading = false;
      state.error = null;
      state.userInfo = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
      // Forget the last-selected group too, so the next account that logs
      // in on this browser doesn't inherit a group it can't access.
      localStorage.removeItem("splitit:currentGroupId");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem("userInfo", JSON.stringify(action.payload));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        // Backend rejects with an object ({ message }); normalize to a
        // string so the inline alert can render it directly (rendering
        // the raw object crashes React).
        state.error =
          (typeof action.payload === "string"
            ? action.payload
            : action.payload?.message) || "Login failed. Please try again.";
      });
    builder
      // Auto-login on signup: the backend returns the same { user, token }
      // shape as login, so populate auth state here and skip the login
      // screen entirely (the route guard sends them to the dashboard).
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem("token", action.payload.token);
        localStorage.setItem("userInfo", JSON.stringify(action.payload));
      });
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        // Merge — payload doesn't contain a token, so preserve it.
        state.userInfo = { ...state.userInfo, ...action.payload };
        localStorage.setItem("userInfo", JSON.stringify(state.userInfo));
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload?.message || "Failed to update profile";
      });
    builder
      // Boot validation succeeded — refresh the cached user. Failure is
      // handled globally by the 401 interceptor (which logs out), so we
      // don't mutate state on getMe.rejected.
      .addCase(getMe.fulfilled, (state, action) => {
        state.userInfo = { ...state.userInfo, ...action.payload };
        localStorage.setItem("userInfo", JSON.stringify(state.userInfo));
      });
  },
});

export const { logout } = loginSlice.actions;
export default loginSlice.reducer;
