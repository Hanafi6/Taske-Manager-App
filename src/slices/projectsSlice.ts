import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { deleteData, getData, postData, updateData } from "../api/api";

// ----------------------------------------------------------------------
// 1️⃣ تعاريف الـ Interfaces والـ Types (المهمة جداً للـ TypeScript)
// ----------------------------------------------------------------------

export interface DeleteRequest {
  userId: string | number;
  requestedAt: string;
  snapshot: Task;
}

export interface Task {
  id: string | number;
  projectId?: string | number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string | number;
  completed?: boolean;
  dueDate?: string;
  startAt?: string;
  endAt?: string;
  createdAt?: string;
  updatedAt?: string;
  collaborators?: Array<string | number>;
  deleteRequest?: DeleteRequest | null;
  [key: string]: unknown;
}

export interface Project {
  id: string | number;
  name: string;
  status: 'active' | 'stopped' | 'archived' | 'hidden' | string;
  previousStatus?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
  hidden?: boolean;
  hiddenAt?: string | null;
  deleted?: boolean;
  deletedAt?: string | null;
  tasks?: Task[];
  members?: string[];
  [key: string]: any;
}

export interface ProjectsState {
  list: Project[];
  tasks: Task[];
  loading: boolean;
  loadingSome: boolean;
  error: string | null;
  selectProject: Project | null;
}

// الـ Type الخاص بالـ RootState عشان الـ getState() جوه الـ thunks يشوف الـ state صح
interface RootState {
  projects: ProjectsState;
  [key: string]: any;
}

// 🧩 helper: تطبيع الأخطاء
const normalizeError = (err: any): string => {
  if (typeof err === "string") return err;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return "Something went wrong";
};

// ----------------------------------------------------------------------
// 2️⃣ الـ Async Thunks (مع تحديد أنواع الـ Arguments والـ Return والـ Reject)
// ----------------------------------------------------------------------

// 🟦 Request Delete Task (طلب حذف تاسك)
export const requestDeleteTask = createAsyncThunk<
  { projectId: string | number; taskId: string | number; userId: string | number; updatedProject: any; taskSnapshot: Task },
  { projectId: string | number; taskId: string | number; userId: string | number },
  { rejectValue: string }
>(
  "projects/requestDeleteTask",
  async ({ projectId, taskId, userId }, { rejectWithValue }) => {
    try {
      const project: Project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");
      const task = (project.tasks || []).find(t => String(t.id) === String(taskId));
      if (!task) throw new Error("Task not found");

      const taskSnapshot = { ...task };

      const updatedTasks = (project.tasks || []).map((t) =>
        String(t.id) === String(taskId)
          ? { ...t, deleteRequest: { userId, requestedAt: new Date().toISOString(), snapshot: taskSnapshot } }
          : t
      );

      const updatedProject = { ...project, tasks: updatedTasks };
      const saved = await updateData("projects", projectId, updatedProject);
      if (!saved.ok) throw new Error("Failed to send delete request");
      const data = await saved.json();

      return { projectId, taskId, userId, updatedProject: data, taskSnapshot };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to request delete task");
    }
  }
);

// 🟦 Confirm Delete Task (موافقة أو رفض الحذف)
export const confirmDeleteTask = createAsyncThunk<
  { projectId: string | number; taskId: string | number; approverId: string | number; approve: boolean; deleted: boolean; updatedProject: any; taskSnapshot: Task | null; Abrov: any },
  { projectId: string | number; taskId: string | number; approverId: string | number; approve: boolean; Abrov: any },
  { rejectValue: string }
