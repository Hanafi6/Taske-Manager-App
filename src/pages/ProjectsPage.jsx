// pages/ProjectsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import ProjectCard from '../components/ProjectCard';
import { makeSelectALLProjectsForUser } from '../store/selectors';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/Hooks';

const ProjectsPage = () => {
  const { list, loading } = useAppSelector((state) => state.projects);
  const { user, role } = useAppSelector((state) => state.auth);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.scroll) {
      console.log(location.state?.scroll)
      const { sec, id } = location.state.scroll;

      const element = document.getElementById(sec);
      if (element) {
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);

        window.scrollTo({ top: middle, behavior: 'smooth' });

        // Highlight
        setHighlightId(sec);
        setTarget(id); // <--- هنا بنحدد العنصر نفسه

        const timeout = setTimeout(() => {
          setHighlightId(null);
          setTarget(null);
          navigate(location.pathname, { replace: true, state: {} });
        }, 800);

        return () => clearTimeout(timeout);
      }
    }
  }, [location.state]);

  // اسم أوضح للحالة
  const [projectsToShow, setProjectsToShow] = useState([]);

  // memoize the selector factory so we don't recreate it every render
  const selectAllProjectsForUser = useMemo(
    () => makeSelectALLProjectsForUser(user?.id),
    [user?.id]
  );

  // useAppSelector with the memoized selector
  const scProj = useAppSelector((state) => selectAllProjectsForUser(state));

  // effect: اختر القائمة المناسبة بناءً على الدور
  useEffect(() => {
    if (role === 'user') {
      setProjectsToShow(scProj ?? []); // projects for this user
    } else {
      setProjectsToShow(list ?? []); // admin/other roles see full list
    }
  }, [role, scProj, list]); // جميع الاعتماديات الضرورية

  // console.log(scProj)
  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="w-full mx-auto p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Projects</h1>

      <ul className="grid grid-cols-1 gap-4">
        {projectsToShow.map((project) => (
          <ProjectCard key={project.id}
            project={project}
            tasksForProject={[]}
            mode={role === "admin" ? "all" : "mine"}
            currentUserId={user.id}
            collapsible={true}
            defaultOpen={false}
            showStats
            showMeta={true}
            mineTaskes={true}
            clickableTitle={project.hidden ? false : true}
            hidden={project.hidden}
          />
        ))}
      </ul>
    </div>
  );
};

export default ProjectsPage;
