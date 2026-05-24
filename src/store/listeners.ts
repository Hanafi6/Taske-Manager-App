// src/store/listeners.ts
import { createListenerMiddleware, ListenerEffectAPI, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { requestDeleteTask, confirmDeleteTask, addTask } from "../slices/projectsSlice";
import { LogIn } from "../slices/AuthSlice";
import { createNotificationApi } from "../slices/notificationsSlice";

import type { RootState as AppRootState } from "./Store";
import type { Project } from "../slices/projectsSlice";
import type { User } from "../slices/AuthSlice";

/* ------------------ Types & Interfaces ------------------ */

type AppListenerApi = ListenerEffectAPI<
  AppRootState,
  ThunkDispatch<AppRootState, unknown, UnknownAction>,
  unknown
>;

interface NotificationPayload {
    type: string;
    title: string;
    message: string;
    fromUserId: string | null;
    toUserId: string;
    projectId: string | null;
    taskId: string | number | null;
    taskSnapshot: any;
    meta: Record<string, any>;
    status: "unread" | "read";
    createdAt: string;
    notificationGroupId?: string;
}

/* ------------------ Middleware Setup ------------------ */

export const listenerMiddleware = createListenerMiddleware();

const recentNotifications = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10 * 1000;

function shouldDedupe(key: string): boolean {
    const now = Date.now();
    const last = recentNotifications.get(key);
    if (!last || now - last > DEDUPE_WINDOW_MS) {
        recentNotifications.set(key, now);
        return false;
    }
    return true;
}

/**
 * deepSerializeDates(obj)
 * يحول أي Date داخل الـ payload إلى ISO strings بشكل تكراري (recursively)
 */
function deepSerializeDates(obj: any): any {
    if (obj == null) return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(deepSerializeDates);
    if (typeof obj === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
            if (k === "time" && typeof v === "object" && v !== null) {
                const timeObj: Record<string, any> = {};
                if ((v as any).start) timeObj.start = deepSerializeDates((v as any).start);
                if ((v as any).end) timeObj.end = deepSerializeDates((v as any).end);
                for (const [tk, tv] of Object.entries(v)) {
                    if (tk !== "start" && tk !== "end") timeObj[tk] = deepSerializeDates(tv);
                }
                out[k] = timeObj;
                continue;
            }
            out[k] = deepSerializeDates(v);
        }
        return out;
    }
    return obj;
}

/**
 * safeDispatchNotification(listenerApi, payload)
 */
async function safeDispatchNotification(listenerApi: AppListenerApi, payload: Partial<NotificationPayload>): Promise<void> {
    try {
        const safePayload = deepSerializeDates(payload || {});
        if (safePayload.createdAt && safePayload.createdAt instanceof Date) {
            safePayload.createdAt = (safePayload.createdAt as Date).toISOString();
        }
        await listenerApi.dispatch(createNotificationApi(safePayload));
    } catch (err) {
        console.error("Failed to create notification (listener):", err);
    }
}

/**
 * sendNotification(listenerApi, payload)
 */
async function sendNotification(listenerApi: AppListenerApi, payload: Partial<NotificationPayload>): Promise<void> {
    try {
        const safePayload = deepSerializeDates(payload || {});
        return await safeDispatchNotification(listenerApi, safePayload);
    } catch (err) {
        console.error("Failed to send notification (listener):", err);
    }
}

/* ------------------ Listeners ------------------ */

/**
 * requestDeleteTask.fulfilled
 */
