import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import BASE_URL from "../config";

export const getAllExpenses = createAsyncThunk(
  "expense/getAllExpenses",
  async (groupId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/expense/getAll/${groupId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.expenses;
    } catch (error) {
      toast.error("Failed to load expenses.");
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const addExpense = createAsyncThunk(
  "expense/addExpense",
  async (expenseData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URL}/expense/add`,
        expenseData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Expense added successfully!");
      return response.data;
    } catch (error) {
      toast.error("Failed to add expense.");
      return rejectWithValue(error.response.data);
    }
  }
);

export const updateExpense = createAsyncThunk(
  "expense/updateExpense",
  async ({ expenseId, ...payload }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${BASE_URL}/expense/${expenseId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Expense updated.");
      return { expenseId, ...response.data };
    } catch (error) {
      const data = error.response?.data;
      const firstFieldError =
        data?.errors && typeof data.errors === "object"
          ? Object.values(data.errors)[0]
          : null;
      toast.error(firstFieldError || data?.message || "Failed to update expense.");
      return rejectWithValue(data || { message: error.message });
    }
  }
);

export const deleteExpense = createAsyncThunk(
  "expense/deleteExpense",
  async (expenseId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/expense/${expenseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Expense deleted.");
      return expenseId;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete expense."
      );
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

const expenseSlice = createSlice({
  name: "expense",
  initialState: {
    expenses: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(addExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addExpense.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    builder
      .addCase(getAllExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload;
      })
      .addCase(getAllExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
    builder
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter(
          (e) => (e._id || "").toString() !== action.payload?.toString?.()
        );
      });
    // Note: we don't merge updateExpense.fulfilled into state here —
    // the response payload differs in shape from the populated GET, so
    // callers refetch (getAllExpenses + fetchGroupStats) after a save
    // to keep view consistent.
  },
});

export default expenseSlice.reducer;
