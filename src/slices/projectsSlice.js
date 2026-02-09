import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { deleteData, getData, postData, updateData } from "../api/api";
import { useSelector } from "react-redux";

// 🧩 helper: تطبيع الأخطاء
const normalizeError = (err) => {
  if (typeof err === "string") return err;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return "Something went wrong";
};

// 🟦 Request Delete Task (طلب حذف تاسك)
export const requestDeleteTask = createAsyncThunk(
  "projects/requestDeleteTask",
  async ({ projectId, taskId, userId }, { rejectWithValue }) => {
    try {
      const project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");
      const task = (project.tasks || []).find(t => String(t.id) === String(taskId));
      if (!task) throw new Error("Task not found");

      // snapshot of task to include in notification/logs
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

      // return snapshot as part of result/meta
      return { projectId, taskId, userId, updatedProject: data, taskSnapshot };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to request delete task");
    }
  }
);


// 🟦 Confirm Delete Task (موافقة أو رفض الحذف)
export const confirmDeleteTask = createAsyncThunk(
  "projects/confirmDeleteTask",
  async ({ projectId, taskId, approverId, approve, Abrov }, { rejectWithValue }) => {
    try {
      const project = await getData(`projects/${projectId}`);
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
    } catch (err) {
      return rejectWithValue(err.message || "Failed to confirm delete task");
    }
  }
);


// export const DeleteProject = createAsyncThunk(
//   "projects/DeleteProject",
//   async (project, { rejectWithValue }) => {
//     try {
//       if (!project) throw new Error("Invalid project");

//       const projectId = project.id;

//       // 1️⃣ نعدّل المشروع: نخليه deleted + ممكن نحط deletedAt
//       const updatedProject = {
//         ...project,
//         deleted: true,
//         deletedAt: new Date().toISOString(),
//       };

//       // ده بيرجع الـ project بعد التعديل من الـ API (res.json)
//       const projectRes = await updateData("projects", projectId, updatedProject);
//       const ProJectInAcrchive = await postData("archeivePorjects", updatedProject);
//       // archeivePorjects



//       return { projectId, archivedProject: projectRes };
//     } catch (err) {
//       console.error("DeleteProject error:", err);
//       return rejectWithValue(err.message || "Failed to delete project");
//     }
//   }
// );



// 🟦 Fetch Projects

// 🟦 Archive Project (بدل DeleteProject) بص انتا هنا هتعدل 

export const archiveProject = createAsyncThunk(
  "projects/toggleArchiveProject",
  async (project, { rejectWithValue, getState }) => {
    try {
      if (!project?.id) throw new Error("Invalid project");

      const { tasks } = getState().projects;
      // كل التاسكات الخاصة بالمشروع
      const projectTasks = tasks.filter(
        t => t.projectId === project.id
      );

      const updated = {
        ...project,
        previousStatus: project.status,
        status: "archived",
        archived: true, // 👈 flag
        archivedAt: !project.archived ? new Date().toISOString() : null,
        tasks: projectTasks,
      };
      const saved = await updateData("projects", project.id, updated);
      return saved;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to toggle archive project");
    }
  }
);
// شوف انتا كنت بتعمل ايه في الأرشيف و الان ارشيف

// 🟦 UnArchive Project (رجوع من الأرشيف)
export const unArchiveProject = createAsyncThunk(
  "projects/unArchiveProject",
  async (project, { rejectWithValue, getState }) => {
    try {
      if (!project) throw new Error("Invalid project");
      const { tasks } = getState().projects;
      // كل التاسكات الخاصة بالمشروع
      const projectTasks = tasks.filter(
        t => t.projectId === project.id
      );

      const updated = {
        ...project,
        previousStatus: project.status,

        deleted: false,
        deletedAt: null,
      };

      const saved = await updateData("projects", project.id, updated);
      await deleteData("archeivePorjects", project.id);

      return { projectId: project.id, updatedProject: saved };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to unarchive project");
    }
  }
);

// ☠️ Delete Permanently Project
export const deletePermanentlyProject = createAsyncThunk(
  "projects/deletePermanently",
  async (projectId, { rejectWithValue }) => {
    try {
      if (!projectId) throw new Error("ProjectId is required");

      console.log(projectId)

      // 🧨 احذف من المشاريع الأساسية
      const respons = await deleteData("projects", projectId.id);
      const res = await getData("projects", projectId.id);

      // 🧹 احذف من الأرشيف لو موجود
      try {
        await deleteData("archeivePorjects", projectId.id);
      } catch (e) {
        // مش مشكلة لو مش موجود
        console.log(e)
      }

      console.log(res)
      console.log(respons)

      return { projectId };
    } catch (err) {
      return rejectWithValue(
        err.message || "Failed to delete project permanently"
      );
    }
  }
);