>(
  "projects/confirmDeleteTask",
  async ({ projectId, taskId, approverId, approve, Abrov }, { rejectWithValue }) => {
    try {
      const project: Project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");

      const task = (project.tasks || []).find(t => String(t.id) === String(taskId));
      const snapshot = task ? { ...task } : null;

      let updatedTasks = [...(project.tasks || [])];
      let deleted = false;

      if (approve) {
        updatedTasks = updatedTasks.filter((t) => String(t.id) !== String(taskId));
        deleted = true;
      } else {
        updatedTasks = updatedTasks.map((t) =>
          String(t.id) === String(taskId)
            ? { ...t, deleteRequest: null }
            : t
        );
      }

      const updatedProject = { ...project, tasks: updatedTasks };
      const saved = await updateData("projects", projectId, updatedProject);
      if (!saved.ok) throw new Error("Failed to confirm delete request");
      const data = await saved.json();

      return {
        projectId,
        taskId,
        approverId,
        approve,
        deleted,
        updatedProject: data,
        taskSnapshot: snapshot,
        Abrov
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to confirm delete task");
    }
  }
);

// 🟦 Archive Project 
export const archiveProject = createAsyncThunk<
  any,
  Project,
  { state: RootState; rejectValue: string }
>(
  "projects/toggleArchiveProject",
  async (project, { rejectWithValue, getState }) => {
    try {
      if (!project?.id) throw new Error("Invalid project");

      const { tasks } = getState().projects;
      const projectTasks = tasks.filter(t => t.projectId === project.id);

      const updated = {
        ...project,
        previousStatus: project.status,
        status: "archived",
        archived: true,
        archivedAt: !project.archived ? new Date().toISOString() : null,
        tasks: projectTasks,
      };
      const saved = await updateData("projects", project.id, updated);

      // انتبه هنا: كودك الأصلي بيرجع الـ response بتاع الـ updateData علطول
      // وضفت projectId في الـ payload المرجعة في الـ extraReducers تحسباً للـ اللوجيك بتاع الفلترة
      return { projectId: project.id, savedProject: saved };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle archive project");
    }
  }
);

// 🟦 UnArchive Project (رجوع من الأرشيف)
export const unArchiveProject = createAsyncThunk<
  { projectId: string | number; updatedProject: any },
  Project,
  { state: RootState; rejectValue: string }
>(
  "projects/unArchiveProject",
  async (project, { rejectWithValue, getState }) => {
    try {
      if (!project?.id) throw new Error("Invalid project");
      const { tasks } = getState().projects;
      const projectTasks = tasks.filter(t => t.projectId === project.id);

      const updated = {
        ...project,
        previousStatus: project.status,
        deleted: false,
        deletedAt: null,
      };

      const saved = await updateData("projects", project.id, updated);
      await deleteData("archeivePorjects", project.id);

      return { projectId: project.id, updatedProject: saved };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to unarchive project");
    }
  }
);

// ☠️ Delete Permanently Project (لاحظ هنا إن الـ payload بيكون الـ projectId وممكن يتبعت كـ object أو string)
export const deletePermanentlyProject = createAsyncThunk<
  { projectId: any },
  any,
  { rejectValue: string }
>(
  "projects/deletePermanently",
  async (projectId, { rejectWithValue }) => {
    try {
      if (!projectId) throw new Error("ProjectId is required");

      // هنا كودك بيتعامل مع projectId على أساس إنه object جواه id: projectId.id
      const actualId = projectId?.id ? projectId.id : projectId;

      await deleteData("projects", actualId);
      await getData("projects");

      try {
        await deleteData("archeivePorjects", actualId);
      } catch (e) {
        console.log(e);
      }

      return { projectId };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete project permanently");
    }
  }
);

// 🟦 Stop Project
export const stopProject = createAsyncThunk<any, Project, { rejectValue: string }>(
  "projects/stopProject",
  async (project, { rejectWithValue }) => {
    try {
      const updated = { ...project, status: "stopped" };
      const saved = await updateData("projects", project.id, updated);
      return saved;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to stop project");
    }
  }
);

// 🟦 Toggle Hide / Show Project
export const hideProject = createAsyncThunk<any, Project, { state: RootState; rejectValue: string }>(
  "projects/toggleProjectHidden",
  async (project, { rejectWithValue, getState }) => {
    try {
      const { tasks } = getState().projects;
      const projectTasks = tasks.filter(t => t.projectId === project.id);

      const isHidden = project.hidden === true;

      const updatedProject = {
        ...project,
        status: isHidden ? project.previousStatus : 'hidden',
        previousStatus: isHidden ? null : project.status,
        hidden: !isHidden,
        hiddenAt: isHidden ? null : new Date().toISOString(),
        tasks: projectTasks,
      };

      const saved = await updateData("projects", project.id, updatedProject);
      return saved;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle project hidden");
    }
  }
);

// 🟦 Fetch Projects
export const fetchProjects = createAsyncThunk<{ projects: Project[]; tasks: Task[] }, void, { rejectValue: string }>(
  "projects/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const raw: any[] = (await getData("projects")) || [];
      const projects = raw.map(({ tasks = [], ...p }) => p);
      const tasks = raw.flatMap((p) =>
        (p.tasks || []).map((t: any) => ({ ...t, projectId: p.id }))
      );
      return { projects, tasks };
    } catch (e) {
      return rejectWithValue(normalizeError(e));
    }
  }
);

