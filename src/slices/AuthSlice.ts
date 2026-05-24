import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getData } from "../api/api"; // تأكد من صحة مسار ملف الـ API بتاعك

// تعريف أنواع البيانات
export interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  password?: string; // الباسورد جاي من الـ server وممكن نحذفه قبل التخزين للأمان
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  error: string | null;
  usersList?: User[];
}

// جلب البيانات الكاش من الـ LocalStorage
const storedUser = localStorage.getItem("user");
const storedToken = localStorage.getItem("token");

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken ? storedToken : null,
  isAuthenticated: !!storedToken,
  authLoading: false,
  error: null,
};

// 🟦 الـ Async Thunk المسؤول عن عملية تسجيل الدخول
export const LogIn = createAsyncThunk(
  "auth/loginUser",
  async (formData: { identifier: string; password?: string }, thunkAPI) => {
    try {
      // 1. هنجيب كل المستخدمين من الـ json-server
      const users: User[] = await getData("users");

      // 2. ندور على المستخدم المطابق للإيميل أو الاسم، ومعاه الباسورد
      const foundUser = users.find(
        (u) =>
          (u.email === formData.identifier || u.name === formData.identifier) &&
          u.password === formData.password
      );

      if (!foundUser) {
        // لو مش موجود يرمي إيرور يروح للـ catch في الـ component
        return thunkAPI.rejectWithValue("اسم المستخدم أو كلمة المرور غير صحيحة");
      }

      // 3. لو تمام، بنعمل Token وهمي بما إننا شغالين بـ json-server
      const fakeToken = `fake-jwt-token-for-user-${foundUser.id}`;

      // بنشيل الباسورد من الـ object قبل ما نخزنه في الـ state أو الـ LocalStorage للأمان
      const { password, ...userWithoutPassword } = foundUser;

      return { user: userWithoutPassword, token: fakeToken };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "حدث خطأ أثناء الاتصال بالسيرفر");
    }
  }
);



const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // 🟥 تسجيل الخروج
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },

    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.error = null;

      // حفظ في الـ LocalStorage
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
    },


    // ⚠️ تعيين خطأ يدوي لو محتاجه في الـ Components
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    // 🧹 مسح الأخطاء
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  // التعامل مع حالات الـ Thunk
  extraReducers: (builder) => {
    builder
      .addCase(LogIn.pending, (state) => {
        state.authLoading = true;
        state.error = null;
      })
      .addCase(LogIn.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.authLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;

        // التخزين في المتصفح عشان الـ Refresh
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        localStorage.setItem("token", action.payload.token);
      })
      .addCase(LogIn.rejected, (state, action) => {
        state.authLoading = false;
        state.error = action.payload as string;
      })
  },
});

export const { logout, setCredentials, setAuthError, clearAuthError } = authSlice.actions;
export default authSlice.reducer;