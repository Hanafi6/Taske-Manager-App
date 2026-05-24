import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./Store";
import type { User } from "../slices/AuthSlice";
import type { Project, Task } from "../slices/projectsSlice";
import type {
  TaskTimeMeta,
  TaskWithMeta,
  MakeSelectTasksOptions,
  TasksGroupedResult,
  AdminStats,
  UserTasksGroupedItem,
  CollaboratorsPerProjectItem,
} from "../types/selectors";

const sameUserId = (a: unknown, b: unknown) => String(a) === String(b);

export const selectActiveProjects = (state: RootState): Project[] =>
  (state.projects?.list || []).filter((p) => p.status === "active");

export const selectAllTasks = (state: RootState): Task[] =>
  state.projects?.tasks || [];

export function isTaskDone(task: Task | null | undefined): boolean {
  if (!task) return false;
  return (
    task.status === "done" ||
    task.status === "completed" ||
    task.completed === true
  );
}

/** Only the assignee may mark a task complete / incomplete */
export function canUserCompleteTask(
  task: Task | null | undefined,
  userId: string | number | null | undefined
): boolean {
  if (!task || userId == null || task.assignedTo == null) return false;
  return sameUserId(task.assignedTo, userId);
}

export const GetTaskeById = (
  state: RootState,
  id: string | number
): Task | null =>
  (state.projects?.tasks || []).find((e) => String(e.id) === String(id)) ||
  null;

export const GetProjectById = (
  state: RootState,
  id: string | number
): Project | null =>
  (state.projects?.list || []).find((e) => String(e.id) === String(id)) ||
  null;

export const selectUsers = (s: RootState): User[] =>
  s.users?.list || s.auth?.usersList || [];

export const selectUser = (s: RootState): User | Record<string, never> =>
  s.auth?.user || {};

export const selectUserId = (
  id: string | number,
  users: User[] | undefined
): User | null =>
  (users || []).find((e) => String(e.id) === String(id)) ?? null;

export const selectProjects = (s: RootState): Project[] =>
  s.projects?.list || [];

export const selectTasks = (s: RootState): Task[] => s.projects?.tasks || [];

export const selectSelectedTaskId = (_s: RootState): string | number | null =>
  null;

export const selectSelectedProjectId = (s: RootState) =>
  s.projects?.selectProject ?? null;

export const GetUsersSelectors = (members: Array<string | number>) =>
  createSelector([selectUsers], (users): User[] => {
    if (!members || !Array.isArray(members)) return [];
    return users.filter((user) =>
      members.map(String).includes(String(user.id))
    );
  });

export const makeSelectActiveProjectsForUser = (userId: string | number) =>
  createSelector(
    [selectActiveProjects, selectAllTasks],
    (projects, tasks): Project[] => {
      if (!userId) return [];
      const projIdsWithMyTasks = new Set(
        tasks
          .filter((t) => sameUserId(t.assignedTo, userId))
          .map((t) => String(t.projectId))
      );
      return projects.filter(
        (p) =>
          sameUserId(p.leaderId, userId) ||
          (Array.isArray(p.members) &&
            p.members.some((m) => sameUserId(m, userId))) ||
          projIdsWithMyTasks.has(String(p.id))
      );
    }
  );

export const makeSelectALLProjectsForUser = (userId: string | number) =>
  createSelector(
    [selectProjects, selectAllTasks],
    (projects, tasks): Project[] => {
      if (!userId || !tasks || !projects) return [];
      const projIdsWithMyTasks = new Set(
        tasks
          .filter((t) => sameUserId(t.assignedTo, userId))
          .map((t) => String(t.projectId))
      );
      return projects.filter(
        (p) =>
          sameUserId(p.leaderId, userId) ||
          (Array.isArray(p.members) &&
            p.members.some((m) => sameUserId(m, userId))) ||
          projIdsWithMyTasks.has(String(p.id))
      );
    }
  );