// 🟦 Add Project
export const addProject = createAsyncThunk<any, { name: string;[key: string]: any }, { rejectValue: string }>(
  "projects/add",
  async (payload, { rejectWithValue }) => {
    try {
      if (!payload.name) return rejectWithValue("Project name is required");
      const created = await postData("projects", payload);
      if (!created || !created.id) return rejectWithValue("Server did not return created project");
      return created;
    } catch (e) {
      return rejectWithValue(normalizeError(e));
    }
  }
);

// 🟦 Add Task
export const addTask = createAsyncThunk<
  { projectId: string | number; task: Task; updatedProject: any },
  { projectId: string | number; task: Partial<Task> },
  { rejectValue: string }
>(
  "projects/addTask",
  async ({ projectId, task }, { rejectWithValue }) => {
    try {
      if (!projectId || !task) throw new Error("ProjectId and Task required");

      const project: Project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");

      const newTask: Task = {
        ...task,
        id: task.id || Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProject = {
        ...project,
        tasks: [...(project.tasks || []), newTask],
      };

      const saved = await updateData("projects", projectId, updatedProject);
      return { projectId, task: newTask, updatedProject: saved };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to add task. Please try again.");
    }
  }
);

// 🟦 Toggle task complete (checkbox)
export const toggleTaskComplete = createAsyncThunk<
  { projectId: string | number; task: Task; updatedProject: Project },
  {
    projectId: string | number;
    taskId: string | number;
    completed: boolean;
    userId: string | number;
  },
  { rejectValue: string }
>(
  "projects/toggleTaskComplete",
  async ({ projectId, taskId, completed, userId }, { rejectWithValue }) => {
    try {
      const project: Project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");

      const existing = (project.tasks || []).find(
        (t) => String(t.id) === String(taskId)
      );
      if (!existing) throw new Error("Task not found");

      if (
        existing.assignedTo == null ||
        String(existing.assignedTo) !== String(userId)
      ) {
        throw new Error("Only the assigned user can complete this task");
      }

      const restoreStatus =
        existing.status === "done" || existing.status === "completed"
          ? "active"
          : existing.status || "active";

      const updatedTask: Task = {
        ...existing,
        status: completed ? "done" : restoreStatus,
        completed,
        updatedAt: new Date().toISOString(),
      };

      const updatedTasks = (project.tasks || []).map((t) =>
        String(t.id) === String(taskId) ? updatedTask : t
      );

      const updatedProject = { ...project, tasks: updatedTasks };
      const saved = await updateData<Project>("projects", projectId, updatedProject);

      return { projectId, task: updatedTask, updatedProject: saved };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update task";
      return rejectWithValue(message);
    }
  }
);

// 🟦 Assign User To Project
export const AddUserToProject = createAsyncThunk<
  { updatedProject: any; userId: string | number },
  { projectId: string | number; userId: string | number },
  { rejectValue: string }
>(
  "projects/assignTaskToUser",
  async ({ projectId, userId }, { rejectWithValue }) => {
    try {
      if (!projectId || !userId) throw new Error("ProjectId and UserId required");

      const project: Project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");
      const updatedProject = {
        ...project,
        members: Array.isArray(project.members) ? [...project.members, `${userId}`] : [`${userId}`],
      };

      const saved = await updateData("projects", projectId, updatedProject);
      return { updatedProject: saved, userId };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to assign task to user. Please try again.");
    }
  }
);

// ----------------------------------------------------------------------
// 3️⃣ الـ Slice
// ----------------------------------------------------------------------

const initialState: ProjectsState = {
  list: [],
  tasks: [],
  loading: false,
  loadingSome: false,
  error: null,
  selectProject: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    toggleProjectHidden: (state, action: PayloadAction<string | number>) => {
      const project = state.list.find(p => p.id === action.payload);
      if (project) {
        project.hidden = !project.hidden;
      }
    },
    setSelectProject: (state, action: PayloadAction<Project | null>) => {
      state.selectProject = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setData: (state, action: PayloadAction<{ projects?: any[] } | undefined>) => {
      const { projects: rawProjects = [] } = action.payload || {};

      state.list = rawProjects.map(({ tasks = [], ...p }) => p);
      state.tasks = rawProjects.flatMap((p) =>
        (p.tasks || []).map((t: any) => ({ ...t, projectId: p.id }))
      );

      state.loading = false;
      state.loadingSome = false;
      state.error = null;
    },
    addTaskToProjectLocal: (state, action: PayloadAction<{ projectId: string | number; task: Task }>) => {
      const { projectId, task } = action.payload;
      const proj = state.list.find((p) => String(p.id) === String(projectId));
      if (proj) {
        if (!Array.isArray(proj.tasks)) proj.tasks = [];
        proj.tasks.push(task);
      }
      state.tasks.push({ ...task, projectId });
    },
    addSingleProject: (state, action: PayloadAction<Project>) => {
      state.list.push(action.payload);
    },
    assignTaskToUser: (state, action: PayloadAction<{ taskId: string | number; userId: string | number }>) => {
      // لو هتحتاج اللوجيك ده بعدين فك الكومنت عنه
      // const { taskId, userId } = action.payload;
      // const task = state.tasks.find(t => t.id === taskId);
      // if (task) { task.assignedTo = userId; }
    }
  },
  extraReducers: (builder) => {
    builder
      // 🔹 Fetch Projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.projects;
        state.tasks = action.payload.tasks;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch projects";
      })

      // 🔹 Add Project
      .addCase(addProject.pending, (state) => {
        state.loadingSome = true;
        state.error = null;
      })
      .addCase(addProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const { tasks, ...proj } = action.payload;
        state.list.push(proj);
        if (Array.isArray(tasks) && tasks.length) {
          const flat = tasks.map((t: any) => ({ ...t, projectId: proj.id }));
          state.tasks.push(...flat);
        }
      })
      .addCase(addProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to add project";
      })

      // 🔹 Add Task
      .addCase(addTask.pending, (state) => {
        state.loadingSome = true;
        state.error = null;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        state.loadingSome = false;
        const { projectId, task, updatedProject } = action.payload;
        state.tasks.push({ ...task, projectId });

        const projIndex = state.list.findIndex((p) => String(p.id) === String(projectId));
        if (projIndex !== -1) {
          state.list[projIndex] = {
            ...updatedProject,
            tasks: updatedProject.tasks || [],
          };
        }
      })
      .addCase(addTask.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to add task";
      })

      // 🔹 Toggle task complete
      .addCase(toggleTaskComplete.fulfilled, (state, action) => {
        const { projectId, task, updatedProject } = action.payload;
        const taskIndex = state.tasks.findIndex(
          (t) =>
            String(t.id) === String(task.id) &&
            String(t.projectId) === String(projectId)
        );
        if (taskIndex !== -1) {
          state.tasks[taskIndex] = { ...task, projectId };
        }

        const projIndex = state.list.findIndex(
          (p) => String(p.id) === String(projectId)
        );
        if (projIndex !== -1) {
          state.list[projIndex] = {
            ...updatedProject,
            tasks: updatedProject.tasks || [],
          };
        }
      })
      .addCase(toggleTaskComplete.rejected, (state, action) => {
        state.error = action.payload || "Failed to update task";
      })

      // 🔹 Request Delete Task
      .addCase(requestDeleteTask.fulfilled, (state, action) => {
        const { projectId, updatedProject } = action.payload;
        const projIndex = state.list.findIndex((p) => p.id === projectId);
        if (projIndex !== -1) state.list[projIndex] = updatedProject;
      })
      .addCase(requestDeleteTask.rejected, (state, action) => {
        state.error = action.payload || "Failed to request delete task";
      })

      // 🔹 Confirm Delete Task
      .addCase(confirmDeleteTask.fulfilled, (state, action) => {
        const { projectId, updatedProject } = action.payload;
        const projIndex = state.list.findIndex((p) => p.id === projectId);
        if (projIndex !== -1) state.list[projIndex] = updatedProject;
        state.tasks = state.tasks.filter(
          (t) => !(String(t.projectId) === String(projectId) && !updatedProject.tasks.find((x: any) => x.id === t.id))
        );
      })
      .addCase(confirmDeleteTask.rejected, (state, action) => {
        state.error = action.payload || "Failed to confirm delete task";
      })

      // 🟥 ARCHIVE PROJECT
      .addCase(archiveProject.pending, (state) => {
        state.loadingSome = true;
      })
      .addCase(archiveProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const { projectId } = action.payload;
        state.list = state.list.filter((p) => String(p.id) !== String(projectId));
        state.tasks = state.tasks.filter((t) => String(t.projectId) !== String(projectId));
      })
      .addCase(archiveProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to archive project";
      })

      // 🟩 UNARCHIVE PROJECT
      .addCase(unArchiveProject.pending, (state) => {
        state.loadingSome = true;
      })
      .addCase(unArchiveProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const { updatedProject } = action.payload;
        const { tasks, ...proj } = updatedProject;

        state.list.push(proj);
        if (Array.isArray(tasks)) {
          state.tasks.push(...tasks.map((t: any) => ({ ...t, projectId: proj.id })));
        }
      })
      .addCase(unArchiveProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to unarchive project";
      })

      // ⛔ DELETE PERMANENTLY
      .addCase(deletePermanentlyProject.pending, (state) => {
        state.loadingSome = true;
      })
      .addCase(deletePermanentlyProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const { projectId } = action.payload;
        const actualId = projectId?.id ? projectId.id : projectId;

        state.list = state.list.filter((p) => String(p.id) !== String(actualId));
        state.tasks = state.tasks.filter((t) => String(t.projectId) !== String(actualId));
      })
      .addCase(deletePermanentlyProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to delete project permanently";
      })

      // 🟧 STOP PROJECT
      .addCase(stopProject.pending, (state) => {
        state.loadingSome = true;
      })
      .addCase(stopProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const updated = action.payload;
        const i = state.list.findIndex((p) => p.id === updated.id);
        if (i !== -1) {
          state.list[i] = { ...state.list[i], status: updated.status };
        }
      })
      .addCase(stopProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to stop project";
      })

      // 👁️ HIDE PROJECT
      .addCase(hideProject.pending, (state) => {
        state.loadingSome = true;
      })
      .addCase(hideProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const updated = action.payload;
        const i = state.list.findIndex((p) => String(p.id) === String(updated.id));
        if (i !== -1) {
          state.list[i] = updated;
        }
      })
      .addCase(hideProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to toggle hide project";
      })

      // 👥 ASSIGN USER TO PROJECT
      .addCase(AddUserToProject.fulfilled, (state, action) => {
        const { updatedProject } = action.payload;
        const projIndex = state.list.findIndex((p) => String(p.id) === String(updatedProject.id));

        if (projIndex !== -1) {
          state.list[projIndex] = {
            ...updatedProject,
            tasks: updatedProject.tasks || [],
          };
        }
      })
      .addCase(AddUserToProject.rejected, (state, action) => {
        state.error = action.payload || "Failed to assign user to project";
      });
  },
});

export const {
  setSelectProject,
  clearError,
  addTaskToProjectLocal,
  setData,
  addSingleProject,
  toggleProjectHidden,
  assignTaskToUser,
} = projectsSlice.actions;

export default projectsSlice.reducer;