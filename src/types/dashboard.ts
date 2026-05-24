import type { ReactNode } from "react";
import type { DropResult as DndDropResult } from "@hello-pangea/dnd";
import type { User } from "../slices/AuthSlice";
import type { Project, Task } from "../slices/projectsSlice";

export type DropResult = DndDropResult;

export interface ProjectTaps {
  hidden: Project[];
  archived: Project[];
  completed: Project[];
  active: Project[];
}

export interface StatusOfProjectsProps {
  user: User | null;
  onDragEnd: (result: DropResult) => void;
  handleToggleHidden: (project: Project) => void;
  handleRestoreProject: (project: Project) => void;
  highlightId: string | null;
  targetId: string | null;
  taps: ProjectTaps;
  loading: boolean;
  isAdmin: boolean;
  userProjects: Project[];
  allTasks: Task[];
  userId: string | number;
}

export interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  accent: string;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export interface ProjectsSectionProps {
  idS: string;
  title: string;
  projects: Project[];
  onToggleHidden: (project: Project) => void;
  onRestore: (project: Project) => void;
  highlightId: string | null;
  targetId: string | null;
  draggable?: boolean;
}
