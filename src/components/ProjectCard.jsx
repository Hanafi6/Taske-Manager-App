// components/ProjectCard.jsx
import React, { use, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { CircleArrowOutDownLeft, Delete } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import TaskCard from "../components/TaskeCard"; // تأكد من المسار والاسم
import { makeSelectTasksByProjectId } from "../store/selectors";
import { setListOfUsers, setOpenDiitailsDelete, setContextMeneuDimention, setShowContextMeneu, setSelectElement } from "../slices/Modals";
import { setSelectProject } from "../slices/projectsSlice";
import ProjectSection from "../typs/TypsOfNavigates";

// Helpers (مثل ما عندك)
const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];
const lower = (v) => (v || "").toString().toLowerCase();
const prioRank = (p) => {
  const i = PRIORITY_ORDER.indexOf(lower(p));
  return i === -1 ? PRIORITY_ORDER.length : i;
};

const isOverdue = (t) => t?.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date();
const getTopPriorityInProject = (tasks = []) => {
  if (!tasks.length) return null;
  return tasks
    .map((t) => lower(t.priority))
    .sort((a, b) => prioRank(a) - prioRank(b))[0] || null;
};

const priorityChipCls = (p) => {
  const pr = lower(p);
  if (pr === "urgent") return "bg-red-100 text-red-700";
  if (pr === "high") return "bg-orange-100 text-orange-700";
  if (pr === "medium") return "bg-amber-100 text-amber-800";
  if (pr === "low") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
};

const sortTasksByPriority = (a, b) => {
  const pa = prioRank(a.priority), pb = prioRank(b.priority);
  if (pa !== pb) return pa - pb;
  const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  return da - db;
};

function projectBadge(project, tasks, isSelected = false) {
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "done");
  const hasUrgentOrHigh = tasks.some((t) => ["urgent", "high"].includes(lower(t.priority)));
  const hasOverdue = tasks.some((t) => isOverdue(t));

  if (isSelected) {
    return {
      ring: "ring-yellow-400",
      bg: "bg-yellow-50",
      badge: "Selected",
      badgeCls: "bg-blue-100 text-blue-700",
    };
  }

  if (allDone || ["completed", "done"].includes(lower(project?.status))) {
    return { ring: "ring-green-400", bg: "bg-green-50", badge: "Completed", badgeCls: "bg-green-100 text-green-700" };
  }

  if (hasUrgentOrHigh || hasOverdue) {
    return { ring: "ring-red-400", bg: "bg-red-50", badge: hasOverdue ? "Overdue" : "Important", badgeCls: "bg-red-100 text-red-700" };
  }

  if (lower(project?.status) === "active") {
    return { ring: "ring-sky-400", bg: "bg-sky-50", badge: "Active", badgeCls: "bg-sky-100 text-sky-700" };
  }

  if (lower(project?.status) === "block" || lower(project?.status) === "blocked") {
    return { ring: "ring-gray-500", bg: "bg-gray-100", badge: "Blocked", badgeCls: "bg-gray-300 text-gray-800" };
  }

  return { ring: "ring-gray-300", bg: "bg-gray-50", badge: "Idle", badgeCls: "bg-gray-100 text-gray-700" };
}

