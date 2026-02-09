// components/ProjectsAccordionUnified.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProjectCard from "./ProjectCard"; // ✅ بدل TaskeCard/TaskCard
import { makeSelectTasksByProjectId, selectProjectById } from "../store/selectors";
import { AnimatePresence, motion } from "framer-motion";
import { setListOfUsers, setOpenDiitailsDelete, setContextMeneuDimention, setShowContextMeneu, setSelectElement } from "../slices/Modals";
import GlobalContextMenu from "./ContextMenesu";





const SloutOut = ({ projects }) => {
  const link = 'bg-[#555] hover:bg-[#38159f] duration-200 cursor-pointer p-1 rounded text-[#fff] font-bold active:text-red-100 select-none'

  const [activeTab, setActiveTab] = React.useState("all");


  // const ShowSingleProject = ({ project }) => {
  //   return (

  //   )
  // }

  const ProjectMailyShow = ({ key, projects }) => {
    return (
      <motion.div
        key={key}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 2000, damping: 20 }}
        className=" p-2 scroll-smooth overflow-auto flex   flex-col items-center justify-start h-150 w-full  max-h-100"
      >

        {projects.length === 0 ?
          <div className="text-center text-gray-600">No Projects Available</div>
          :
          projects.map((project) => (
            <div key={project.id} className="border-b 
          border-gray-300
            w-full h-100 py-2 flex justify-center flex-col">
              <div className="m-2 p-2 border border-gray-300 rounded bg-white shadow-md ">
                <ProjectCard
                  mineTaskes={false} // فيه نركه هنا خد باللك
                  tasksForProject={[]}
                  project={project}
                  mode={"all"}
                  currentUserId={null}
                  collapsible={true}
                  defaultOpen={false}
                  showStats={false}
                  showMeta
                  // hidden={project.hidden ? true : false}
                  clickableTitle={false}
                />
              </div>
            </div>
          ))
        }

      </motion.div>
    )
  }

  const content = {
    "sout-out": <motion.div
      key="sout-out"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 2000, damping: 20 }}
      className="w-[300px] p-2 bg-[#d4d4d4] h-50 flex items-center justify-center">
      <div className="bg-orange-300 p-1 rounded cursor-pointer hover:bg-orange-500 duration-200">Get Skout Out...</div>
    </motion.div>,
    all: <ProjectMailyShow key='all' projects={projects} />
  }
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  }

  return (
    <div className="w-full h-200 p-5 rounded bg-[#b1deec] flex flex-col">
      <div id="nav" className="w-full  bg-[#38159f] flex justify-around rounded my-3">
        <span id="sout-out" className={`${link} ${activeTab === "sout-out" && "bg-[#5dccff]"}`} onClick={() => handleTabClick("sout-out")}>Sout Out</span>
        <span id="all" className={`${link} ${activeTab === "all" && "bg-[#5dccff]"}`} onClick={() => handleTabClick("all")}>All Projects</span>
      </div>
      <div className="w-full h-full flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {content[activeTab]}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function ProjectsAccordionUnified({ mode = "auto" }) {
  const { list: projects = [], projectsLoading: loading } =
    useSelector((s) => s.projects || { list: [], projectsLoading: false });
  // const [OpenDatilsDelete, setOpenDiitailsDelete] = React.useState(false);


  const dispach = useDispatch();

  const { ContextMeneuDimention, ShowContextMeneu, SelectElement } = useSelector((s) => s.modals || {});


  const user = useSelector((s) => s.auth?.user);
  const uid = Number(user?.id);
  const role = user?.role || "user";

  // حسم المود تلقائيًا حسب الدور
  const resolvedMode = mode === "auto" ? (role === "admin" ? "all" : "mine") : mode;

  // const project = useSelector(selectProjectById(id));

  // const tasks = useSelector((s) => makeSelectTasksByProjectId(id)(s));

  // فلترة المشاريع لو mode = mine
  const filteredProjects =
    resolvedMode === "all"
      ? projects
      : projects.filter((p) => p.leaderId == Number(uid) || p.members?.includes(`${uid}`));




function Context(e, project) {
  e.preventDefault();

  const isSelected =
    SelectElement?.id === project?.id;

  // نفس المشروع → اقفل
  if (isSelected) {
    dispach(setShowContextMeneu(false));
    dispach(setSelectElement(null));
    return;
  }

  // مشروع جديد
  dispach(
    setContextMeneuDimention({
      top: e.clientY,
      left: e.clientX,
    })
  );

  dispach(setSelectElement(project));
  dispach(setShowContextMeneu(true));
}

  if (loading) return <Skeleton />;

  return (
    <ul className="space-y-3" >
      {filteredProjects.length > 0 ?
        filteredProjects.map((p) => (
          <ProjectCard
            mineTaskes={true} // فيه نركه هنا خد باللك
            tasksForProject={[]}
            key={p.id}
            project={p}
            mode={resolvedMode}
            currentUserId={uid}
            collapsible
            defaultOpen={false}
            showStats
            showMeta
            hidden={p.hidden ? true : false}
            clickableTitle={p?.hidden ? false : true}
            onClickContext={e => Context(e,p)}
          />
        )) : <SloutOut projects={projects} />
      }
      <GlobalContextMenu top={ContextMeneuDimention.top} left={ContextMeneuDimention.left} />
    </ul>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <li key={i} className="rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
        </li>
      ))}
    </ul>
  );
}
