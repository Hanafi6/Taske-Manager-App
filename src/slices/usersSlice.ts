import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getData, postData, deleteData } from "../api/api";
import type { User } from "../types";

interface UsersState {
  list: User[];
  loading: boolean;
  error: string | null;
}

export interface AddUserPayload {
  name: string;
  email: string;
  role?: string;
  password?: string;
}

const initialState: UsersState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
  "users/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getData<User[]>("users");
      return Array.isArray(data) ? data : [];
    } catch (e: unknown) {
      if (e instanceof Error) {
        return rejectWithValue(e.message || "Failed to fetch users");
      }
      return rejectWithValue("Unknown error occurred");
    }
  }
);

export const addUser = createAsyncThunk<User, AddUserPayload, { rejectValue: string }>(
  "users/add",
  async (user, { rejectWithValue }) => {
    try {
      const data = await postData<AddUserPayload & { id?: string | number }>("users", user);
      return data as User;
    } catch (e: unknown) {
      if (e instanceof Error) {
        return rejectWithValue(e.message || "Failed to add user");
      }
      return rejectWithValue("Unknown error occurred");
    }
  }
);

export const deleteUser = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("users/delete", async (id, { rejectWithValue }) => {
  try {
    await deleteData("users", String(id));
    return id;
  } catch (e: unknown) {
    if (e instanceof Error) {
      return rejectWithValue(e.message || "Failed to delete user");
    }
    return rejectWithValue("Unknown error occurred");
  }
});

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message ?? null;
      })
      .addCase(addUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.list.push(action.payload);
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string | number>) => {
        state.list = state.list.filter((u) => String(u.id) !== String(action.payload));
      });
  },
});

export default usersSlice.reducer;
