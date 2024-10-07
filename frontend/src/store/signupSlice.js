import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import BASE_URL from "../config";
import axios from "axios";

export const signupUser = createAsyncThunk(
  "signup/signupUser",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${BASE_URL}/user/signup`, formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        let message = errorData?.message || "";
        if (errorData?.errors) {
          errorData.errors.forEach((element) => {
            message += `${element?.msg}. `;
          });
        }
        return rejectWithValue(message || "Failed to sign up");
      }
      return rejectWithValue(error.message || "Internal server error");
    }
  }
);

const signupSlice = createSlice({
  name: "signup",
  initialState: {
    loading: false,
    success: false,
    error: null,
  },
  reducers: {
    resetState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetState } = signupSlice.actions;
export default signupSlice.reducer;
