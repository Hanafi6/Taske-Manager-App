// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "../slices/usersSlice";
import projectsReducer from "../slices/projectsSlice";
import Auth from '../slices/AuthSlice';
import notificationsReducer from '../slices/notificationsSlice';
import ModalsSlice from "../slices/Modals";
// لو هتشغل الـ listener بعدين، فك الكومنت عن السطر ده:
import { listenerMiddleware } from "./listeners";

export const store = configureStore({
  reducer: {
    users: usersReducer,
    projects: projectsReducer,
    auth: Auth,
    notifications: notificationsReducer,
    modals: ModalsSlice,
  },

  // الـ Middleware جاهز ومكتوب بـ TypeScript عشان لما تحب تفك الكومنت عنه

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)

});

/* ------------------ TypeScript Types ------------------ */

export type RootState = ReturnType<typeof store.getState>;

// 2. نوع الـ Dispatch (عشان الـ useDispatch يعرف الثنكس والأكشنز)
export type AppDispatch = typeof store.dispatch;