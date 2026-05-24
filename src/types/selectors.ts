import type { User } from "../slices/AuthSlice";
import type { Project, Task } from "../slices/projectsSlice";

export interface TaskTimeMeta {
  start: Date | null;
  end: Date | null;
  msLeft: number | null;
  inWindow: boolean;
  isOverdue: boolean;
  isDisabled: boolean;
}

export interface TaskWithMeta extends Task {
  user?: User | null;
  project?: Project | null;
  time?: TaskTimeMeta;
}

export interface MakeSelectTasksOptions {
  userId?: string | number;
  role?: string;
  status?: "all" | "active" | "done";
}

export interface TasksGroupedResult {
  list: TaskWithMeta[];
  grouped: Record<string, TaskWithMeta[]>;
  statuses: string[];
}

export interface AdminStats {
  activeProjects: number;
  tasksTotal: number;
  tasksByStatus: {
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
}

export interface UserTasksGroupedItem {
  project: Project;
  tasks: TaskWithMeta[];
}

export interface CollaboratorEntry {
  user: User | { id: string | number; name: string };
  tasksCountWithYou: number;
}

export interface CollaboratorsPerProjectItem {
  project: Project;
  collaborators: CollaboratorEntry[];
}

export interface NotificationFilterOptions {
  search?: string;
  types?: string[];
  unreadOnly?: boolean;
  projectIds?: Array<string | number>;
  approverOnly?: boolean;
  dateFrom?: string | Date;
  dateTo?: string | Date;
}
