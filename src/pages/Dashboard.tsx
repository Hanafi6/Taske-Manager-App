// pages/Dashboard.tsx
import React, { useEffect, useState, useMemo, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, LogOut, RotateCcw } from "lucide-react";
import { logoutUser } from "../slices/AuthSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { hideProject, archiveProject } from "../slices/projectsSlice";
import ProjectSection from "../typs/TypsOfNavigates";
import { motion } from "framer-motion";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


type DropResult = {
  draggableId: string;
  type: string;
  source: { index: number; droppableId: string };
  destination: { index: number; droppableId: string } | null;
  reason: "DROP" | "CANCEL";
  mode: "FLUID" | "SNAP";
};



// -------------------- Dashboard --------------------
const Dashboard: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();

  const users = useSelector((s: any) => s.auth.usersList);
  const { user, logoutLoading } = useSelector((s: any) => s.auth);
  const projects = useSelector((s: any) => s.projects.list);

  // 🔹 collect all tasks from projects
  const tasks = useMemo(
    () => projects.flatMap((p: any) => p.tasks || []),
    [projects]
  );


  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  // -------------------- Scroll + Highlight --------------------
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

  // -------------------- Logout --------------------
  const handleLogout = () => {
    dispatch(logoutUser())
      .unwrap()
      .then(() => navigate("/"))
      .catch(console.error);
  };


  // -------------------- Filters --------------------
  const activeProjects = useMemo(
    () => projects.filter((p: any) => p.status === "active" && !p.hidden),
    [projects]
  );

  const hiddenProjects = useMemo(
    () => projects.filter((p: any) => p.hidden),
    [projects]
  );

  const archivedProjects = useMemo(
    () => projects.filter((p: any) => p.status === "archived"),
    [projects]
  );


  

  const taps = projects.reduce((acc: any, proj: any) => {
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
  }, { hidden: [] as any[], archived: [] as any[], completed: [] as any[], active: [] as any[] });


  // console.log(taps)
  // -------------------- Actions --------------------
  const handleToggleHidden = (project: any) => {
    dispatch(hideProject(project));
  };

  const handleRestoreProject = (project: any) => {
    dispatch(archiveProject(project)); // toggle archive
  };



 const OnDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    console.log(result)

    if (!destination) return; // لو اتلغى السحب

    // نفس المكان؟ reorder فقط
    if (source.droppableId === destination.droppableId) return;

    // هنعرف المشروع اللي اتحرك
    const project = projects.find((p: any) => p.id === draggableId);
    console.log(project)
    if (!project) return;

    // dispatch على حسب المكان الجديد
    if (destination.droppableId === "hidden") {
      dispatch(hideProject(project));
    } else if (destination.droppableId === "archived") {
      dispatch(archiveProject(project));
    } else if (destination.droppableId === "active") {
      // ممكن تعمل Restore لو كان hidden أو archived
      if (project.hidden) dispatch(hideProject(project));
      if (project.status === "archived") dispatch(archiveProject(project));
    }
  };

  // -------------------- Render --------------------
  return (
    <div className="container mx-auto p-4 ">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 ">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>{user?.name}</span>
          <button onClick={handleLogout}>
            {!logoutLoading ? <LogOut /> : <span>Logging out…</span>}
          </button>
        </div>
      </header>

      {/* Stats left 200 */}
      <div className="w-[200px] bg-red-00 absolute left-[-200px]">
        <div className="grid grid-rows-1 md:grid-rows-3 gap-6 mb-8">
          <StatCard title="Users" count={users.length} color="blue" />
          <StatCard title="Projects" count={projects.length} color="green" />
          <StatCard title="Tasks" count={tasks.length} color="purple" />
        </div>
      </div>

      {/* Projects Sections (Admin only) */}
      {user?.role === "admin" && (
        <DragDropContext onDragEnd={OnDragEnd}>
          <div className="space-y-6 select-none">
            {[
              { idS: ProjectSection.ACTIVE, title: "Active Projects", projects: taps.active },
              { idS: ProjectSection.HIDDEN, title: "Hidden Projects", projects: taps.hidden },
              { idS: ProjectSection.ARCHIVED, title: "Archived Projects", projects: taps.archived },
              { idS: ProjectSection.ARCHIVED, title: "Completed Projects", projects: taps.completed },
            ].map(({ idS, title, projects: sectionProjects }) => (
              <ProjectsSection
                key={title}
                idS={idS}
                title={title}
                projects={sectionProjects}
                onToggleHidden={handleToggleHidden}
                onRestore={handleRestoreProject}
                highlightId={highlightId}
                targetId={targetId}
              />
            ))}
          </div>
        </DragDropContext>
      )}

    </div>
  );
};



// -------------------- StatCard --------------------
const COLOR_MAP: any = {
  blue: "border-blue-500 text-blue-600",
  green: "border-green-500 text-green-600",
  purple: "border-purple-500 text-purple-600",
};

const StatCard = ({ title, count, color }: any) => (
  <div
    className={`bg-white rounded-lg shadow p-4 border-l-4 ${COLOR_MAP[color]}`}
  >
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-3xl font-bold">{count}</p>
  </div>
);

// -------------------- ProjectsSection --------------------
const ProjectsSection = ({
  idS,
  title,
  projects,
  onToggleHidden,
  onRestore,
  highlightId,
  targetId,
}: any) => (
  <Droppable droppableId={idS}>
    {(provided,snaShot) => (
      <motion.div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={`rounded-lg shadow p-4 ${snaShot.isDraggingOver ? "border-dashed":''}`}
        animate={{
          backgroundColor: highlightId === idS ? "#fef3c7" : "#ffffff",
          border:
            highlightId === idS
              ? "2px solid #f59e0b"
              : "2px solid transparent",
        }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-semibold mb-4">
          {title} ({projects.length})
        </h2>

        <ul className="space-y-3">
          {projects.map((project: any, index: number) => (
            <Draggable
              key={project.id}
              draggableId={project.id}
              index={index}
            >
              {(provided) => (
                <li
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`flex justify-between items-center p-3 border rounded
                    ${project.id === targetId ? "bg-yellow-100 border-yellow-400" : ""}
                    ${project.hidden ? "bg-gray-100 opacity-80" : "hover:bg-gray-50"}
                  `}
                >
                  <div>
                    <div className="font-semibold">{project.name}</div>
                    <div className="text-sm text-gray-600 line-clamp-1">
                      {project.description}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {project.hidden ? (
                      <button
                        className="px-2 py-1 bg-green-500 text-white rounded"
                        onClick={() => onToggleHidden(project)}
                      >
                        <Eye size={18} />
                      </button>
                    ) : (
                      <button
                        className="px-2 py-1 bg-red-500 text-white rounded"
                        onClick={() => onToggleHidden(project)}
                      >
                        <EyeOff size={18} />
                      </button>
                    )}

                    {project.status === "archived" && (
                      <button
                        className="px-2 py-1 bg-blue-500 text-white rounded"
                        onClick={() => onRestore(project)}
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </div>
                </li>
              )}
            </Draggable>
          ))}
          {provided.placeholder} {/* مهم جدا */}
        </ul>
      </motion.div>
    )}
  </Droppable>
);

export default Dashboard;
