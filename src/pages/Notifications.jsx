import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { useAppDispatch, useAppSelector } from "../store/Hooks";

import {
    fetchNotifications,
    markNotificationRead,
    dismissNotification,
    restoreTaskFromNotification,
    selectNotificationsList,
} from "../slices/notificationsSlice";

import { confirmDeleteTask } from "../slices/projectsSlice";

function TabButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-md text-sm ${active ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
        >
            {children}
        </button>
    );
}

export default function NotificationsPage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth?.user);
    const projects = useAppSelector((s) => s.projects?.list || []);

    const notificationsList = useAppSelector(selectNotificationsList);
    const loading = useAppSelector((s) => s.notifications?.loading);
    const error = useAppSelector((s) => s.notifications?.error);

    const [tab, setTab] = useState("all"); // all | unread | actionable | byProject | undoable
    const [search, setSearch] = useState("");
    const [projectFilter, setProjectFilter] = useState("");

    useEffect(() => {
        // fetch on mount
        dispatch(fetchNotifications());
    }, [dispatch]);

    if (!user) return null;

    // Helpers
    const isMemberOf = (projectId, userId) => {

        const p = projects.find((x) => String(x.id) === String(projectId));
        if (!p) return false;
        const members = Array.isArray(p.members) ? p.members.map(String) : [];
        return members.includes(String(userId));
    };

    const isApproverFor = (projectId, userId) => {
        const p = projects.find((x) => String(x.id) === String(projectId));
        if (!p) return false;
        if (String(p.leaderId) === String(userId)) return true;
        if (Array.isArray(p.admins) && p.admins.map(String).includes(String(userId))) return true;
        if (Array.isArray(p.membersObjects)) {
            const me = p.membersObjects.find((m) => String(m.id) === String(userId));
            if (me && (me.role === "admin" || me.role === "project_leader")) return true;
        }
        return false;
    };


    // Ensure we don't mutate store data
    const notifications = Array.isArray(notificationsList) ? notificationsList.slice() : [];



    // ✅ فلترة النوتيفيكيشن الخاصة باليوزر:
    // - اللي toUserId بتاعها = user.id
    // - أو broadcast (مفيش toUserId) واليوزر عضو في المشروع
    const userNotifications = useMemo(() => {
        return notifications.filter((n) => {
            // direct to user
            if (String(n.toUserId) === String(user.id)) return true;
            // console.log(n.toUserId == user.id);

            // broadcast على المشروع كله (toUserId = null أو undefined)
            if (!n.toUserId && n.projectId && isMemberOf(n.projectId, user.id)) return true;

            return false;
        });
    }, [notifications, user?.id, projects]);

    // Grouping & classification
    const groups = useMemo(() => {
        const unread = [];
        const read = [];
        const actionable = [];
        const broadcasts = [];
        const undoable = [];
        const byProject = new Map();
        const byType = new Map();
        const recent = [];

        const now = Date.now();

        for (const n of userNotifications) {

            // classification by status
            if (n.status === "unread") unread.push(n);
            else read.push(n);

            // actionable: delete requests where user can approve/reject
            if (n.type === "task_delete_request") {
                const amApprover =
                    String(n.toUserId) === String(user.id) ||
                    (n.meta?.requires === "approver" && isApproverFor(n.projectId, user.id));
                if (amApprover) actionable.push(n);
            }

            // broadcast
            if (!n.toUserId) broadcasts.push(n);

            // undoable -> type or meta.undoUntil
            if (n.type === "task_deleted_undo" || (n.meta && n.meta.undoUntil)) {
                const until = n.meta?.undoUntil ? Date.parse(n.meta.undoUntil) : null;
                if (!until || until > now) undoable.push(n);
            }

            // byProject
            const pid = n.projectId ? String(n.projectId) : "__no_project__";
            if (!byProject.has(pid)) byProject.set(pid, []);
            byProject.get(pid).push(n);

            // byType
            const t = n.type || "__unknown__";
            if (!byType.has(t)) byType.set(t, []);
            byType.get(t).push(n);

            recent.push(n);
        }

        const sortDesc = (arr) => arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        sortDesc(unread);
        sortDesc(read);
        sortDesc(actionable);
        sortDesc(broadcasts);
        sortDesc(undoable);
        sortDesc(recent);
        for (const [, arr] of byProject) sortDesc(arr);
        for (const [, arr] of byType) sortDesc(arr);

        return {
            all: userNotifications.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            unread,
            read,
            actionable,
            broadcasts,
            byProject,
            byType,
            undoable,
            recent,
            counts: {
                total: userNotifications.length,
                unread: unread.length,
                actionable: actionable.length,
                broadcasts: broadcasts.length,
                undoable: undoable.length,
            },
        };
    }, [userNotifications, user?.id, projects]);




    function applyFilters(list) {
        if (!Array.isArray(list)) return [];
        let out = list.slice();
        if (projectFilter) out = out.filter((n) => String(n.projectId) === String(projectFilter));
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            out = out.filter(
                (n) =>
                    (n.title && n.title.toLowerCase().includes(q)) ||
                    (n.message && n.message.toLowerCase().includes(q)) ||
                    (n.taskSnapshot?.title && n.taskSnapshot.title.toLowerCase().includes(q))
            );
        }
        return out;
    }



    const unreadCount = groups.counts.unread;

    // Handlers
    const handleMarkRead = async (id) => {
        try {
            await dispatch(markNotificationRead(id)).unwrap();
        } catch (err) {
            console.error("mark read error", err);
        }
    };

    const handleDismiss = async (id) => {
        try {
            await dispatch(dismissNotification(id)).unwrap();
        } catch (err) {
            console.error("dismiss error", err);
        }
    };

    const handleRestore = async (notificationId) => {
        try {
            await dispatch(restoreTaskFromNotification({ notificationId })).unwrap();
            dispatch(fetchNotifications());
        } catch (err) {
            console.error("restore error", err);
        }
    };

    const handleApprove = async (n) => {
        try {
            await dispatch(
                confirmDeleteTask({
                    projectId: n.projectId,
                    taskId: n.taskId,
                    approverId: user.id,
                    approve: true,
                    taskSnapshot: n.taskSnapshot,
                    requesterId: n.fromUserId,
                })
            ).unwrap();
            await dispatch(markNotificationRead(n.id)).unwrap();
        } catch (err) {
            console.error("Approve error:", err);
        }
    };

    const handleReject = async (n) => {
        try {
            await dispatch(
                confirmDeleteTask({
                    projectId: n.projectId,
                    taskId: n.taskId,
                    approverId: user.id,
                    approve: false,
                    taskSnapshot: n.taskSnapshot,
                    requesterId: n.fromUserId,
                })
            ).unwrap();
            await dispatch(markNotificationRead(n.id)).unwrap();
        } catch (err) {
            console.error("Reject error:", err);
        }
    };

    const getDisplayed = () => {
        switch (tab) {
            case "unread":
                return applyFilters(groups.unread);
            case "actionable":
                return applyFilters(groups.actionable);
            case "byProject":
                if (projectFilter) return applyFilters(groups.byProject.get(String(projectFilter)) || []);
                return applyFilters(
                    Array.from(groups.byProject.entries())
                        .filter(([pid]) => pid !== "__no_project__")
                        .flatMap(([, arr]) => arr)
                );
            case "undoable":
                return applyFilters(groups.undoable);
            case "all":
            default:
                return applyFilters(groups.all);
        }
    };

    const displayed = getDisplayed();

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">
                    Notifications <span className="text-sm text-gray-500">({unreadCount} unread)</span>
                </h1>

                <div className="flex items-center gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search notifications..."
                        className="px-3 py-1 border rounded"
                    />
                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                    >
                        <option value="">All projects</option>
                        {projects.map((p) => (
                            <option value={p.id} key={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => dispatch(fetchNotifications())}
                        className="px-3 py-1 rounded-md bg-gray-100 text-sm"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                    All
                </TabButton>
                <TabButton active={tab === "unread"} onClick={() => setTab("unread")}>
                    Unread
                </TabButton>
                <TabButton active={tab === "actionable"} onClick={() => setTab("actionable")}>
                    Needs action
                </TabButton>
                <TabButton active={tab === "byProject"} onClick={() => setTab("byProject")}>
                    By project
                </TabButton>
                <TabButton active={tab === "undoable"} onClick={() => setTab("undoable")}>
                    Undoable
                </TabButton>
            </div>

            {loading ? (
                <div className="p-4 rounded border border-dashed text-gray-600">Loading notifications…</div>
            ) : displayed.length === 0 ? (
                <div className="p-4 rounded border border-dashed text-gray-600">No notifications</div>
            ) : (
                <ul className="space-y-3">
                    <AnimatePresence>
                        {displayed.map((n) => {
                            const actionableBtn =
                                n.type === "task_delete_request" &&
                                (String(n.toUserId) === String(user.id) ||
                                    (n.meta?.requires === "approver" && isApproverFor(n.projectId, user.id)));

                            return (
                                <motion.li
                                    key={n.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className={`p-4 rounded border ${n.status === "unread" ? "bg-white shadow" : "bg-gray-50"
                                        } flex items-start justify-between gap-4`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold">{n.title}</div>
                                            <div className="text-xs text-gray-400">
                                                · {new Date(n.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-gray-700 text-sm mt-1">{n.message}</div>

                                        {n.projectId && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                Project:{" "}
                                                <Link
                                                    className="text-sky-700 hover:underline"
                                                    to={`/projects/${n.projectId}`}
                                                >
                                                    {n.projectId}
                                                </Link>
                                            </div>
                                        )}

                                        {n.taskId && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                Task:{" "}
                                                {n.taskSnapshot?.title ? (
                                                    <span className="font-mono">{n.taskSnapshot.title}</span>
                                                ) : (
                                                    <Link
                                                        className="text-sky-700 hover:underline"
                                                        to={`/tasks/${n.taskId}`}
                                                    >
                                                        #{n.taskId}
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-2">
                                            {n.status === "unread" && (
                                                <button
                                                    onClick={() => handleMarkRead(n.id)}
                                                    className="px-2 py-1 text-xs rounded bg-sky-100 text-sky-700"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDismiss(n.id)}
                                                className="px-2 py-1 text-xs rounded bg-gray-100"
                                            >
                                                Dismiss
                                            </button>
                                        </div>

                                        {actionableBtn && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(n)}
                                                    className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(n)}
                                                    className="px-2 py-1 text-xs rounded bg-rose-100 text-rose-700"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}

                                        {n.taskSnapshot && (
                                            <button
                                                onClick={() => handleRestore(n.id)}
                                                className="mt-2 px-2 py-1 text-xs rounded bg-amber-100 text-amber-700"
                                            >
                                                Restore Task
                                            </button>
                                        )}
                                    </div>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}
            {error && <div className="mt-3 text-sm text-red-600">Error: {String(error)}</div>}
        </div>
    );
}
