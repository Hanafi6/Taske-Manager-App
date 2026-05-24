// pages/Dashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  selectAllTasks,
  makeSelectALLProjectsForUser,
  makeSelectTasks,
  isTaskDone,
} from "../store/selectors";

import {
  Eye,
  EyeOff,
  LogOut,
  RotateCcw,
  FolderKanban,
  CheckSquare,
  Users,
  LayoutDashboard,
} from "lucide-react";

import { Doughnut, Bar } from "react-chartjs-2";
import type { ChartOptions, ChartEvent, ActiveElement } from "chart.js";

import "../components/charts/registerChart";
import { logout } from "../slices/AuthSlice";
import { useAppDispatch, useAppSelector } from "../store/Hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { hideProject, archiveProject, type Project, type Task } from "../slices/projectsSlice";
import { ProjectSection } from "../types/navigation";
import type {
  DropResult,
  ProjectTaps,
  StatusOfProjectsProps,
  KpiCardProps,
  ChartCardProps,
  ProjectsSectionProps,
} from "../types/dashboard";

import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DraggableProvided } from "@hello-pangea/dnd";
import type { TasksGroupedResult } from "../types/selectors";

const SECTION_SCROLL_MAP: Record<number, string> = {
  0: ProjectSection.ACTIVE as string,
  1: ProjectSection.HIDDEN as string,
  2: ProjectSection.ARCHIVED as string,
  3: ProjectSection.COMPLETED as string,
};

function buildTaps(projects: Project[]): ProjectTaps {
  return projects.reduce<ProjectTaps>(
    (acc, proj) => {
      if (proj.hidden) acc.hidden.push(proj);
      else if (proj.status === "archived") acc.archived.push(proj);
      else if (
        proj.status === "completed" ||
        proj.status === "done" ||
        proj.status === "finished"
      ) {
        acc.completed.push(proj);
      } else {
        acc.active.push(proj);
      }
      return acc;
    },
    { hidden: [], archived: [], completed: [], active: [] }
  );
}


