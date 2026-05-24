// src/store/notificationsSlice.ts
import { createSlice, createAsyncThunk, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { getData, postData, updateData } from "../api/api";

// 1. تعريف واجهة بيانات الإشعار الأساسية (Notification Interface)
export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    fromUserId: string | number;
    toUserId: string | number;
    projectId: string | number;
    taskId?: string | number | null;
    taskSnapshot?: any | null; // يمكنك استبدال any بـ الـ Interface الخاص بالـ Task إذا كان متاحاً
    status: "unread" | "read" | "dismissed";
    meta?: Record<string, any>;
    createdAt: string;
    isDuplicate?: boolean;
}

// واجهة البيانات المتوقعة عند إرسال طلب إنشاء إشعار جديد
export interface CreateNotificationPayload extends Partial<Omit<Notification, "id" | "status" | "createdAt">> {
    type: string;
    title: string;
    message: string;
    fromUserId: string | number;
    toUserId: string | number;
    projectId: string | number;
}

// 2. تعريف واجهة حالة الـ Slice (State Interface)
export interface NotificationsState {
    list: Notification[];
    loading: boolean;
    error: string | null;
}

// الحالة الابتدائية
const initialState: NotificationsState = {
    list: [],
    loading: false,
    error: null,
};

// تعريف نوع الـ RootState الخاص بالتطبيق لاستخدامه في الـ Thunk والـ Selectors
// ملاحظة: لو عندك ملف store.ts، يفضل عمل export لـ RootState من هناك واستيراده هنا.
interface RootState {
    notifications: NotificationsState;
    [key: string]: any; // للتعامل المرن مع بقية الـ Slices في الـ Store
}

/* ------------------ Thunks ------------------- */

/**
 * createNotificationApi
 */
export const createNotificationApi = createAsyncThunk<
    Notification,                           // المرجوع في حالة النجاح (Fulfilled)
    CreateNotificationPayload,              // قيمة الـ Payload الممررة للدالة
    { rejectValue: CreateNotificationPayload } // قيمة الـ Payload المرجوعة في حالة الفشل
>(
    "notifications/create",
    async (payload, { rejectWithValue }) => {
        try {
            const now = new Date().toISOString();
            const n: Notification = {
                id: (payload as any).id || nanoid(6),
                status: "unread",
                createdAt: now,
                title: payload.title,
                type: payload.type,
                message: payload.message,
                fromUserId: payload.fromUserId,
                toUserId: payload.toUserId,
                projectId: payload.projectId,
                taskId: payload.taskId,
                taskSnapshot: payload.taskSnapshot,
                meta: payload.meta,
            };

            // Deduplicate check
            try {
                const recent = await getData<Notification[]>(
                    `notifications?toUserId=${encodeURIComponent(n.toUserId)}&type=${encodeURIComponent(n.type)}`
                );
                if (Array.isArray(recent) && recent.length) {
                    const nowTs = Date.now();
                    const MATCH_WINDOW_MS = 10 * 1000;

                    const match = recent.find((r) => {
                        try {
                            const sameProject = String(r.projectId) === String(n.projectId);
                            const sameTask = (r.taskId == null && n.taskId == null) || String(r.taskId) === String(n.taskId);
                            const sameMessage = String(r.message || "") === String(n.message || "");
                            const createdAtTs = r.createdAt ? Date.parse(r.createdAt) : 0;
                            const recentEnough = nowTs - createdAtTs < MATCH_WINDOW_MS;
                            return sameProject && sameTask && sameMessage && recentEnough;
                        } catch {
                            return false;
                        }
                    });

                    if (match) {
                        return { ...match, isDuplicate: true };
                    }
                }
            } catch (e: any) {
                console.warn("Notification dedupe check failed:", e?.message || e);
            }

            const created = await postData<Notification>("notifications", n);
            return created || n;
        } catch {
            return rejectWithValue(payload);
        }
    }
);

/**
 * fetchNotifications
 */
export const fetchNotifications = createAsyncThunk<
    Notification[],
    void,
    { rejectValue: string }
>(
    "notifications/fetchAll",
    async (_, { rejectWithValue }) => {
        try {
            const list = await getData<Notification[]>("notifications");
            return Array.isArray(list) ? list : [];
        } catch (e: any) {
            return rejectWithValue(String(e?.message || e));
        }
    }
);

/**
 * markNotificationRead
 */
export const markNotificationRead = createAsyncThunk<
    Notification,
    string | number,
    { state: RootState; rejectValue: string }
>(
    "notifications/markRead",
    async (notificationId, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const n = (state.notifications.list || []).find((x) => String(x.id) === String(notificationId));
            if (!n) throw new Error("Notification not found");

            const updated: Notification = { ...n, status: "read" };
            const data = await updateData<Notification>("notifications", String(notificationId), updated);
            return data || updated;
        } catch (e: any) {
            return rejectWithValue(String(e?.message || e));
        }
    }
);

/**
 * dismissNotification
 */
export const dismissNotification = createAsyncThunk<
    Notification,
    string | number,
    { state: RootState; rejectValue: string }
>(
    "notifications/dismiss",
    async (notificationId, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const n = (state.notifications.list || []).find((x) => String(x.id) === String(notificationId));
            if (!n) throw new Error("Notification not found");

            const updated: Notification = { ...n, status: "dismissed" };
            const data = await updateData<Notification>("notifications", String(notificationId), updated);
            return data || updated;
        } catch (e: any) {
            return rejectWithValue(String(e?.message || e));
        }
    }
);

interface RestorePayload {
    notificationId: string | number;
}

