import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import BASE_URL from "../config";

// All invite-related state lives in its own slice so the popover's
// badge + list can subscribe without dragging the whole user store
// into re-renders.

const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const fetchInvites = createAsyncThunk(
  "invite/fetchInvites",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}/invite/me`, {
        headers: auth(),
      });
      return res.data.invites || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Optimistic: remove the invite locally as soon as the user clicks,
// rollback on failure. Matches the popover's "respond and it's gone"
// micro-interaction.
export const respondInviteThunk = createAsyncThunk(
  "invite/respond",
  async ({ id, action }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(
        `${BASE_URL}/invite/${id}`,
        { action },
        { headers: auth() }
      );
      return { id, action, ...res.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

const inviteSlice = createSlice({
  name: "invite",
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    // For optimistic UI before the network round-trip resolves.
    removeInviteLocal(state, action) {
      state.list = state.list.filter((i) => i._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvites.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchInvites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to load invites";
      });

    builder
      .addCase(respondInviteThunk.fulfilled, (state, action) => {
        state.list = state.list.filter((i) => i._id !== action.payload.id);
      })
      .addCase(respondInviteThunk.rejected, (state, action) => {
        state.error =
          action.payload?.message || "Failed to respond to invite";
      });
  },
});

export const { removeInviteLocal } = inviteSlice.actions;
export default inviteSlice.reducer;