function countMyTasksInProject(
  projectId: string | number,
  userId: string | number,
  tasks: Task[]
): number {
  return tasks.filter(
    (t) =>
      String(t.projectId) === String(projectId) &&
      String(t.assignedTo) === String(userId)
  ).length;
}

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();


  const users = useAppSelector((s) => s.users.list);
  const { user, authLoading } = useAppSelector((s) => s.auth);
  const { list, loading } = useAppSelector((s) => s.projects);
  const allTasks = useAppSelector(selectAllTasks);

  const isAdmin = user?.role === "admin";

  const selectUserProjects = useMemo(
    () => (user?.id ? makeSelectALLProjectsForUser(user.id) : () => [] as Project[]),
    [user?.id]
  );

  const selectMyTasks = useMemo(
    () =>
      user?.id && user?.role
        ? makeSelectTasks({ userId: user.id, role: user.role })
        : () => ({ list: [] as typeof allTasks, grouped: {}, statuses: [] as string[] }),
    [user?.id, user?.role]
  );

  const userProjects = useAppSelector(selectUserProjects) as Project[];
  const myTasksResult = useAppSelector(selectMyTasks) as TasksGroupedResult;

  const scopedList: Project[] = isAdmin ? list : userProjects;
  const displayTasks: Task[] = isAdmin ? allTasks : myTasksResult.list;

  const taps = useMemo(() => buildTaps(scopedList), [scopedList]);

  console.log(taps)

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightId(sectionId);
    setTimeout(() => setHighlightId(null), 1200);
  }, []);

  useEffect(() => {
    if (!location.state?.scroll) return;

    const { sec, id } = location.state.scroll;
    const element = document.getElementById(sec);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const top =
      rect.top + window.pageYOffset - window.innerHeight / 2 + rect.height / 2;

    window.scrollTo({ top, behavior: "smooth" });
    setHighlightId(sec);
    setTargetId(id);

    const t = setTimeout(() => {
      setHighlightId(null);
      setTargetId(null);
      navigate(location.pathname, { replace: true, state: {} });
    }, 800);

    return () => clearTimeout(t);
  }, [location.state, location.pathname, navigate]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const handleToggleHidden = (project: Project) => {
    dispatch(hideProject(project));
  };

  const handleRestoreProject = (project: Project) => {
    dispatch(archiveProject(project));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const project = list.find((p) => String(p.id) === draggableId);
    if (!project) return;

    if (destination.droppableId === ProjectSection.HIDDEN) {
      if (!project.hidden) dispatch(hideProject(project));
    } else if (destination.droppableId === ProjectSection.ARCHIVED) {
      if (project.status !== "archived") dispatch(archiveProject(project));
    } else if (destination.droppableId === ProjectSection.ACTIVE) {
      if (project.hidden) dispatch(hideProject(project));
      if (project.status === "archived") dispatch(archiveProject(project));
    }
  };

  const doneTasks = useMemo(
    () => displayTasks.filter(isTaskDone).length,
    [displayTasks]
  );


  const pendingTasks = displayTasks.length - doneTasks;

  const projectChartData = useMemo(
    () => ({
      labels: ["Active", "Hidden", "Archived", "Completed"],
      datasets: [
        {
          data: [
            taps.active.length,
            taps.hidden.length,
            taps.archived.length,
            taps.completed.length,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.85)",
            "rgba(245, 158, 11, 0.85)",
            "rgba(100, 116, 139, 0.85)",
            "rgba(59, 130, 246, 0.85)",
          ],
          borderColor: ["#22c55e", "#f59e0b", "#64748b", "#3b82f6"],
          borderWidth: 2,
          hoverOffset: 14,
        },
      ],
    }),
    [taps]
  );

  const taskChartData = useMemo(
    () => ({
      labels: ["Pending", "Done"],
      datasets: [
        {
          label: "Tasks",
          data: [pendingTasks, doneTasks],
          backgroundColor: ["rgba(239, 68, 68, 0.75)", "rgba(34, 197, 94, 0.75)"],
          borderColor: ["#ef4444", "#22c55e"],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    }),
    [pendingTasks, doneTasks]
  );

  const doughnutOptions: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      animation: { duration: 900, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#a3a3a3", padding: 14, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: "#171717",
          titleColor: "#fff",
          bodyColor: "#d4d4d4",
          borderColor: "#404040",
          borderWidth: 1,
          padding: 12,
        },
      },
      onHover: (_: ChartEvent, elements: ActiveElement[]) => {
        document.body.style.cursor = elements.length ? "pointer" : "default";
      },
      onClick: (_: ChartEvent, elements: ActiveElement[]) => {
        if (!elements.length) return;
        const sectionId = SECTION_SCROLL_MAP[elements[0].index];
        if (sectionId) scrollToSection(sectionId);
      },
    }),
    [scrollToSection]
  );

  const barOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#171717",
          titleColor: "#fff",
          bodyColor: "#d4d4d4",
          borderColor: "#404040",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(38, 38, 38, 0.8)" },
          ticks: { color: "#a3a3a3" },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(38, 38, 38, 0.8)" },
          ticks: { color: "#a3a3a3", stepSize: 1 },
        },
      },
    }),
    []
  );

  if (!user) return null;

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen  pr-24">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              {isAdmin ? "Overview of the whole workspace" : "Your projects & tasks"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-sm font-bold text-red-400">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs capitalize text-neutral-500">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-neutral-400 transition hover:border-red-900 hover:bg-red-950/40 hover:text-red-400"
              title="Logout"
            >
              {!authLoading ? <LogOut size={20} /> : <span className="text-xs">…</span>}
            </button>
          </div>
        </header>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPIs */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isAdmin && (
                <KpiCard
                  title="Users"
                  value={users?.length ?? 0}
                  icon={<Users className="text-blue-400" size={22} />}
                  accent="border-l-blue-500"
                />
              )}
              <KpiCard
                title={isAdmin ? "Projects" : "My Projects"}
                value={scopedList.length}
                icon={<FolderKanban className="text-green-400" size={22} />}
                accent="border-l-green-500"
              />
              <KpiCard
                title={isAdmin ? "Tasks" : "My Tasks"}
                value={displayTasks.length}
                icon={<CheckSquare className="text-purple-400" size={22} />}
                accent="border-l-purple-500"
              />
            </section>

            {/* Charts */}
            <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard
                title="Projects distribution"
                subtitle="Click a segment to jump to that section"
              >
                <Doughnut data={projectChartData} options={doughnutOptions} />
              </ChartCard>
              <ChartCard
                title={isAdmin ? "Tasks status" : "My tasks status"}
                subtitle="Pending vs completed"
              >
                <Bar data={taskChartData} options={barOptions} />
              </ChartCard>
            </section>
          </>
        )}

        {/* Projects */}
        <section id="projects-board" className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <LayoutDashboard size={18} className="text-red-500" />
            <h2 className="text-lg font-semibold text-white">
              {isAdmin ? "Projects board" : "My projects"}
            </h2>
          </div>
          <StatusOfProjects
            loading={loading}
            user={user}
            onDragEnd={onDragEnd}
            handleToggleHidden={handleToggleHidden}
            handleRestoreProject={handleRestoreProject}
            highlightId={highlightId}
            targetId={targetId}
            taps={taps}
            isAdmin={isAdmin}
            userProjects={scopedList}
            allTasks={allTasks}
            userId={user.id}
          />
        </section>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// KPI & Chart cards
