// src/App.jsx
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useAppDispatch } from "./store/Hooks";
import { useAppSelector } from "./store/Hooks"

// pages / components
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import ProjectsPage from "./pages/ProjectsPage";
import TasksPage from "./pages/TasksPage";
import Home from "./pages/Home.jsx";
import Regester from "./pages/Regester";
import LogIn from "./pages/LogIn";
import ProtectedRoute from "./components/ProtectedPath.jsx";
import ViewProject from "./components/ViewProject.jsx";
import ViweerSingelTaske from "./pages/ViweerSingelTaske.jsx";
import UserPage from "./pages/User.jsx";
import PageSlide from "./components/PageSlide.jsx";
import PageFade from "./components/PageFade.jsx";
import AnimatedSelect from "./components/AnimatedSelect";
import CreaateProject from "./pages/CreaateProject.jsx";
import AddTaskToProject from "./pages/AddTaskToProject .jsx";
import Notifications from "./pages/Notifications.jsx";

// slices / thunks
import { fetchUsers } from "./slices/usersSlice";
import { fetchNotifications } from "./slices/notificationsSlice";
import { setListOfUsers, setOpenDiitailsDelete } from "./slices/Modals";
import {
  archiveProject,
  fetchProjects,
  hideProject,
  deletePermanentlyProject,
  AddUserToProject,
} from "./slices/projectsSlice";
import type { User } from "./types";
import type { Project } from "./slices/projectsSlice";

const ListOfUser = ({ user }: { user: User | null }) => {
  const users = useAppSelector((s) => s.auth.usersList ?? s.users.list);
  const dispatch = useAppDispatch();
  const selectProject = useAppSelector(s => s.projects.selectProject) || null;

  const CoiseUser = (picked: User) => {
    if (!selectProject) return;
    dispatch(AddUserToProject({ projectId: selectProject.id, userId: picked.id }));
    dispatch(setListOfUsers(false))
  }

  return (
    <motion.div
      className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-white rounded-lg shadow-2xl p-6 w-100 max-w-2xl max-h-96 overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Users List</h2>
        <button onClick={() => dispatch(setListOfUsers(false))} className="text-sm  text-white px-3 py-1 rounded hover:bg-red-600 transition">Close</button>
        <div className="space-y-2 mt-4  flex items-center justify-center flex-col  w-full">
          {users && users.length > 0 ? (
            users.filter(e => e.role == 'user' && e.id != user.id).map(user => (
              <div key={user.id} className="p-3 border  border-gray-200 rounded-lg  hover:bg-black transition">
                <h4 onClick={e => CoiseUser(user)} className="font-semibold text-center cursor-pointer hover:text-[#fff]  text-gray-900">{user.name}</h4>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No users available</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const DitailsOfDelete = ({
  project,
  list,
  onClose,
}: {
  project: Project | null;
  list: {
    hide: (p: Project) => void;
    delete: (p: Project) => void;
    archive: (p: Project) => void;
  };
  onClose: () => void;
}) => {
  // const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    document.addEventListener('contextmenu', e => {
      e.preventDefault();
      console.log(e)
    });
    console.log('mounted');
    return () => {
      document.removeEventListener('contextmenu', e => e.preventDefault());
    };
  }, []);
  return (
    <motion.div
      className="fixed inset-0 bg-[#757373] bg-opacity-40 flex items-center justify-center z-50"
      key='overLay'
      // Animation for the overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}

      transition={{ type: "spring", duration: 100, stiffness: 1000, damping: 25 }}
    >
      {/* المربع */}
      <motion.div
        className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md"

        // Animation for the modal box
        initial={{ opacity: 0, scale: 0, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0, y: -20 }}

        transition={{ type: "spring", duration: 100, stiffness: 600, damping: 25 }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
        >
          X
        </button>
        <h4 className="text-red-700 font-bold text-lg mb-3">
          Make your decision by choosing an option ?
        </h4>

        <p className="text-gray-700 mb-6">
          This action cannot be undone.
        </p>

        <div className="flex justify-end rounded p-1">
          <div className="w-56">
            <AnimatedSelect
              placeholder="--Choose--"
              options={[
                { value: "", label: "--Choose--", },
                { value: "hide", label: "Hide", func: (project) => list.hide(project) },
                { value: "delete", label: "Delete", func: (project) => list.delete(project) },
                { value: "archive", label: "Archive", func: (project) => list.archive(project) },
                { value: "stop", label: "Stop support", func: (project) => console.log(project) },
              ]}
              onChange={(opt) => {
                if (!opt || !opt.value) return;
                opt.func(project);

                navigate('/')

                // close the dialog for any selection
                onClose();
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};


export default function App() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const Project = useAppSelector((s) => s.projects.selectProject);
  // const Tasks = useAppSelector(s => s.projects)
  const ListOfUsers = useAppSelector(s => s.modals.ListOfUsers);
  const user = useAppSelector(s => s.auth.user);



  const navigate = useNavigate();
  const OpenDatilsDeleteProject = useAppSelector((s) => s.modals.OpenDatilsDeleteProject);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchNotifications());
    dispatch(fetchUsers());
  }, [dispatch]);

  return (
    <div className="min-h-screen ">
      <AnimatePresence mode="sync">
        {OpenDatilsDeleteProject && (
          <DitailsOfDelete project={Project} onClose={() => dispatch(setOpenDiitailsDelete(false))} list={{
            hide: (proj) => dispatch(hideProject(proj)),

            delete: (proj) => dispatch(deletePermanentlyProject(proj)),
            archive: (proj) => dispatch(archiveProject(proj)),
          }} onDelete={(proj:Project) => {
            dispatch(archiveProject(proj))
            navigate('/')
          }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ListOfUsers && <ListOfUser user={user} />}
      </AnimatePresence>


      <main className="container mx-auto my-15 px-4 py-6">

        {/* مثال: لو عايز Loader عام */}
        {/* {appLoading && (
          <div className="mb-4 text-center">
            <span>Loading data…</span>
          </div>
        )} */}

        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><Home /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><Notifications /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide>
                    <Dashboard />
                  </PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><UsersPage /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  {/* ProjectsPage لازم يتعامل مع البيانات عبر RTK Query أو يستلم props */}
                  <PageSlide>
                    <ProjectsPage />
                  </PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><ViewProject /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tasks"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><TasksPage /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tasks/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><ViweerSingelTaske /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/add-taske-to-project/:projectId?"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PageSlide><AddTaskToProject /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/user/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "user"]}>
                  <PageSlide><UserPage /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-project"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PageSlide><CreaateProject /></PageSlide>
                </ProtectedRoute>
              }
            />

            <Route path="/regester" element={<PageFade><Regester /></PageFade>} />
            <Route path="/log_in" element={<PageFade><LogIn /></PageFade>} />

            <Route path="*" element={<PageFade><div>404 Not Found</div></PageFade>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

