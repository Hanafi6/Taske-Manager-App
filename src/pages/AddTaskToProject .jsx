// src/components/AddTaskToProject.jsx
import React, { useEffect, useState } from "react";
import { addTask, setSelectProject } from "../slices/projectsSlice";
import { selectProjects, selectUsers } from "../store/selectors";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../store/Hooks";

const AddTaskToProject = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectProjects);
  const selectProject = useAppSelector((state) => state.projects.selectProject);
  const users = useAppSelector(selectUsers);

  const { user } = useAppSelector((state) => state.auth);
  
  const [warning, setWarning] = useState("");
  const [IsWarning, setIsWarning] = useState(false);
  const [members, setMembers] = useState([]);

  const [form, setForm] = useState({
    projectId: "",
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    startAt: "",
    dueDate: "",
    estimateHours: "",
    requirements: "",
    acceptanceCriteria: "",
    labels: "",
  });

  // Show warning for 3 seconds
  useEffect(() => {
    if (warning) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsWarning(true);
      const timer = setTimeout(() => {
        setIsWarning(false);
        setWarning("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  // Set project from params
  useEffect(() => {
    if (projectId) {
      setForm((prev) => ({ ...prev, projectId }));
      const proj = projects.find((p) => p.id == projectId);
      if (proj) dispatch(setSelectProject(proj));
    }
  }, [projectId, projects, dispatch]);

  // Set members when project changes
  useEffect(() => {
    if (selectProject ) {
      const memberIds = selectProject.members || users.filter(e => e.id);
      setMembers(users.filter((u) => memberIds.includes(u.id)));
    } else {
      setMembers([]);
    }
  }, [selectProject, users]);


  // Auto calculate estimateHours
  useEffect(() => {
    if (form.startAt && form.dueDate) {
      const start = new Date(form.startAt);
      const end = new Date(form.dueDate);
      if (end > start) {
        const hours = Math.round((end - start) / (1000 * 60 * 60));
        setForm((prev) => ({ ...prev, estimateHours: hours }));
      } else {
        setForm((prev) => ({ ...prev, estimateHours: "" }));
        setWarning("Due date must be after start date!");
      }
    }
  }, [form.startAt, form.dueDate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validation
    if (!form.projectId) return setWarning("Please select a project.");
    if (!form.title.trim()) return setWarning("Task title is required.");
    if (form.startAt && form.dueDate && new Date(form.dueDate) <= new Date(form.startAt))
      return setWarning("Due date must be after start date!");

    // Prepare task
    const newTask = {
      id: Date.now().toString(),
      title: form.title,
      description: form.description,
      status: "active",
      priority: form.priority,
      assignedTo: form.assignedTo, // يمكن يكون null
      createdBy: user.id,
      requirements: form.requirements
        ? form.requirements.split(",").map((s) => s.trim())
        : [],
      acceptanceCriteria: form.acceptanceCriteria
        ? form.acceptanceCriteria.split(",").map((s) => s.trim())
        : [],
      labels: form.labels ? form.labels.split(",").map((s) => s.trim()) : [],
      blockerNote: null,
      startAt: form.startAt || null,
      dueDate: form.dueDate || null,
      estimateHours: Number(form.estimateHours) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await dispatch(
        addTask({ projectId: form.projectId, task: newTask, createdBy: user.id })
      ).unwrap();
      navigate(`/tasks/${res.task.id}`);
    } catch (err) {
      setWarning(err.message || "Failed to add task.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-3xl mx-auto mt-10 space-y-6"
    >
      {/* Warning */}
      <AnimatePresence>
        {IsWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="bg-yellow-500 text-white text-lg font-bold p-3 rounded-lg shadow text-center"
          >
            {warning}
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-3xl font-bold text-gray-700">➕ Create New Task</h1>

      {/* Project */}
      <div>
        <label className="text-sm font-semibold text-gray-700">Project</label>
        <select
          name="projectId"
          value={form.projectId}
          onChange={(e) => {
            handleChange(e);
            dispatch(setSelectProject(projects.find((c) => c.id == e.target.value)));
          }}
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
        >
          <option value="">-- Select Project --</option>
          {projects.map((project) =>
            project.hidden ? null : (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            )
          )}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold text-gray-700">Task Title</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Task title..."
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-semibold text-gray-700">Description</label>
        <textarea
          name="description"
          rows="3"
          value={form.description}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the task..."
        />
      </div>

      {/* Assign + Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">Assign To</label>
          <select
            name="assignedTo"
            value={form.assignedTo}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Unassigned --</option>
            {members.length > 0 ? members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            )) : users.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Priority</label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">Start At</label>
          <input
            type="datetime-local"
            name="startAt"
            value={form.startAt}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Due Date</label>
          <input
            type="datetime-local"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Estimate Hours */}
      <div>
        <label className="text-sm font-semibold text-gray-700">Estimated Hours</label>
        <input
          type="number"
          name="estimateHours"
          value={form.estimateHours}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Auto-calculated from start/due dates"
        />
      </div>

      {/* Requirements / Criteria / Labels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">Requirements</label>
          <input
            type="text"
            name="requirements"
            value={form.requirements}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Comma-separated"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Acceptance Criteria</label>
          <input
            type="text"
            name="acceptanceCriteria"
            value={form.acceptanceCriteria}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Comma-separated"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Labels</label>
          <input
            type="text"
            name="labels"
            value={form.labels}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="frontend, api, marketing"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        + Create Task
      </button>
    </form>
  );
};

export default AddTaskToProject;
