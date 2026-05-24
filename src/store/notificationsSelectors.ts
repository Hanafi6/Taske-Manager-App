import type { RootState } from "./Store";
import type { Notification } from "../slices/notificationsSlice";
import type { NotificationFilterOptions } from "../types/selectors";
import { createSelector } from "@reduxjs/toolkit";

const selectNotificationsList = (state: RootState): Notification[] =>
  state.notifications?.list || [];

const selectCurrentUserId = (state: RootState): string | number | undefined =>
  state.auth?.user?.id;

export const selectAllNotifications = createSelector(
  [selectNotificationsList],
  (list): Notification[] =>
    list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
);

export const selectUserNotifications = createSelector(
  [
    selectAllNotifications,
    selectCurrentUserId,
    (state: RootState) => state.projects?.list || [],
  ],
  (allNoti, userId, projectsList): Notification[] => {
    if (!userId) return [];
    const projectsSet = new Set<string>();
    for (const p of projectsList) {
      if (
        Array.isArray(p.members) &&
        p.members.map(String).includes(String(userId))
      ) {
        projectsSet.add(String(p.id));
      }
    }

    return allNoti.filter((n) => {
      if (String(n.toUserId) === String(userId)) return true;
      if (n.projectId && projectsSet.has(String(n.projectId))) return true;
      if (
        !n.toUserId &&
        n.projectId &&
        projectsSet.has(String(n.projectId))
      ) {
        return true;
      }
      return false;
    });
  }
);

export const selectUserUnreadNotifications = createSelector(
  [selectUserNotifications],
  (userNoti): Notification[] => userNoti.filter((n) => n.status === "unread")
);

export const makeSelectNotificationsByProject = (projectId: string | number) =>
  createSelector([selectUserNotifications], (userNoti): Notification[] =>
    userNoti.filter((n) => String(n.projectId) === String(projectId))
  );

export const makeSelectByTypes = (types: string[] = []) =>
  createSelector([selectUserNotifications], (userNoti): Notification[] => {
    if (!types.length) return userNoti;
    const tset = new Set(types);
    return userNoti.filter((n) => tset.has(n.type));
  });

export const selectApprovalsPendingForMe = createSelector(
  [selectUserNotifications, selectCurrentUserId],
  (userNoti, userId): Notification[] => {
    if (!userId) return [];
    return userNoti.filter((n) => {
      if (n.type === "task_delete_request") {
        if (String(n.toUserId) === String(userId)) return true;
        if (n.meta?.requires === "approver") return true;
      }
      if (
        n.meta?.actionRequired === true &&
        String(n.toUserId) === String(userId)
      ) {
        return true;
      }
      return false;
    });
  }
);

export const makeSelectUnassignedTaskNotisForProject = (
  projectId: string | number
) =>
  createSelector([selectUserNotifications], (userNoti): Notification[] =>
    userNoti.filter(
      (n) =>
        String(n.projectId) === String(projectId) &&
        n.type === "task_assignment" &&
        (!n.taskSnapshot?.assignedTo || n.taskSnapshot.assignedTo === null)
    )
  );

export const makeSelectFilteredNotifications = ({
  search = "",
  types = [],
  unreadOnly = false,
  projectIds = [],
  approverOnly = false,
  dateFrom,
  dateTo,
}: NotificationFilterOptions = {}) =>
  createSelector(
    [selectUserNotifications, selectCurrentUserId],
    (userNoti, userId): Notification[] => {
      let list = userNoti;

      if (unreadOnly) list = list.filter((n) => n.status === "unread");

      if (projectIds.length) {
        const set = new Set(projectIds.map(String));
        list = list.filter(
          (n) => n.projectId && set.has(String(n.projectId))
        );
      }

      if (types.length) {
        const tset = new Set(types);
        list = list.filter((n) => tset.has(n.type));
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(
          (n) =>
            n.title?.toLowerCase().includes(q) ||
            n.message?.toLowerCase().includes(q) ||
            String(n.taskSnapshot?.title ?? "")
              .toLowerCase()
              .includes(q)
        );
      }

      if (approverOnly && userId) {
        list = list.filter((n) => {
          if (n.type === "task_delete_request") {
            return (
              String(n.toUserId) === String(userId) ||
              n.meta?.requires === "approver"
            );
          }
          return false;
        });
      }

      if (dateFrom || dateTo) {
        const fromTs = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
        const toTs = dateTo ? new Date(dateTo).getTime() : Infinity;
        list = list.filter((n) => {
          const t = new Date(n.createdAt).getTime();
          return t >= fromTs && t <= toTs;
        });
      }

      return list
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  );
