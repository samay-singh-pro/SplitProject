import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import BASE_URL from "../config";

export const fetchGroupStats = createAsyncThunk(
  "stats/fetchGroupStats",
  async (groupId, { rejectWithValue }) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${BASE_URL}/group/${groupId}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Stats fetched successfully");
      return response.data;
    } catch (error) {
      toast.error("Failed to add expense.");
      return rejectWithValue(error.response.data);
    }
  }
);

const statsSlice = createSlice({
  name: "stats",
  initialState: {
    stats: null,
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroupStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchGroupStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default statsSlice.reducer;
