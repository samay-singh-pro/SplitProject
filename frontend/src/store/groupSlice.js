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
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const authHeader = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

export const updateGroup = createAsyncThunk(
  "group/updateGroup",
  async ({ groupId, data }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/group/${groupId}`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...authHeader(),
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

export const deleteGroup = createAsyncThunk(
  "group/deleteGroup",
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${BASE_URL}/group/${groupId}`, {
        headers: authHeader(),
      });
      return { groupId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

export const addGroupMember = createAsyncThunk(
  "group/addGroupMember",
  async ({ groupId, name, email }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/group/${groupId}/members`,
        { name, email: email || undefined },
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Add the current user to a group as an accepted member, so expenses
// they pay there flow into their Personal view.
export const includeMe = createAsyncThunk(
  "group/includeMe",
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/group/${groupId}/include-me`,
        {},
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

export const removeGroupMember = createAsyncThunk(
  "group/removeGroupMember",
  async ({ groupId, memberId }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/group/${groupId}/members/${memberId}`,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
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
      .addCase(createGroup.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: action.error.message };
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

    // Helper: replace a group in state by _id.
    const replaceGroup = (state, updated) => {
      if (!updated?._id) return;
      const idx = state.groups.findIndex(
        (g) => g._id?.toString?.() === updated._id?.toString?.()
      );
      if (idx >= 0) state.groups[idx] = updated;
    };

    builder
      .addCase(updateGroup.fulfilled, (state, action) => {
        replaceGroup(state, action.payload);
      })
      .addCase(addGroupMember.fulfilled, (state, action) => {
        replaceGroup(state, action.payload);
      })
      .addCase(includeMe.fulfilled, (state, action) => {
        replaceGroup(state, action.payload);
      })
      .addCase(removeGroupMember.fulfilled, (state, action) => {
        replaceGroup(state, action.payload);
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        const id = action.payload?.groupId?.toString?.();
        if (id) {
          state.groups = state.groups.filter(
            (g) => g._id?.toString?.() !== id
          );
        }
      });
  },
});
export const { resetGroupState } = groupSlice.actions;
export default groupSlice.reducer;