interface RestoreResult {
    notificationId: string | number;
    projectId: string | number;
    task: any;
    updatedProject: any;
}

/**
 * restoreTaskFromNotification
 */
export const restoreTaskFromNotification = createAsyncThunk<
    RestoreResult,
    RestorePayload,
    { state: RootState; rejectValue: string }
>(
    "notifications/restoreTaskFromNotification",
    async ({ notificationId }, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const n = (state.notifications.list || []).find((x) => String(x.id) === String(notificationId));
            if (!n) throw new Error("Notification not found");

            const snapshot = n.taskSnapshot;
            const projectId = n.projectId;
            if (!snapshot || !projectId) throw new Error("No snapshot or projectId to restore");

            const project = await getData<any>(`projects/${projectId}`);
            if (!project) throw new Error("Project not found");

            const exists = (project.tasks || []).some((t: any) => String(t.id) === String(snapshot.id));
            if (exists) {
                return rejectWithValue("Task already exists in project");
            }

            const restoredTask = {
                ...snapshot,
                restoredAt: new Date().toISOString(),
                createdAt: snapshot.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const updatedProject = { ...project, tasks: [...(project.tasks || []), restoredTask] };
            const data = await updateData<any>("projects", String(projectId), updatedProject);

            await updateData<Notification>("notifications", String(notificationId), { ...n, status: "read" });

            return { notificationId, projectId, task: restoredTask, updatedProject: data };
        } catch (e: any) {
            return rejectWithValue(String(e?.message || e));
        }
    }
);

/* ------------------ Slice ------------------- */

const notificationsSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        addNotificationLocal(state, action: PayloadAction<Notification>) {
            const n = action.payload;
            const exists = state.list.some((x) => String(x.id) === String(n.id));
            if (!exists) state.list.unshift(n);
        },
        clearError(state) {
            state.error = null;
        },
        removeNotificationLocal(state, action: PayloadAction<string | number>) {
            const id = action.payload;
            state.list = state.list.filter((x) => String(x.id) !== String(id));
        },
        markReadLocal(state, action: PayloadAction<string | number>) {
            const id = action.payload;
            const i = state.list.findIndex((x) => String(x.id) === String(id));
            if (i !== -1) state.list[i].status = "read";
        },
    },
    extraReducers: (builder) => {
        // fetch
        builder.addCase(fetchNotifications.pending, (s) => {
            s.loading = true;
            s.error = null;
        });
        builder.addCase(fetchNotifications.fulfilled, (s, action: PayloadAction<Notification[]>) => {
            s.loading = false;
            s.list = (action.payload || [])
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        builder.addCase(fetchNotifications.rejected, (s, action) => {
            s.loading = false;
            s.error = (action.payload as string) || action.error?.message || "Failed to fetch notifications";
        });

        // create
        builder.addCase(createNotificationApi.pending, (s) => {
            s.error = null;
        });
        builder.addCase(createNotificationApi.fulfilled, (s, action: PayloadAction<Notification>) => {
            if (action.payload) {
                const exists = s.list.some((x) => String(x.id) === String(action.payload.id));
                if (!exists && !action.payload.isDuplicate) {
                    s.list.unshift(action.payload);
                }
            }
        });
        builder.addCase(createNotificationApi.rejected, (s, action) => {
            s.error = "Failed to create notification";
            if (action.payload) {
                const exists = s.list.some((x) => String(x.id) === String((action.payload as any).id));
                if (!exists) {
                    s.list.unshift({
                        ...(action.payload as any),
                        id: (action.payload as any).id || nanoid(6),
                        status: "unread",
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        });

        // markRead
        builder.addCase(markNotificationRead.fulfilled, (s, action: PayloadAction<Notification>) => {
            const updated = action.payload;
            const i = s.list.findIndex((x) => String(x.id) === String(updated.id));
            if (i !== -1) s.list[i] = updated;
        });
        builder.addCase(markNotificationRead.rejected, (s, action) => {
            s.error = (action.payload as string) || action.error?.message || "Failed to mark notification read";
        });

        // dismiss
        builder.addCase(dismissNotification.fulfilled, (s, action: PayloadAction<Notification>) => {
            const updated = action.payload;
            const i = s.list.findIndex((x) => String(x.id) === String(updated.id));
            if (i !== -1) s.list[i] = updated;
        });
        builder.addCase(dismissNotification.rejected, (s, action) => {
            s.error = (action.payload as string) || action.error?.message || "Failed to dismiss notification";
        });

        // restore
        builder.addCase(restoreTaskFromNotification.fulfilled, (s, action) => {
            const { notificationId } = action.payload || {};
            const i = s.list.findIndex((x) => String(x.id) === String(notificationId));
            if (i !== -1) s.list[i].status = "read";
        });
        builder.addCase(restoreTaskFromNotification.rejected, (s, action) => {
            s.error = (action.payload as string) || action.error?.message || "Failed to restore from notification";
        });
    },
});

export const {
    addNotificationLocal,
    clearError,
    removeNotificationLocal,
    markReadLocal,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

/* ------------------ Selectors ------------------- */

export const selectNotificationsList = (s: RootState): Notification[] => s.notifications?.list || [];

export const selectNotificationsForUser = (userId: string | number) =>
    (s: RootState): Notification[] =>
        (s.notifications?.list || []).filter((n) => String(n.toUserId) === String(userId));

export const selectUnreadCountForUser = (userId: string | number) =>
    (s: RootState): number =>
        (s.notifications?.list || []).filter((n) => String(n.toUserId) === String(userId) && n.status === "unread").length;