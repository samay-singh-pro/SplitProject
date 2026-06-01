import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import BASE_URL from "../config";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// The merged personal feed: solo expenses + group expenses the user
// paid (same-currency groups), plus the personal currency.
export const getPersonal = createAsyncThunk(
  "personal/get",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}/personal`, {
        headers: authHeader(),
      });
      return res.data; // { currency, expenses }
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const addPersonal = createAsyncThunk(
  "personal/add",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}/personal`, data, {
        headers: authHeader(),
      });
      toast.success("Expense added.");
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const updatePersonal = createAsyncThunk(
  "personal/update",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(`${BASE_URL}/personal/${id}`, data, {
        headers: authHeader(),
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const deletePersonal = createAsyncThunk(
  "personal/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}/personal/${id}`, {
        headers: authHeader(),
      });
      return id;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

const personalSlice = createSlice({
  name: "personal",
  initialState: { expenses: [], currency: "INR", loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(getPersonal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPersonal.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload.expenses || [];
        state.currency = action.payload.currency || "INR";
      })
      .addCase(getPersonal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to load.";
      });
  },
});

export default personalSlice.reducer;
