import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import BASE_URL from "../config";

export const createGroup = createAsyncThunk(
  "group/createGroup",
  async (groupData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${BASE_URL}/group/create`, groupData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchGroups = createAsyncThunk(
  "group/fetchGroups",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BASE_URL}/group/getAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.groups;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const groupSlice = createSlice({
  name: "group",
  initialState: {
    groups: [],
    success: false,
    loading: false,
    error: null,
  },
  reducers: {
    resetGroupState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.success = false;
      });

    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
export const { resetGroupState } = groupSlice.actions;
export default groupSlice.reducer;
