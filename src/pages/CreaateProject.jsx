// pages/CreateProject.jsx
import React, { useEffect, useMemo, useState } from "react";
// import { addSingleProject } from "../slices/projectsSlice";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { addProject } from "../slices/projectsSlice";
import { useAppDispatch, useAppSelector } from "../store/Hooks";

// دوال لتحويل التاريخ ISO
function toIsoEndOfDay(dateStr) {
  if (!dateStr) return null;
  const dt = new Date(dateStr + "T23:59:59");
  return dt.toISOString();
}
function toIsoStart(dateStr) {
  if (!dateStr) return null;
  const dt = new Date(dateStr + "T09:00:00");
  return dt.toISOString();
}

export default function CreateProject() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const authUser = useAppSelector((s) => s.auth?.user);
  const creatorId = Number(authUser?.id);
  const { usersList: users = [], usersLoading, usersError } = useAppSelector(
    (s) => s.auth || {}
  );

  // RTK Query mutation (rename to avoid confusion with slice action)
  // const [createProjectMutation, { isLoading: saving }] = useAddProjectMutation();

  const [form, setForm] = useState({
    name: "",
    description: "",
    leaderId: authUser?.id ?? "",
    members: [],
    status: "active", // active | block | completed
    startAt: "",
    dueAt: "",
  });

  const { loading: saving } = useAppSelector(s => s.projects);

  // addProject
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState({}); // validation errors
  const [warnning, setWarnning] = useState(null);



  const filteredUsers = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(q));
  }, [users, query]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleMembersChange = (e) => {
    const picked = Array.from(e.target.selectedOptions, (o) => Number(o.value));
    setForm((f) => ({ ...f, members: picked }));
  };

  const ensureLeaderInMembers = (members, leaderId) => {
    const set = new Set((members || []).map(Number));
    if (leaderId) set.add(Number(leaderId));
    return Array.from(set);
  };

  const validate = () => {
    const next = {};
    if (!form.name || !form.name.trim()) next.name = "Project name is required.";

    if (form.startAt && form.dueAt) {
      const s = new Date(form.startAt);
      const d = new Date(form.dueAt);
      if (s > d) next.dates = "Start date must be before the due date.";
    }
    return next;
  };

  const [hasLeaderWarning, setHasLeaderWarning] = useState(false);
  useEffect(() => {
    setHasLeaderWarning(!form.leaderId || String(form.leaderId) === String(authUser?.id));
  }, [form.leaderId, authUser?.id]);

  // helper: broadcast update to other tabs (BroadcastChannel + localStorage fallback)
  const broadcastProjectsUpdated = (project) => {
    try {
      // BroadcastChannel (modern)
      const bc = new BroadcastChannel("projects_channel");
      bc.postMessage({ type: "projects_updated", project });
      bc.close();
    } catch (e) {
      // ignore if not supported
    }

    try {
      // localStorage event (fires "storage" in other tabs)
      localStorage.setItem("projects_updated_at", String(Date.now()));
      // also stash the project briefly if you want other tabs to read it
      localStorage.setItem("projects_last_added", JSON.stringify(project));
      // cleanup after short while
      setTimeout(() => {
        localStorage.removeItem("projects_last_added");
      }, 2000);
    } catch (e) {
      // ignore
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarnning(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const nowIso = new Date().toISOString();
    const members = ensureLeaderInMembers(form.members, form.leaderId);

    const startAtIso =
      form.startAt && form.startAt.length <= 10 ? toIsoStart(form.startAt) : form.startAt || null;
    const dueAtIso =
      form.dueAt && form.dueAt.length <= 10 ? toIsoEndOfDay(form.dueAt) : form.dueAt || null;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      leaderId: form.leaderId ? Number(form.leaderId) : null,
      members,
      status: form.status,
      startAt: startAtIso,
      dueAt: dueAtIso,
      createdAt: nowIso,
      createdBy: creatorId || null,
      tasks: [],
    };

    try {
      // call RTK Query mutation
      const newProject = await dispatch(addProject(payload)).unwrap();

      // update the old slice so selectors still work (bridge)
      // dispatch(addSingleProject(newProject));

      // broadcast update to other tabs so they can refetch
      broadcastProjectsUpdated(newProject);

      // navigate to projects list
      navigate("/projects");
    } catch (err) {
      // err could be a fetchBaseQuery error object or plain Error
      const msg = err?.data?.message || err?.message || String(err) || "Failed to create project";
      setWarnning(msg);
      // optional: console.log for debugging
      console.error("create project failed:", err);
    }
  };

  return (
    <MotionConfig reducedMotion="always">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="max-w-3xl mx-auto bg-gradient-to-br from-[#14161A] to-[#1b1d23]
                   p-6 rounded-2xl shadow-lg text-white space-y-6 border border-[#2a2e36]"
      >
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 150 }}
          className="text-3xl font-bold text-blue-400"
        >
          Create New Project
        </motion.h2>

        {/* Loading/Error لليوزرز */}
        <AnimatePresence>
          {usersLoading && (
            <motion.div
              key="users-loading"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-blue-950/30 border border-blue-500 text-blue-300 p-3 rounded-md text-sm"
            >
              Loading members…
            </motion.div>
          )}
          {usersError && (
            <motion.div
              key="users-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-red-950/30 border border-red-500 text-red-300 p-3 rounded-md text-sm"
            >
              Failed to load members: {String(usersError)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning لو مفيش Leader */}
        <AnimatePresence>
          {hasLeaderWarning && (
            <motion.div
              key="leader-warning"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-amber-900/30 border border-amber-500 text-amber-300 p-3 rounded-md text-sm"
            >
              You should choose a project leader. If you want to be the leader in the original case, then continue creating.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning message from API */}
        {warnning && (
          <div className="text-sm text-red-300 bg-red-950/20 border border-red-700 rounded p-2">
            {warnning}
          </div>
        )}

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 1 },
            show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >
          {/* Name */}
          <motion.div variants={{ hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0 } }}>
            <label className="block font-medium mb-1 text-gray-300">Project Name</label>
            <motion.input
              whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
              type="text"
              name="name"
              className={`w-full bg-[#1f2127] text-white placeholder:text-gray-500 
                          border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none
                          ${errors.name ? "border-red-500" : "border-[#32353c]"}`}
              value={form.name}
              onChange={handleChange}
              placeholder="Enter project name..."
            />
            {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name}</p>}
          </motion.div>

          {/* Description */}
          <motion.div variants={{ hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0 } }}>
            <label className="block font-medium mb-1 text-gray-300">Description</label>
            <motion.textarea
              whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
              name="description"
              rows={3}
              className="w-full bg-[#1f2127] text-white placeholder:text-gray-500 
                         border border-[#32353c] rounded-lg px-3 py-2 focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your project..."
            />
          </motion.div>

          {/* Leader + Status */}
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3" variants={{ hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0 } }}>
            <div>
              <label className="block font-medium mb-1 text-gray-300">Leader (optional)</label>
              <select
                name="leaderId"
                className="w-full bg-[#1f2127] text-white border border-[#32353c] 
                           rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={form.leaderId}
                onChange={handleChange}
              >
                <option value="">-- No leader --</option>
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1 text-gray-300">Status</label>
              <select
                name="status"
                className="w-full bg-[#1f2127] text-white border border-[#32353c] 
                           rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="block">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </motion.div>

          {/* Dates */}
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3" variants={{ hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0 } }}>
            <div>
              <label className="block font-medium mb-1 text-gray-300">Start date (optional)</label>
              <input
                type="date"
                name="startAt"
                className="w-full bg-[#1f2127] text-white border border-[#32353c] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={form.startAt}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-300">Deadline (optional)</label>
              <input
                type="date"
                name="dueAt"
                className={`w-full bg-[#1f2127] text-white border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500
                  ${errors.dates ? "border-red-500" : "border-[#32353c]"}`}
                value={form.dueAt}
                onChange={handleChange}
              />
              {errors.dates && <p className="text-sm text-red-400 mt-1">{errors.dates}</p>}
            </div>
          </motion.div>

          {/* Members + Search */}
          <motion.div variants={{ hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0 } }}>
            <label className="block font-medium mb-1 text-gray-300">Members</label>

            <input
              type="text"
              className="w-full bg-[#1f2127] text-white placeholder:text-gray-500 
                         border border-[#32353c] rounded-lg px-3 py-2 mb-2 focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Search members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <select
              multiple
              className="w-full bg-[#1f2127] text-white border border-[#32353c] rounded-lg 
                         px-3 py-2 h-40 overflow-y-auto focus:ring-2 focus:ring-blue-500"
              value={form.members}
              onChange={handleMembersChange}
            >
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd for multi-select</p>

            <AnimatePresence>
              {form.members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <AnimatePresence>
                    {form.members.map((id) => {
                      const u = users.find((x) => Number(x.id) === Number(id));
                      return (
                        <motion.div
                          key={id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 24 }}
                          className="flex justify-between"
                        >
                          <span
                            className="text-xs flex items-center gap-2 px-2 py-1 rounded-full bg-gray-800/70 border border-gray-700"
                          >
                            <span className="text-gray-200">{u?.name || `#${id}`}</span>

                            <button
                              type="button"
                              onClick={() =>
                                setForm(prev => ({
                                  ...prev,
                                  members: prev.members.filter(m => m !== id),
                                }))
                              }
                              className="text-red-400 hover:text-white hover:bg-red-500/80 w-4 h-4 flex items-center justify-center rounded-full transition-all"
                            >
                              ×
                            </button>
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "#2563eb" }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold 
                       mt-3 transition-all duration-200 hover:shadow-lg disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Create Project"}
          </motion.button>
        </motion.form>
      </motion.div>
    </MotionConfig>
  );
}