export const makeSelectMyActiveTasks = (userId: string | number) =>
  createSelector(
    [selectAllTasks, selectActiveProjects],
    (tasks, projects): Task[] => {
      if (!userId) return [];
      const activeIds = new Set(projects.map((p) => p.id));
      return tasks.filter(
        (t) =>
          sameUserId(t.assignedTo, userId) &&
          activeIds.has(t.projectId as string | number)
      );
    }
  );

export const selectAdminStats = createSelector(
  [selectActiveProjects, selectAllTasks],
  (projects, tasks): AdminStats => {
    const counts = tasks.reduce<Record<string, number>>((acc, t) => {
      const key = String(t.status ?? "");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const doneCount = tasks.filter(isTaskDone).length;
    return {
      activeProjects: projects.length,
      tasksTotal: tasks.length,
      tasksByStatus: {
        todo: counts["todo"] || counts["active"] || 0,
        inProgress: counts["in progress"] || 0,
        blocked: counts["blocked"] || 0,
        done: doneCount,
      },
    };
  }
);

export const selectProjectById = (projectId: string | number) =>
  createSelector(
    [selectProjects],
    (projects): Project | null =>
      projects.find((p) => String(p.id) === String(projectId)) || null
  );

export function computeTaskTimeMeta(
  task: Task | null | undefined,
  now: Date = new Date()
): TaskTimeMeta | undefined {
  if (!task) return undefined;
  const start = task.startAt ? new Date(String(task.startAt)) : null;
  const end = task.endAt
    ? new Date(String(task.endAt))
    : task.dueDate
      ? new Date(String(task.dueDate))
      : null;
  const inWindow = (!start || now >= start) && (!end || now <= end);
  const msLeft = end ? end.getTime() - now.getTime() : null;
  const done = isTaskDone(task);
  const isOverdue = end ? now > end && !done : false;
  const isDisabled = done || task.status === "blocked" || isOverdue;
  return { start, end, msLeft, inWindow, isOverdue, isDisabled };
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [d ? `${d}d` : null, h ? `${h}h` : null, m ? `${m}m` : null, sec ? `${sec}s` : null]
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

export const makeSelectTasks = ({
  userId,
  role,
  status = "all",
}: MakeSelectTasksOptions = {}) =>
  createSelector(
    [selectTasks, selectProjects, selectUsers],
    (tasks, projects, users): TasksGroupedResult => {
      const uid = Number(userId);
      let filtered =
        role === "admin"
          ? tasks
          : tasks.filter((t) => Number(t.assignedTo) === uid);

      const grouped: Record<string, TaskWithMeta[]> = {};
      filtered.forEach((t) => {
        const key = String(t.status ?? "unknown");
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t as TaskWithMeta);
      });

      if (status === "active") {
        filtered = filtered.filter((t) => !isTaskDone(t));
      } else if (status === "done") {
        filtered = filtered.filter((t) => isTaskDone(t));
      }

      const userById = new Map(users.map((u) => [Number(u.id), u]));
      const projById = new Map(projects.map((p) => [Number(p.id), p]));

      const list = filtered.map((t) => ({
        ...t,
        user: userById.get(Number(t.assignedTo)) || null,
        project: projById.get(Number(t.projectId)) || null,
        time: computeTaskTimeMeta(t),
      }));

      return { list, grouped, statuses: Object.keys(grouped) };
    }
  );

export const makeSelectTaskDetails = (taskId: string | number) =>
  createSelector(
    [selectTasks, selectUsers, selectProjects],
    (tasks, users, projects): TaskWithMeta | null => {
      if (!taskId) return null;
      const t = tasks.find((x) => String(x.id) === String(taskId));
      if (!t) return null;
      const user =
        users.find((u) => String(u.id) === String(t.assignedTo)) || null;
      const project =
        projects.find((p) => String(p.id) === String(t.projectId)) || null;
      return { ...t, user, project, time: computeTaskTimeMeta(t) };
    }
  );

export const makeSelectProjectById = (projectId: string | number) =>
  createSelector(
    [selectProjects],
    (projects): Project | null =>
      projects.find((p) => String(p.id) === String(projectId)) || null
  );

export const makeSelectTasksByProjectId = (projectId: string | number) =>
  createSelector([selectTasks], (tasks): TaskWithMeta[] =>
    tasks
      .filter((t) => String(t.projectId) === String(projectId))
      .map((t) => ({ ...t, time: computeTaskTimeMeta(t) }))
  );

export const makeSelectUserTasksGrouped = (userId: string | number) =>
  createSelector(
    [selectTasks, selectProjects],
    (tasks, projects): UserTasksGroupedItem[] => {
      const projById = new Map(projects.map((p) => [Number(p.id), p]));
      const mine = tasks.filter((t) => sameUserId(t.assignedTo, userId));
      const groups = new Map<number, TaskWithMeta[]>();
      for (const t of mine) {
        const pid = Number(t.projectId);
        if (!groups.has(pid)) groups.set(pid, []);
        groups.get(pid)!.push({ ...t, time: computeTaskTimeMeta(t) });
      }
      return Array.from(groups.entries()).map(([pid, ts]) => ({
        project:
          projById.get(pid) ||
          ({ id: pid, name: "Unknown project", status: "active" } as Project),
        tasks: ts,
      }));
    }
  );

export const selectSelectedTask = createSelector(
  [selectSelectedTaskId, selectTasks, selectUsers, selectProjects],
  (tid, tasks, users, projects): TaskWithMeta | null => {
    if (!tid) return null;
    const t = tasks.find((x: Task) => String(x.id) === String(tid));
    if (!t) return null;
    const user =
      users.find((u: User) => String(u.id) === String(t.assignedTo)) || null;
    const project =
      projects.find((p: Project) => String(p.id) === String(t.projectId)) || null;
    return { ...t, user, project, time: computeTaskTimeMeta(t) };
  }
);

export const selectSelectedProject = createSelector(
  [(s: RootState) => s.projects?.selectProject ?? null],
  (project): Project | null => project
);

export const makeSelectUserProjects = (userId: string | number) =>
  createSelector([selectProjects], (projects): Project[] => {
    if (!userId) return [];
    return projects.filter(
      (p) =>
        sameUserId(p.leaderId, userId) ||
        (Array.isArray(p.members) &&
          p.members.some((m) => sameUserId(m, userId)))
    );
  });

const usersOnTask = (t: Task): number[] => {
  const main = t.assignedTo != null ? [Number(t.assignedTo)] : [];
  const collabs = Array.isArray(t.collaborators)
    ? t.collaborators.map(Number)
    : [];
  return Array.from(new Set([...main, ...collabs]));
};

export const makeSelectCollaboratorsPerProjectForUser = (
  userId: string | number
) =>
  createSelector(
    [makeSelectUserProjects(userId), selectTasks, selectUsers],
    (myProjects, allTasks, users): CollaboratorsPerProjectItem[] => {
      const uid = Number(userId);
      const usersById = new Map(users.map((u) => [Number(u.id), u]));
      const tasksByProject = new Map<number, Task[]>();

      for (const t of allTasks) {
        const pid = Number(t.projectId);
        if (!tasksByProject.has(pid)) tasksByProject.set(pid, []);
        tasksByProject.get(pid)!.push(t);
      }

      return myProjects.map((p) => {
        const pid = Number(p.id);
        const pTasks = tasksByProject.get(pid) || [];
        const contributorsSet = new Set<number>();

        for (const t of pTasks) {
          for (const uidOnTask of usersOnTask(t)) {
            contributorsSet.add(uidOnTask);
          }
        }

        contributorsSet.add(Number(p.leaderId));
        for (const m of p.members || []) contributorsSet.add(Number(m));
        contributorsSet.delete(uid);

        const collaborators = Array.from(contributorsSet).map((cid) => ({
          user: usersById.get(cid) || { id: cid, name: `#${cid}` },
          tasksCountWithYou: pTasks.filter((t) =>
            usersOnTask(t).includes(cid)
          ).length,
        }));

        collaborators.sort(
          (a, b) => b.tasksCountWithYou - a.tasksCountWithYou
        );

        return { project: p, collaborators };
      });
    }
  );
