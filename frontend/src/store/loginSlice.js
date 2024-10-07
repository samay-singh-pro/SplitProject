import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import BASE_URL from "../config";

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
      toast.success("Logged in successfully!");
      return response.data;
    } catch (error) {
      toast.error("Login failed. Please check your credentials.");
      return rejectWithValue(error.response.data || error.message);
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
        state.error = action.payload;
      });
  },
});

export const { logout } = loginSlice.actions;
export default loginSlice.reducer;