listenerMiddleware.startListening({
    actionCreator: requestDeleteTask.fulfilled,
    effect: async (action, listenerApi) => {
        try {
            const { projectId, taskId, userId, taskSnapshot, updatedProject } = (action.payload as any) || {};
            const state = listenerApi.getState();
            const project = state.projects?.list?.find((p) => String(p.id) === String(projectId)) || updatedProject || null;

            const taskTitle = taskSnapshot?.title || `#${taskId}`;
            const actorId = String(userId || (action.meta as any)?.arg?.userId || "unknown");

            const approvers = new Set<string>();
            if (project?.leaderId) approvers.add(String(project.leaderId));
            if (project?.admins && Array.isArray(project.admins)) {
                project.admins.forEach((a) => approvers.add(String(a)));
            }
            if (approvers.size === 0 && (action.payload as any)?.approverIds) {
                ((action.payload as any).approverIds || []).forEach((a: any) => approvers.add(String(a)));
            }

            const title = `Delete requested: ${taskTitle}`;
            const message = `User ${actorId} requested deletion for task "${taskTitle}" in project "${project?.name || projectId}"`;

            const fallbackRecipients = project?.leaderId ? [String(project.leaderId)] : (project?.members || []).map(String);
            const recipients = Array.from(new Set(approvers.size ? Array.from(approvers) : fallbackRecipients));

            for (const toUserId of recipients) {
                const dedupeKey = `reqDel:${projectId}:${taskId}:${toUserId}`;
                if (shouldDedupe(dedupeKey)) continue;

                await sendNotification(listenerApi, {
                    type: "task_delete_request",
                    title,
                    message,
                    fromUserId: actorId,
                    toUserId,
                    projectId: String(projectId),
                    taskId,
                    taskSnapshot: taskSnapshot || null,
                    meta: { phase: "request" },
                    status: "unread",
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            console.error("Error in requestDeleteTask listener:", err);
        }
    },
});

/**
 * confirmDeleteTask.fulfilled
 */
listenerMiddleware.startListening({
    actionCreator: confirmDeleteTask.fulfilled,
    effect: async (action, listenerApi) => {
        try {
            const payload = (action.payload as any) || {};
            const Abrov = (action.meta as any).arg.Abrov || null;

            const { projectId, taskId, approverId, deleted, updatedProject } = payload;
            const originalTaskSnapshot = (action.meta as any)?.arg?.taskSnapshot || payload.taskSnapshot || null;

            const actor = String(approverId || (action.meta as any)?.arg?.approverId || "system");

            const state = listenerApi.getState();
            const project =
                state.projects?.list?.find((p) => String(p.id) === String(projectId)) ||
                updatedProject ||
                null;

            const members = Array.from(
                new Set((project?.members || []).map((m) => String(m)))
            );

            const taskTitle = originalTaskSnapshot?.title || `#${taskId}`;

            const recipients = new Map<string, { kinds: Set<string>; wantsUndo: boolean }>();

            // 1) الفريق (ماعدا الأدمن)
            for (const m of members) {
                if (String(m) === actor) continue;
                recipients.set(String(m), { kinds: new Set(["team"]), wantsUndo: false });
            }

            // 2) صاحب الطلب (requester)
            const requesterIdRaw =
                (action.meta as any)?.arg?.requesterId ||
                payload.requesterId ||
                payload.userId ||
                "";
            const requesterId = requesterIdRaw ? String(requesterIdRaw) : "";

            if (requesterId && requesterId !== actor) {
                const existing = recipients.get(requesterId);
                if (existing) {
                    existing.kinds.add("requester");
                    recipients.set(requesterId, existing);
                } else {
                    recipients.set(requesterId, {
                        kinds: new Set(["requester"]),
                        wantsUndo: false,
                    });
                }
            }

            // 3) الأدمن (actor)
            if (actor && actor !== "system") {
                const existing = recipients.get(actor);
                if (existing) {
                    existing.kinds.add("actor");
                    recipients.set(actor, existing);
                } else {
                    recipients.set(actor, {
                        kinds: new Set(["actor"]),
                        wantsUndo: false,
                    });
                }
            }

            if (deleted) {
                for (const [uid, info] of recipients) {
                    info.wantsUndo = true;
                    recipients.set(uid, info);
                }
            }

            const teamMessage = deleted
                ? `Task "${taskTitle}" was deleted by user ${Abrov?.name || actor} from project "${project?.name || projectId}"`
                : `Delete request for task "${taskTitle}" was rejected by user ${Abrov?.name || actor} in project "${project?.name || projectId}"`;

            const sendPromises: Promise<void>[] = [];
            const undoExpiry = deleted
                ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
                : null;

            for (const [toUserId, info] of recipients) {
                const dedupeKey = `confirmDel:${projectId}:${taskId}:${toUserId}:${deleted ? "deleted" : "rejected"}`;
                if (shouldDedupe(dedupeKey)) continue;

                const kindsArr = Array.from(info.kinds);
                let type = "";
                let title = "";
                let message = "";

                if (kindsArr.includes("actor")) {
                    type = deleted ? "task_delete_actor_approved" : "task_delete_actor_rejected";
                    title = deleted ? "You approved deleting a task" : "You rejected a delete request";
                    message = deleted
                        ? `You approved deleting task "${taskTitle}" in project "${project?.name || projectId}".`
                        : `You rejected the delete request for task "${taskTitle}" in project "${project?.name || projectId}".`;
                } else if (kindsArr.includes("requester") && !kindsArr.includes("team")) {
                    type = deleted ? "task_delete_approved" : "task_delete_denied";
                    title = deleted ? "Delete request approved" : "Delete request denied";
                    message = deleted
                        ? `Your delete request for "${taskTitle}" was approved by user ${Abrov?.name || actor}.`
                        : `Your delete request for "${taskTitle}" was rejected by user ${Abrov?.name || actor}.`;
                } else {
                    type = deleted ? "task_deleted_team" : "task_delete_rejected";
                    title = deleted ? "Task deleted" : "Delete request rejected";
                    message = teamMessage;
                }

                const payloadToSend: Partial<NotificationPayload> = {
                    type,
                    title,
                    message,
                    fromUserId: actor,
                    toUserId,
                    projectId: String(projectId),
                    taskId,
                    taskSnapshot: originalTaskSnapshot ? deepSerializeDates(originalTaskSnapshot) : null,
                    meta: {
                        deleted: !!deleted,
                        kinds: kindsArr,
                        ...(info.wantsUndo && undoExpiry ? { undoUntil: undoExpiry } : {}),
                    },
                    notificationGroupId: `project:${projectId}:task:${taskId}`,
                    status: "unread",
                    createdAt: new Date().toISOString(),
                };

                console.log("notif to send: ", payloadToSend);
                sendPromises.push(sendNotification(listenerApi, payloadToSend));
            }

            if (sendPromises.length) await Promise.all(sendPromises);
        } catch (err) {
            console.error("Error in confirmDeleteTask listener:", err);
        }
    },
});

/**
 * loginUser.fulfilled
 */
listenerMiddleware.startListening({
    actionCreator: LogIn.fulfilled,
    effect: async (action, listenerApi) => {
        try {
            const user = action.payload as User;
            if (!user || !user.id) return;

            const toUserId = String(user.id);
            const dedupeKey = `login:${toUserId}:${user?.lastLogin || "x"}`;

            if (shouldDedupe(dedupeKey)) return;

            const payload: Partial<NotificationPayload> = {
                type: "user_login",
                title: `Welcome back, ${user.name || "user"}!`,
                message: `${user.name || "A user"} logged in at ${new Date().toLocaleString()}`,
                fromUserId: null,
                toUserId,
                projectId: null,
                taskId: null,
                taskSnapshot: null,
                meta: { source: "auth-listener", event: "login" },
                status: "unread",
                createdAt: new Date().toISOString(),
            };

            await safeDispatchNotification(listenerApi, payload);
        } catch (err) {
            console.error("login listener error:", err);
        }
    },
});

/**
 * Logout.fulfilled
 */
// listenerMiddleware.startListening({
//     actionCreator: logout.fulfilled,
//     effect: async (action, listenerApi) => {
//         try {
//             const payloadFromAction = (action.payload as any) || {};
//             const metaArg = (action.meta as any)?.arg || {};
//             const userId = payloadFromAction.id || metaArg.userId || metaArg.id;
//             if (!userId) return;

//             const toUserId = String(userId);
//             const dedupeKey = `logout:${toUserId}:${Date.now()}`;

//             if (shouldDedupe(dedupeKey)) return;

//             const payload: Partial<NotificationPayload> = {
//                 type: "user_logout",
//                 title: `Logged out`,
//                 message: `You logged out at ${new Date().toLocaleString()}`,
//                 fromUserId: null,
//                 toUserId,
//                 projectId: null,
//                 taskId: null,
//                 taskSnapshot: null,
//                 meta: { source: "auth-listener", event: "logout" },
//                 status: "unread",
//                 createdAt: new Date().toISOString(),
//             };

//             await safeDispatchNotification(listenerApi, payload);
//         } catch (err) {
//             console.error("logout listener error:", err);
//         }
//     },
// });

/**
 * addTask.fulfilled
 */
listenerMiddleware.startListening({
    actionCreator: addTask.fulfilled,
    effect: async (action, listenerApi) => {
        try {
            const { projectId, task, updatedProject } = (action.payload as any) || {};
            const state = listenerApi.getState();
            const project = state.projects?.list?.find((p) => String(p.id) === String(projectId)) || updatedProject || null;
            const Creater = state.auth?.usersList.find((u) => String(u.id) === String((action.meta as any)?.arg?.createdBy)) || null;

            const actorId = String((action.meta as any)?.arg?.createdBy || "unknown");
            const taskTitle = task?.title || `#${task?.id || "unknown"}`;

            const title = `New Task Added: ${taskTitle} by ${Creater?.name || actorId}`;
            const message = `User ${actorId} added a new task "${taskTitle}" to project "${project?.name || projectId}"`;
            const members = Array.from(new Set((project?.members || []).map(String)));

            for (const toUserId of members) {
                const dedupeKey = `addTask:${projectId}:${task?.id}:${toUserId}`;

                // حماية الـ console.log هنا بـ optional chaining عشان التايب سكريبت
                console.log(toUserId, Creater?.id);
                if (shouldDedupe(dedupeKey)) continue;

                await sendNotification(listenerApi, {
                    type: `task_added ${toUserId === actorId ? "own" : "team"} to ${project?.title || projectId}`,
                    title,
                    message,
                    fromUserId: actorId,
                    toUserId,
                    projectId: String(projectId),
                    taskId: task?.id || null,
                    taskSnapshot: task ? deepSerializeDates(task) : null,
                    meta: { phase: "added" },
                    status: "unread",
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            console.error("Error in addTask listener:", err);
        }
    },
});

export default listenerMiddleware;