// src/pages/ViweerSingelTaske.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useAppSelector, useAppDispatch } from "../store/Hooks";

import {
  makeSelectTaskDetails,
  formatDuration,
  computeTaskTimeMeta,
  makeSelectProjectById,
} from "../store/selectors";

import {
  requestDeleteTask,
  confirmDeleteTask,
  toggleTaskComplete,
} from "../slices/projectsSlice";
import { isTaskDone, canUserCompleteTask } from "../store/selectors";

const HiberLink = ({ text, path, spichial }) => (
  <Link className={`duration-400 hover:text-[red] ${spichial && "font-bold"} hover:underline`} to={path}>
    {text}
  </Link>
);

// ---------------- DeletPopUp component ----------------
const DeletPopUp = ({ open, onClose, onConfirm, projectName = "" }) => {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  // اغلاق بالـ Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const matches = typed.trim() === (projectName || "").trim();

  return (
    <>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 flex items-center justify-center"
            aria-hidden="true"
          >
            {/* زجاجي بلور */}
            <div
              className="absolute inset-0 bg-black/40"
              style={{ WebkitBackdropFilter: "blur(6px)" }}
            />
          </motion.div>

          {/* modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="fixed z-50 inset-0 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Delete confirmation"
          >
            <div className="max-w-md w-full rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-700 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-red-700">Confirm Deletion</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                هذا الإجراء سيطلب حذف المهمة. لِلتأكيد اكتب اسم المشروع بالضبط ثم اضغط
                <span className="font-mono bg-gray-100 px-1 rounded ml-1">Confirm</span>.
              </p>

              <div className="mt-4">
                <label className="block text-xs text-gray-500 mb-1">اكتب اسم المشروع للتأكيد</label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-slate-800 dark:border-slate-700"
                  placeholder={`اكتب: ${projectName}`}
                  autoFocus
                />
                <div className="mt-2 text-xs text-gray-500">
                  <span className={`${matches ? "text-green-600" : "text-red-600"}`}>
                    {matches ? "الاسم مطابق" : "الاسم لا يزال لا يطابق"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={onClose} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">
                  إلغاء
                </button>

                <button
                  onClick={() => onConfirm()}
                  disabled={!matches}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed
                    ${matches ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-100 text-red-600"}`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
};
// const { data: projects, isLoading } = useGetProjectsQuery();

function ViweerSingelTaske() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // current user (افضل تجيبها من auth slice)
  const currentUser = useAppSelector((s) => s.auth?.user || null);
  const usersList = useAppSelector((s) => s.auth?.usersList || s.users?.list || []);

  // 📦 هات بيانات المهمة (selector memoized)
  const selectTask = useMemo(() => makeSelectTaskDetails(id), [id]);
  const task = useAppSelector(selectTask); // may be null

  // project selector (we create selector with projectId even if null -> returns null)
  const projectIdForSelector = task?.projectId ?? null;
  const selectProject = useMemo(() => makeSelectProjectById(projectIdForSelector ?? -1), [projectIdForSelector]);
  const project = useAppSelector(selectProject);

  // members (convert ids -> user objects)
  const members = useMemo(() => {
    const mem = Array.isArray(project?.members) ? project.members : [];
    if (!mem.length) return [];
    const byId = new Map(usersList.map((u) => [String(u.id), u]));
    return mem.map((mid) => byId.get(String(mid)) || { id: mid, name: `#${mid}` });
  }, [project?.members, usersList]);



  // UI state
  const [deletPopUp, setDeletePopUp] = useState(false);

  // ⏱️ timer
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);


  // safety: don't try to read task props before task exists
  if (!task) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="p-4 rounded border border-dashed text-gray-600">❌ Task not found</div>
      </div>
    );
  }

  // compute timing safely
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const msLeft = dueDate ? dueDate - now : null;
  const remaining = msLeft == null ? "—" : msLeft > 0 ? formatDuration(msLeft) : "Overdue";
  const isOverdue = msLeft != null ? msLeft < 0 : false;

  const data = computeTaskTimeMeta(task) || {};
  const statusColor = chipColorByStatus(task.status);
  const priorityColor = chipColorByPriority(task.priority);
  const timerColor = isOverdue ? "text-red-600" : (msLeft != null && msLeft < 6 * 60 * 60 * 1000) ? "text-green-600" : "text-sky-600";
  const done = isTaskDone(task);
  const canComplete = canUserCompleteTask(task, currentUser?.id);
  const disabled = done || isOverdue;

  // delete handler (uses roles & rules)
  const onConfirmDelete = async () => {
    try {
      // snapshot always sent
      const payloadBase = {
        projectId: project?.id,
        taskId: task.id,
        taskSnapshot: task,
      };

      // is project leader OR admin?
      const isProjectLeader = project && currentUser && project.leaderId == currentUser.id;
      const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";


      if (isAdmin || isProjectLeader) {
        // approve immediate delete
        await dispatch(confirmDeleteTask({
          ...payloadBase,
          approverId: currentUser?.id,
          approve: true,
          Abrov: { name: currentUser.name } || null
        })).unwrap();
        return;
      }
      
      // navigate away after delete
      navigate("/");
      
      // // otherwise request deletion (pending)
      await dispatch(requestDeleteTask({
        projectId: project.id,
        taskId: task.id,
        userId: currentUser?.id || null
      })).unwrap(); // فيه مشكله في الحذف عندك 

      // show feedback (could be toast)
      console.log("Delete request sent");
    } catch (err) {
      console.error("Delete flow error:", err);
    } finally {
      setDeletePopUp(false);
    }
  };



  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500">
        <Link to="/projects" className="hover:underline">Projects</Link>
        {project?.id && (
          <>
            <span className="mx-1">/</span>
            <Link to={`/projects/${project.id}`} className="hover:underline font-medium">{project.name || "Unnamed Project"}</Link>
          </>
        )}
        <span className="mx-1">/</span>
        <span className="text-gray-800 font-medium">Task #{task.id}</span>
      </nav>

      {/* Header */}
      <header className="flex  items-start justify-between gap-4">
        <div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={done}
              disabled={!project?.id || !canComplete}
              title={
                canComplete
                  ? done
                    ? "Mark incomplete"
                    : "Mark complete"
                  : "Only the assigned user can complete this task"
              }
              onChange={(e) => {
                if (!project?.id || !currentUser?.id || !canComplete) return;
                dispatch(
                  toggleTaskComplete({
                    projectId: project.id,
                    taskId: task.id,
                    completed: e.target.checked,
                    userId: currentUser.id,
                  })
                );
              }}
              className={`mt-2 h-5 w-5 shrink-0 rounded border-gray-300 accent-green-600 focus:ring-green-500 ${
                canComplete ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
              aria-label={done ? "Mark task incomplete" : "Mark task complete"}
            />
            <h1
              className={`text-2xl md:text-3xl font-bold ${
                done ? "line-through text-gray-500" : ""
              }`}
            >
              {task.title || "Untitled Task"}
            </h1>
          </div>
          {task.description && <p className="text-gray-600 mt-1">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Chip label={task.status || "unknown"} className={statusColor} />
            <Chip label={task.priority || "no-priority"} className={priorityColor} />
            {isOverdue && <Chip label="Overdue" className="bg-red-100 text-red-700" />}
            {task.deleteRequest && <Chip label="Delete requested" className="bg-yellow-100 text-yellow-700" />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded bg-sky-600 text-white disabled:opacity-50"
            disabled={disabled}
            title={disabled ? "Action disabled: task done/blocked/overdue" : "Start / Open"}
          >
            Start / Open
          </button>

          {currentUser.role == 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 260, damping: 15 }}
              className="bg-red-500 duration-200 w-fit hover:bg-red-800 p-1 rounded text-white"
              onClick={() => setDeletePopUp(true)}
            >
              Delete
            </motion.button>
          )}

          {currentUser?.role === "admin" && (
            <button className="px-3 py-1.5 rounded bg-gray-100">Admin Action</button>
          )}
        </div>
      </header>

      {/* Meta */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Assignee">
          <div className="text-gray-800">
            {task.user?.name || "Unassigned"}
            {task.user?.email && <div className="text-sm text-gray-500">{task.user.email}</div>}
          </div>
        </Card>

        <Card title="Project">
          {project?.id ? (
            <div className="text-gray-800">
              <HiberLink spichial={true} text={project.name || "Unnamed Project"} path={`/projects/${project.id}`} />
              <div className="text-sm text-gray-500">Status: {project.status || "—"}</div>

              {members.length > 0 && (
                <div className="text-sm text-gray-500 mt-2">
                  <strong>Members:</strong>{" "}
                  {members.map((m, i) => (
                    <span key={m.id ?? i} className="text-gray-700">
                      [{m.name}] {i < members.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No Project</div>
          )}
        </Card>

        {/* Timing */}
        <Card title="Timing">
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Due date: <strong>{task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}</strong></li>
            <li>Remaining: <strong className={`font-semibold ${timerColor}`}>{remaining}</strong></li>
            <li>Overdue: <strong className={isOverdue ? "text-red-600" : ""}>{isOverdue ? "Yes" : "No"}</strong></li>
          </ul>

          <div className={`mt-4 text-lg font-bold ${timerColor}`}>
            {isOverdue ? "⏰ Task overdue!" : (msLeft == null ? "—" : `⏳ ${formatDuration(msLeft)} remaining`)}
          </div>
        </Card>

        <Card title="Audit">
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Created at: <strong>{task.createdAt ? new Date(task.createdAt).toLocaleString() : "—"}</strong></li>
            <li>Updated at: <strong>{task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "—"}</strong></li>
            <li>Created by: <HiberLink text={task.createdByName || (task.user?.name || "غير مذكور")} path={`/user/${task.createdBy ?? ""}`} /></li>
          </ul>
        </Card>
      </section>

      {/* delete modal */}
      <AnimatePresence>
        {deletPopUp && (
          <DeletPopUp
            open={deletPopUp}
            onClose={() => setDeletePopUp(false)}
            onConfirm={onConfirmDelete}
            projectName={project?.name || ""}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* UI helpers */
function Card({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Chip({ label, className = "" }) {
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${className}`}>{label}</span>;
}

function chipColorByStatus(status = "") {
  const s = (status || "").toLowerCase();
  if (s === "done") return "bg-green-100 text-green-700";
  if (s === "blocked") return "bg-amber-100 text-amber-800";
  if (s === "in progress") return "bg-sky-100 text-sky-700";
  if (s === "todo") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

function chipColorByPriority(priority = "") {
  const p = (priority || "").toLowerCase();
  if (p === "urgent") return "bg-red-100 text-red-700";
  if (p === "high") return "bg-orange-100 text-orange-700";
  if (p === "medium") return "bg-blue-100 text-blue-700";
  if (p === "low") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

export default ViweerSingelTaske;
//  عدلنا ال ViweerSingelTaske علي اخر اصدار يوزر او ادمن يحذف