export default function ProjectCard({
  project,
  tasksForProject = [],
  mode = "all",
  currentUserId = null,
  collapsible = true,
  defaultOpen = false,
  showStats = true,
  showMeta = true,
  clickableTitle = false,
  mineTaskes = false,
  CreateTaskeBtn = false,
  deletePro,
  hidden = false,
  onClickContext = () => { }
}) {
  const navigate = useNavigate();
  const { role } = useSelector((s) => s.auth || {});
  const users = useSelector((s) => s.auth?.usersList || []);
  const { tasks: allFlatTasks = [] } = useSelector((s) => s.projects || { tasks: [] });
  const dispach = useDispatch();

  const { ContextMeneuDimention, ShowContextMeneu, SelectElement } = useSelector((s) => s.modals || {});
  const isSelected = SelectElement?.id === project?.id;

  // --- Normalize IDs and inputs to avoid type-mismatch bugs ---
  const projId = project?.id;
  const numericCurrentUserId = currentUserId != null ? Number(currentUserId) : null;

  let tasks = []



  if (!mineTaskes) {
    // If tasksForProject is provided and is an array — use it.
    // Otherwise, fallback to filtering allFlatTasks by projectId (loose compare avoided)
    tasks = Array.isArray(tasksForProject)
      ? tasksForProject
      : allFlatTasks.filter((t) => t.projectId == projId);
  } else {
    const ts = useMemo(() => projId ? makeSelectTasksByProjectId(projId) : () => [], [projId]);
    tasks = useSelector(ts);
  }



  // دلوقتي نجيب التنسيقات بناءً على الاختيار
  const pc = projectBadge(project, tasks, isSelected);
  const stats = showStats
    ? {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in progress").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      done: tasks.filter((t) => t.status === "done").length,
    }
    : null;

  const isDitailsOpen = useSelector((s) => s.modals.OpenDatilsDeleteProject)

  const leader = users.find((u) => Number(u.id) === Number(project?.leaderId)) || null;
  const topPrio = getTopPriorityInProject(tasks);

  const [open, setOpen] = React.useState(defaultOpen);

  const checkStatus = (status) => {
    const map = {
      active: { label: "Archive", action: "archive", cls: "bg-amber-100 text-amber-800" },
      completed: { label: "Unblock", action: "unblock", cls: "bg-green-100 text-green-700" },
      block: { label: "Block", action: "block", cls: "bg-red-100 text-red-700" },
    };
    return map[status?.toLowerCase()] || { label: "Unknown", action: "none", cls: "bg-gray-100 text-gray-600" };
  };

  const btn = checkStatus(project?.status);

  // InfoChips (بقي كما عندك)
  const InfoChips = (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      {showMeta && (
        <>
          {project?.leaderId != null && (
            <Link
              to={`/user/${project.leaderId}`}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
              title={leader ? leader.name : `#${project.leaderId}`}
            >
              Leader: {leader ? leader.name : `#${project.leaderId}`}
            </Link>
          )}
          {Array.isArray(project?.members) && (
            <motion.span className="text-xs px-2 py-1 rounded bg-gray-100">
              Members: {project.members.length}
            </motion.span>
          )}
          {project?.createdAt && (
            <motion.span className="text-xs px-2 py-1 rounded bg-gray-100">
              Created: {new Date(project.createdAt).toLocaleDateString()}
            </motion.span>
          )}
          <motion.span className={`text-xs px-2 py-1 rounded ${priorityChipCls(topPrio)}`}>
            Top prio: {topPrio || "—"}
          </motion.span>
        </>
      )}

      {role === "admin" && (
        <button
          type="button"
          className={`text-xs px-2.5 py-1 rounded ${btn.cls}`}
          onClick={(e) => {
            e.stopPropagation();
            // TODO: dispatch action حسب الـ btn.action
          }}
          title="Admin action"
        >
          {btn.label}
        </button>
      )}
    </div>
  );

  const Content = (
    <div className="px-4 pb-4 pt-3 bg-white">
      <h4 className="font-semibold mb-2">
        {mode == "mine" ? `My Tasks (${+tasks?.length})` : `Tasks (${tasks.length})`}
      </h4>
      {tasks?.length ? (
        <ul className="space-y-2">
          <AnimatePresence>
            {tasks.map((t) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                key={t.id}
              >
                <TaskCard
                  task={t}
                  showAssignee={mode === "all"}
                  showProject={false}
                // clickable
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="p-3 rounded border border-dashed text-gray-600">
          {mode === "mine" ? "مفيش مهام متعيّنة ليك في المشروع ده." : "مفيش مهام لهذا المشروع."}
        </div>
      )}
    </div>
  );

  // function DBClick() {

  // }


  return (
    <motion.li onContextMenu={e => onClickContext(e, project)} className={`rounded-lg  border border-gray-200 ring-2 ${pc.ring} overflow-hidden ${hidden && 'bg-gray-300   '} `}>

      <div className={`w-full px-4 py-3 ${pc.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <button
                className={`text-left text-lg md:text-xl font-semibold truncate
  ${hidden ? 'line-through text-gray-400 cursor-not-allowed ' : 'hover:underline cursor-pointer'}
`}
                onClick={() => !hidden && clickableTitle && navigate(`/projects/${project.id}`)}

              >
                {project.name}
              </button>
              {hidden &&
                // if You Clicked On It Will Rotion You To Hiddens Pages
                <div
                  onClick={_ => {
                    navigate('/dashboard', { state: { scroll: { id: projId, sec: ProjectSection.HIDDEN } } });
                  }}
                  className="text-[#444] font-bold rounded p-1 bg-[#1f1f1f] duration-200 hover:text-[#fff] hover:bg-[#444] cursor-pointer "> Hided</div>
              }


              <span onClick={_ => {
                project.status == 'completed' && navigate('/dashboard', { state: { scroll: { id: projId, sec: ProjectSection.ARCHIVED } } })
              }} className={`text-xs px-2 cursor-pointer hover:bg-[#111] duration-200 py-0.5 rounded ${pc.badgeCls}`}>{pc.badge}</span>
              {mode === "mine" && (
                <span className="text-xs px-2 flex items-center gap-2 py-0.5 rounded bg-gray-100 text-gray-700">

                  My tasks: {tasks?.length}
                </span>
              )
              }
              {CreateTaskeBtn && role == 'admin' && (
                <>
                  <div
                    onClick={e => hidden == false ? navigate(`/add-taske-to-project/${project.id}`) : null}
                    className=" p-1 bg-red-500 rounded font-bold text-[#fff] capitalize cursor-pointer duration-200 hover:bg-red-700 select-none">create taske</div>
                  <div
                    onClick={_ => {
                      // deletePro(project)
                      dispach(setOpenDiitailsDelete(true));
                      dispach(setSelectProject(project));
                    }}
                    className=" p-1 bg-red-500 rounded font-bold text-[#fff] capitalize cursor-pointer duration-200 hover:bg-red-700 select-none">Delete</div>
                  <div
                    className="hover:bg-red-500 hover:text-[#fff] border-red-400 border rounded p-1 font-bold
               duration-200 text-red-500 cursor-pointer"
                    onClick={e => {
                      dispach(setSelectProject(project))
                      dispach(setListOfUsers(true))
                    }}
                  >Assign</div>
                </>
              )}
            </div>
            <div className="text-gray-600 text-sm md:text-base mt-0.5 line-clamp-2 md:line-clamp-1">
              {project.description}
            </div>
          </div>

          {InfoChips}

          {collapsible && (
            <motion.button
              onClick={() => setOpen((v) => !v)}
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-gray-600 self-start md:self-center"
              title="Expand / Collapse"
            >
              {!hidden && <CircleArrowOutDownLeft className={`${open ? "text-blue-500" : "text-gray-400"}`} />}
            </motion.button>
          )}
        </div>

      </div>

      {
        collapsible ? (
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {Content}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          Content
        )
      }
    </motion.li >
  );
}

