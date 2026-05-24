export const ProjectSection = {
  ACTIVE: "active_project",
  HIDDEN: "hidden_projects",
  ARCHIVED: "archived_projects",
  COMPLETED: "completed_projects",
} as const;

export type ProjectSectionId =
  (typeof ProjectSection)[keyof typeof ProjectSection];
