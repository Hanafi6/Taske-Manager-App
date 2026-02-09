// pages/ViewProject.jsx
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ProjectCard from "../components/ProjectCard";
import { makeSelectTasksByProjectId, selectProjectById } from "../store/selectors";
import { archiveProject } from "../slices/projectsSlice";


export default function ViewProject() {
  const { id } = useParams();
  const dispach = useDispatch()
  const navigate = useNavigate()

  const { loading } = useSelector((s) => s.projects || { loading: false });
  const user = useSelector((s) => s.auth?.user);

  if (user.role !== "admin") {
    return <div className="p-6">❌ Access Denied</div>;
  }

  // memoize project selector if selectProjectById is a factory
  const selectProject = useMemo(() => {
    // selectProjectById could be factory: (id) => (state) => ...
    // if it's already a selector that expects id param, adjust accordingly.
    return typeof selectProjectById === "function" ? selectProjectById(id) : null;
  }, [id]);

  const project = useSelector((state) => (selectProject ? selectProject(state) : null));

  // memoize tasks selector factory and use it
  const selectTasks = useMemo(() => makeSelectTasksByProjectId(id), [id]);
  const tasks = useSelector((state) => selectTasks(state)) || [];

  // debug — شيلها بعد التأكد
  // console.log("ViewProject", { id, project, tasks });

  if (loading) return <div className="p-6">Loading...</div>;
  if (!project) return <div className="p-6">❌ Project not found</div>;

  const handelDelete = (proj) => {
    dispach(archiveProject(proj))
    navigate('/')
  }

  console.log(user);
  
  return (
    <div className="container mx-auto  px-6 py-8">

      <ul className="space-y-3  bg-red-600">
        <ProjectCard
          project={project}
          mineTaskes={false}
          tasksForProject={tasks}
          mode={user?.role === "admin" ? "all" : "mine"}
          currentUserId={user?.id}
          collapsible={true}
          defaultOpen={true}
          showStats
          showMeta
          clickableTitle={false}
          CreateTaskeBtn={true}
          deletePro={handelDelete}
        />
      </ul>
    </div>
  );
}