// ---------------------------------------------------------------------------

const KpiCard = ({
  title,
  value,
  icon,
  accent,
}: KpiCardProps) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className={`rounded-2xl border border-neutral-800 border-l-4 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 shadow-lg shadow-black/30 ${accent}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-neutral-500">{title}</p>
        <motion.p
          key={value}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1 text-3xl font-bold text-white"
        >
          {value}
        </motion.p>
      </div>
      <div className="rounded-xl bg-neutral-800/80 p-2.5">{icon}</div>
    </div>
  </motion.div>
);

const ChartCard = ({
  title,
  subtitle,
  children,
}: ChartCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg shadow-black/30"
  >
    <h3 className="text-sm font-medium text-white">{title}</h3>
    {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
    <div className="mt-4 h-[260px]">{children}</div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Projects sections
// ---------------------------------------------------------------------------

const ProjectsSection = ({
  idS,
  title,
  projects,
  onToggleHidden,
  onRestore,
  highlightId,
  targetId,
  draggable = true,
}: ProjectsSectionProps) => {
  const content = (
    <motion.div
      id={idS}
      className={`min-h-[200px] flex-1 rounded-2xl border p-4 transition-colors ${
        highlightId === idS
          ? "border-amber-500/80 bg-amber-950/20"
          : "border-neutral-800 bg-neutral-900/60"
      }`}
      animate={{
        boxShadow:
          highlightId === idS
            ? "0 0 0 1px rgba(245, 158, 11, 0.5)"
            : "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      <h2 className="mb-4 text-sm font-semibold text-neutral-300">
        {title}{" "}
        <span className="text-neutral-500">({projects.length})</span>
      </h2>
      <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {projects.length === 0 ? (
          <li className="py-8 text-center text-sm text-neutral-600">No projects</li>
        ) : (
          projects.map((project, index) =>
            draggable ? (
              <Draggable key={project.id} draggableId={String(project.id)} index={index}>
                {(provided) => (
                  <ProjectRow
                    project={project}
                    targetId={targetId}
                    onToggleHidden={onToggleHidden}
                    onRestore={onRestore}
                    provided={provided}
                  />
                )}
              </Draggable>
            ) : (
              <ProjectRow
                key={project.id}
                project={project}
                targetId={targetId}
                onToggleHidden={onToggleHidden}
                onRestore={onRestore}
              />
            )
          )
        )}
      </ul>
    </motion.div>
  );

  if (!draggable) return content;

  return (
    <Droppable droppableId={idS}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex-1 ${snapshot.isDraggingOver ? "ring-2 ring-dashed ring-red-500/40 rounded-2xl" : ""}`}
        >
          {content}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const ProjectRow = ({
  project,
  targetId,
  onToggleHidden,
  onRestore,
  provided,
}: {
  project: Project;
  targetId: string | null;
  onToggleHidden: (p: Project) => void;
  onRestore: (p: Project) => void;
  provided?: DraggableProvided;
}) => (
  <li
    ref={provided?.innerRef}
    {...(provided?.draggableProps ?? {})}
    {...(provided?.dragHandleProps ?? {})}
    className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition ${
      String(project.id) === targetId
        ? "border-amber-500/60 bg-amber-950/30"
        : "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700"
    } ${project.hidden ? "opacity-70" : ""}`}
  >
    <div className="min-w-0 flex-1">
      <div className="truncate font-medium text-neutral-200">{project.name}</div>
      <div className="truncate text-xs text-neutral-500 line-clamp-1">
        {project.description || "—"}
      </div>
    </div>
    <div className="flex shrink-0 gap-1.5">
      {project.hidden ? (
        <button
          type="button"
          className="rounded-lg bg-green-600/90 p-1.5 text-white hover:bg-green-500"
          onClick={() => onToggleHidden(project)}
        >
          <Eye size={16} />
        </button>
      ) : (
        <button
          type="button"
          className="rounded-lg bg-neutral-700 p-1.5 text-neutral-200 hover:bg-red-600/90 hover:text-white"
          onClick={() => onToggleHidden(project)}
        >
          <EyeOff size={16} />
        </button>
      )}
      {project.status === "archived" && (
        <button
          type="button"
          className="rounded-lg bg-blue-600/90 p-1.5 text-white hover:bg-blue-500"
          onClick={() => onRestore(project)}
        >
          <RotateCcw size={16} />
        </button>
      )}
    </div>
  </li>
);

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-24 rounded-2xl bg-neutral-900 border border-neutral-800" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="h-72 rounded-2xl bg-neutral-900 border border-neutral-800" />
      <div className="h-72 rounded-2xl bg-neutral-900 border border-neutral-800" />
    </div>
  </div>
);

const SectionSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    {[1, 2, 3, 4].map((n) => (
      <div
        key={n}
        className="h-48 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-3"
      >
        <div className="h-4 w-32 rounded bg-neutral-800" />
        <div className="h-16 rounded bg-neutral-800" />
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Status board (admin drag + user list)
// ---------------------------------------------------------------------------

const StatusOfProjects = ({
  onDragEnd,
  handleToggleHidden,
  handleRestoreProject,
  highlightId,
  targetId,
  taps,
  loading,
  isAdmin,
  userProjects,
  allTasks,
  userId,
}: StatusOfProjectsProps) => {
  if (loading) {
    return <SectionSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {userProjects.length === 0 ? (
          <p className="col-span-full py-12 text-center text-neutral-500">
            You are not assigned to any projects yet.
          </p>
        ) : (
          userProjects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
            >
              <h3 className="font-semibold text-white">{project.name}</h3>
              <p className="mt-1 text-xs text-neutral-500 capitalize">
                {project.status}
                {project.hidden ? " · hidden" : ""}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                {countMyTasksInProject(project.id, userId, allTasks)} my tasks
              </p>
            </motion.div>
          ))
        )}
      </div>
    );
  }

  const sections = [
    { idS: ProjectSection.ACTIVE as string, title: "Active", projects: taps.active },
    { idS: ProjectSection.HIDDEN as string, title: "Hidden", projects: taps.hidden },
    { idS: ProjectSection.ARCHIVED as string, title: "Archived", projects: taps.archived },
    {
      idS: ProjectSection.COMPLETED as string,
      title: "Completed",
      projects: taps.completed,
      draggable: false,
    },
  ];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-4 select-none md:grid-cols-2 xl:grid-cols-4">
        {sections.map(({ idS, title, projects, draggable = true }) => (
          <ProjectsSection
            key={idS}
            idS={idS}
            title={title}
            projects={projects}
            onToggleHidden={handleToggleHidden}
            onRestore={handleRestoreProject}
            highlightId={highlightId}
            targetId={targetId}
            draggable={draggable}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default Dashboard;
