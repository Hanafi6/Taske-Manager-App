import React from "react";
import { useNavigate } from "react-router-dom";
import {
  computeTaskTimeMeta,
  formatDuration,
  GetProjectById,
  isTaskDone,
  canUserCompleteTask,
  selectUserId,
  selectUsers,
} from "../store/selectors";
import { useAppDispatch, useAppSelector } from "../store/Hooks";
import { toggleTaskComplete } from "../slices/projectsSlice";
import type { TaskCardProps } from "../types";
import type { TaskTimeMeta } from "../types/selectors";

type TaskLike = TaskCardProps["task"];

const cls = {
  ring: (t: TaskLike, overdue: boolean) => {
    if (isTaskDone(t)) return "ring-green-400";
    if (t.status === "blocked") return "ring-amber-400";
    if (overdue || t.priority === "urgent") return "ring-red-400";
    if (t.priority === "high") return "ring-orange-400";
    if (t.status === "in progress") return "ring-sky-400";
    return "ring-gray-300";
  },
  bg: (t: TaskLike, overdue: boolean) => {
    if (isTaskDone(t)) return "bg-green-50";
    if (t.status === "blocked") return "bg-amber-50";
    if (overdue || t.priority === "urgent") return "bg-red-50";
    if (t.priority === "high") return "bg-orange-50";
    if (t.status === "in progress") return "bg-sky-50";
    return "bg-gray-50";
  },
  badge: (t: TaskLike, overdue: boolean) => {
    if (isTaskDone(t)) return { text: "Done", cls: "bg-green-100 text-green-700" };
    if (t.status === "blocked") return { text: "Blocked", cls: "bg-amber-100 text-amber-700" };
    if (overdue) return { text: "Overdue", cls: "bg-red-100 text-red-700" };
    if (t.priority === "urgent") return { text: "Urgent", cls: "bg-red-100 text-red-700" };
    if (t.priority === "high") return { text: "High", cls: "bg-orange-100 text-orange-700" };
    if (t.status === "in progress") return { text: "In Progress", cls: "bg-sky-100 text-sky-700" };
    return { text: "Todo", cls: "bg-gray-100 text-gray-700" };
  },
};

export default function TaskCard({
  task,
  showAssignee = false,
  showProject = false,
  compact = false,
  clickable = true,
}: TaskCardProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const done = isTaskDone(task);
  const canComplete = canUserCompleteTask(task, currentUser?.id);

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time: TaskTimeMeta = computeTaskTimeMeta(task, now) ?? {
    start: null,
    end: null,
    msLeft: null,
    inWindow: true,
    isOverdue: false,
    isDisabled: false,
  };
  const overdue = !!time.isOverdue;
  const timeLeft = time.msLeft != null ? formatDuration(time.msLeft) : "—";

  const ring = cls.ring(task, overdue);
  const bg = cls.bg(task, overdue);
  const badge = cls.badge(task, overdue);






  // Progress bar بسيط حسب dueDate (اختياري)
  const progress = React.useMemo(() => {
    if (!task.startAt || (!task.dueDate && !task.endAt)) return null;
    const start = new Date(task.startAt).getTime();
    const end = new Date(task.endAt || task.dueDate!).getTime();
    const cur = now.getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const pct = Math.min(100, Math.max(0, ((cur - start) / (end - start)) * 100));
    return Math.round(pct);
  }, [task.startAt, task.dueDate, task.endAt, now]);

  return (
    <div
      className={`rounded border border-gray-200 ring-2 ${ring} overflow-hidden`}
      onClick={() => clickable && navigate(`/tasks/${task.id}`)}
      role={clickable ? "button" : undefined}
    >

      <div className={`p-3 ${bg}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={done}
              disabled={!task.projectId || !canComplete}
              title={
                canComplete
                  ? done
                    ? "Mark incomplete"
                    : "Mark complete"
                  : "Only the assigned user can complete this task"
              }
              onChange={(e) => {
                if (!task.projectId || !currentUser?.id || !canComplete) return;
                dispatch(
                  toggleTaskComplete({
                    projectId: task.projectId,
                    taskId: task.id,
                    completed: e.target.checked,
                    userId: currentUser.id,
                  })
                );
              }}
              onClick={(e) => e.stopPropagation()}
              className={`h-4 w-4 shrink-0 rounded border-gray-300 accent-green-600 focus:ring-green-500 ${
                canComplete ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
              aria-label={done ? "Mark task incomplete" : "Mark task complete"}
            />
            <div className={`font-medium truncate ${done ? "line-through text-gray-500" : ""}`}>
              {task.title}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${badge.cls}`}>{badge.text}</span>
        </div>
        {/* Meta row */}
        {!compact && (
          <div className="mt-1 text-sm text-gray-700 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="capitalize">Status: {task.status}</span>
            {/* <div onClick={_ => dispatch(setListOfUsers(true))
            } className="p-1 text-xs text-red-500 border rounded capitalize duration-200 cursor-pointer hover:bg-red-500 hover:text-white font-bold">assine</div>
             */}
            <span>• Priority: {task.priority || "—"}</span>
            {task.dueDate && <span>• Due: {new Date(task.dueDate).toLocaleString()}</span>}
            {/* {showAssignee && task.assignedTo != null && <span>• Assignee: { useAppSelector(s => GetTaskeById(s,task.assignedTo)).name }</span>} */}
            {showAssignee && task.assignedTo != null && (
              <span>
                • To :{" "}
                {useAppSelector((s) =>
                  selectUserId(String(task.assignedTo), selectUsers(s))
                )?.name ?? "—"}
              </span>
            )}

            {showProject && task.projectId != null && (
              <span>
                • Project :{" "}
                <span
                  onClick={(ev) => {
                    ev.stopPropagation();
                    navigate(`/project/${task.projectId}`);
                  }}
                  className="duration-200 hover:bg-red-500 cursor-pointer p-1 rounded hover:font-bold hover:text-[#fff]"
                >
                  {useAppSelector((s) =>
                    GetProjectById(s, String(task.projectId))
                  )?.name}
                </span>
              </span>
            )}
          </div>
        )}

        {/* ⏳ Countdown chip */}
        <div className="mt-2 flex items-center gap-2 text-sm">

          <span className="px-2 py-0.5 rounded bg-gray-100">
            {overdue ? "⏰ Overdue" : "⏳ Time left"}: {timeLeft}
          </span>
          {!time.inWindow && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              {task.startAt && now < new Date(task.startAt) ? "Starts soon" : "Window ended"}
            </span>
          )}
          {time.isDisabled && (
            <div className="bg-[#5e5e5e] text-white p-1 rounded font-bold">disabeld</div>
          )}
        </div>

        {/* Progress bar (اختياري) */}
        {progress != null && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-sky-500 rounded"
                style={{ width: `${progress}%`, transition: "width 1s linear" }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{progress}% elapsed</div>
          </div>
        )}
      </div>
    </div>
  );
}