// 🟦 Stop Project
export const stopProject = createAsyncThunk(
  "projects/stopProject",
  async (project, { rejectWithValue }) => {
    try {
      const updated = { ...project, status: "stopped" };
      const saved = await updateData("projects", project.id, updated);
      return saved;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to stop project");
    }
  }
);

// 🟦 Toggle Hide / Show Project
export const hideProject = createAsyncThunk(
  "projects/toggleProjectHidden",
  async (project, { rejectWithValue, getState }) => {
    try {
      const { tasks } = getState().projects;

      // كل التاسكات الخاصة بالمشروع
      const projectTasks = tasks.filter(
        t => t.projectId === project.id
      );

      const isHidden = project.hidden === true;

      const updatedProject = {
        ...project,
        status: isHidden ? project.previousStatus : 'hidden',
        previousStatus: isHidden ? null : project.status,
        hidden: !isHidden,
        hiddenAt: isHidden ? null : new Date().toISOString(),
        tasks: projectTasks,
      };

      const saved = await updateData(
        "projects",
        project.id,
        updatedProject
      );

      return saved;
    } catch (err) {
      return rejectWithValue(
        err.message || "Failed to toggle project hidden"
      );
    }
  }
);


export const fetchProjects = createAsyncThunk(
  "projects/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const raw = (await getData("projects")) || [];
      const projects = raw.map(({ tasks = [], ...p }) => p);
      const tasks = raw.flatMap((p) =>
        (p.tasks || []).map((t) => ({ ...t, projectId: p.id }))
      );
      return { projects, tasks };
    } catch (e) {
      return rejectWithValue(normalizeError(e));
    }
  }
);

// 🟦 Add Project
export const addProject = createAsyncThunk(
  "projects/add",
  async (payload, { rejectWithValue }) => {
    console.log(payload)
    try {
      if (!payload.name) return rejectWithValue("Project name is required");
      const created = await postData("projects", payload);
      if (!created || !created.id)
        return rejectWithValue("Server did not return created project");
      return created;
    } catch (e) {
      return rejectWithValue(normalizeError(e));
    }
  }
);

