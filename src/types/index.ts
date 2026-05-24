export type { User } from "../slices/AuthSlice";
export type { Project, Task } from "../slices/projectsSlice";
export type { Notification } from "../slices/notificationsSlice";

export * from "./navigation";
export * from "./dashboard";
export * from "./selectors";

export interface AppUser {
  id: string | number;
  name: string;
  email: string;
  role?: string;
  password?: string;
  [key: string]: unknown;
}

export interface TaskCardProps {
  task: import("../slices/projectsSlice").Task & {
    status?: string;
    priority?: string;
    assignedTo?: string | number;
    dueDate?: string;
    startAt?: string;
    endAt?: string;
    projectId?: string | number;
  };
  showAssignee?: boolean;
  showProject?: boolean;
  compact?: boolean;
  clickable?: boolean;
}