// 🟦 Add Task
export const addTask = createAsyncThunk(
  "projects/addTask",
  async ({ projectId, task }, { rejectWithValue }) => {
    try {
      if (!projectId || !task) throw new Error("ProjectId and Task required");

      const project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");

      const newTask = {
        ...task,
        id: task.id || Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProject = {
        ...project,
        tasks: [...(project.tasks || []), newTask],
      };

      // مش fetch Response
      const saved = await updateData("projects", projectId, updatedProject);

      // هنا مش محتاج saved.ok ولا saved.json()
      return { projectId, task: newTask, updatedProject: saved };

    } catch (err) {
      return rejectWithValue(
        err.message || "Failed to add task. Please try again."
      );
    }
  }
);


export const AddUserToProject = createAsyncThunk(
  "projects/assignTaskToUser",
  async ({ projectId, userId }, { rejectWithValue }) => {
    try {

      if (!projectId || !userId) throw new Error("ProjectId and UserId required");

      const project = await getData(`projects/${projectId}`);
      if (!project) throw new Error("Project not found");
      const updatedProject = {
        ...project,
        members: Array.isArray(project.members) ? [...project.members, `${userId}`] : [`${userId}`],
      };

      console.log(updatedProject)
      const saved = await updateData("projects", projectId, updatedProject);



      return { updatedProject, userId };
    }
    catch (err) {
      return rejectWithValue(
        err.message || "Failed to assign task to user. Please try again."
      );
    }
  }
);

const projectsSlice = createSlice({
  name: "projects",
  initialState: {
    list: [],
    tasks: [],
    loading: false,
    loadingSome: false,
    error: null,
    selectProject: null,
  },
  reducers: {
    toggleProjectHidden: (state, action) => {
      const project = state.list.find(p => p.id === action.payload);
      if (project) {
        project.hidden = !project.hidden;
      }
    },
    // assignTaskToUser(state, action) {
    //   const { taskId, userId } = action.payload;
    //   const task = state.tasks.find(t => t.id === taskId);
    //   if (task) {
    //     task.assignedTo = userId;
    //   }
    // },
    setSelectProject(state, action) {
      state.selectProject = action.payload;
    },

    clearError(state) {
      state.error = null;
    },
    setData: (state, action) => {
      const { projects: rawProjects = [] } = action.payload || {};

      // تقسيم المشاريع
      state.list = rawProjects.map(({ tasks = [], ...p }) => p);

      // تقسيم الـ tasks
      state.tasks = rawProjects.flatMap((p) =>
        (p.tasks || []).map((t) => ({ ...t, projectId: p.id }))
      );

      // إشعارات
      // flags
      state.loading = false;
      state.loadingSome = false;
      state.error = null;
    },
    addTaskToProjectLocal(state, action) {
      const { projectId, task } = action.payload;
      const proj = state.list.find((p) => String(p.id) === String(projectId));
      if (proj) {
        if (!Array.isArray(proj.tasks)) proj.tasks = [];
        proj.tasks.push(task);
      }
      state.tasks.push({ ...task, projectId });
    },
    addSingleProject: (state, action) => {
      console.log(state)
      console.log(action)
      state.list.push(action.payload);
    },
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
          const flat = tasks.map((t) => ({ ...t, projectId: proj.id }));
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
      .addCase(addTask.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload || "Failed to add task";
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
          (t) => !(String(t.projectId) === String(projectId) && !updatedProject.tasks.find((x) => x.id === t.id))
        );
      })
      .addCase(confirmDeleteTask.rejected, (state, action) => {
        state.error = action.payload || "Failed to confirm delete task";
      })
      // ------------------------------
      // 🟥 ARCHIVE PROJECT
      // ------------------------------
      .addCase(archiveProject.pending, (state) => {
        // بدأ أرشفة مشروع
        state.loadingSome = true;
      })
      .addCase(archiveProject.fulfilled, (state, action) => {
        state.loadingSome = false;

        const { projectId } = action.payload;

        // شيل المشروع من القائمة (لأنه اتنقل للأرشيف)
        state.list = state.list.filter((p) => String(p.id) !== String(projectId));

        // شيل التاسكات بتاعته
        state.tasks = state.tasks.filter((t) => String(t.projectId) !== String(projectId));
      })
      .addCase(archiveProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload;
      })

      // ------------------------------
      // 🟩 UNARCHIVE PROJECT
      // ------------------------------
      .addCase(unArchiveProject.pending, (state) => {
        // بدأ إرجاع المشروع من الأرشيف
        state.loadingSome = true;
      })
      .addCase(unArchiveProject.fulfilled, (state, action) => {
        state.loadingSome = false;

        const { updatedProject } = action.payload;

        const { tasks, ...proj } = updatedProject;

        // رجّع المشروع للمين ليست
        state.list.push(proj);

        // ضيف التاسكات للمين ليست
        if (Array.isArray(tasks)) {
          state.tasks.push(...tasks.map((t) => ({ ...t, projectId: proj.id })));
        }
      })
      .addCase(unArchiveProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload;
      })

      // ------------------------------
      // ⛔ DELETE PERMANENTLY
      // ------------------------------
      .addCase(deletePermanentlyProject.pending, (state) => {
        // بدأ حذف نهائي
        state.loadingSome = true;
      })
      .addCase(deletePermanentlyProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const { projectId } = action.payload;


        // شيل المشروع نهائيًا
        state.list = state.list.filter((p) => String(p.id) != String(projectId.id));
        state.tasks = state.tasks.filter((t) => String(t.projectId) != String(projectId.id));
      })
      .addCase(deletePermanentlyProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload;
      })

      // ------------------------------
      // 🟧 STOP PROJECT
      // ------------------------------
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
        state.error = action.payload;
      })

      // ------------------------------
      // 👁️ HIDE PROJECT
      // ------------------------------
      .addCase(hideProject.pending, (state) => {
        state.loadingSome = true;
      })
      .addCase(hideProject.fulfilled, (state, action) => {
        state.loadingSome = false;
        const updated = action.payload;

        const i = state.list.findIndex((p) => p.id == updated.id);
        if (i !== -1) {
          state.list[i] = action.payload;
        }
      })
      .addCase(hideProject.rejected, (state, action) => {
        state.loadingSome = false;
        state.error = action.payload;
      }).addCase(AddUserToProject.fulfilled, (state, action) => {
        const { updatedProject, userId } = action.payload;
        const projIndex = state.list.findIndex(
          (p) => String(p.id) === String(updatedProject.id)
        );


        if (projIndex !== -1) {
          state.list[projIndex] = {
            ...updatedProject,
            tasks: updatedProject.tasks || [],
          };
        }
      }).addCase(AddUserToProject.rejected, (state, action) => {
        state.error = action.payload || "Failed to assign user to project";
      });

  },
});

export const { setSelectProject, clearError, addTaskToProjectLocal, setData, addSingleProject, toggleProjectHidden, assignTaskToUser } =
  projectsSlice.actions;
export default projectsSlice.reducer;
