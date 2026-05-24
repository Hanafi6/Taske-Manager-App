import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  User as UserIcon,
  X,
  RefreshCw,
} from "lucide-react";
import { fetchUsers, addUser, deleteUser } from "../slices/usersSlice";
import type { User } from "../types";
import UserCard from "../components/UserCard";
import { useAppSelector, useAppDispatch } from "../store/Hooks";
import { selectAllTasks, selectProjects } from "../store/selectors";
import type { Project } from "../slices/projectsSlice";

type RoleFilter = "all" | "admin" | "user";

function countProjectsForUser(userId: string | number, projects: Project[]): number {
  const id = String(userId);
  return projects.filter(
    (p) =>
      String(p.leaderId) === id ||
      (Array.isArray(p.members) && p.members.some((m) => String(m) === id))
  ).length;
}

const UsersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector((state) => state.users);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const allTasks = useAppSelector(selectAllTasks);
  const projects = useAppSelector(selectProjects);

  const isAdmin = currentUser?.role === "admin";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const taskCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of allTasks) {
      if (t.assignedTo == null) continue;
      const key = String(t.assignedTo);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [allTasks]);

  const stats = useMemo(() => {
    const admins = list.filter((u) => u.role === "admin").length;
    return {
      total: list.length,
      admins,
      members: list.length - admins,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      const matchRole =
        roleFilter === "all" ||
        (u.role || "user").toLowerCase() === roleFilter;
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [list, search, roleFilter]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(
        addUser({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          password: form.password || "changeme123",
        })
      ).unwrap();
      setForm({ name: "", email: "", password: "", role: "user" });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (target: User) => {
    if (String(target.id) === String(currentUser?.id)) return;
    if (!window.confirm(`Remove ${target.name} from the team?`)) return;
    dispatch(deleteUser(target.id));
  };

  const filters: { id: RoleFilter; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: <Users size={16} /> },
    { id: "admin", label: "Admins", icon: <Shield size={16} /> },
    { id: "user", label: "Members", icon: <UserIcon size={16} /> },
  ];

  return (
    <div className="min-h-screen text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Team directory</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Users
            </h1>
            <p className="mt-1 max-w-lg text-sm text-neutral-400">
              Browse teammates, see their workload, and open individual profiles.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch(fetchUsers())}
              className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500"
              >
                <UserPlus size={18} />
                Add user
              </button>
            )}
          </div>
        </header>

        {/* KPIs */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total people", value: stats.total, accent: "border-l-blue-500" },
            { label: "Admins", value: stats.admins, accent: "border-l-red-500" },
            { label: "Members", value: stats.members, accent: "border-l-green-500" },
          ].map(({ label, value, accent }) => (
            <motion.div
              key={label}
              whileHover={{ y: -2 }}
              className={`rounded-2xl border border-neutral-800 border-l-4 bg-neutral-900/80 p-5 ${accent}`}
            >
              <p className="text-sm text-neutral-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-white">{value}</p>
            </motion.div>
          ))}
        </section>

        {/* Search + filters */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRoleFilter(id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  roleFilter === id
                    ? "bg-red-600 text-white"
                    : "border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-48 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 py-16 text-center">
            <Users className="mx-auto mb-3 text-neutral-600" size={40} />
            <p className="text-neutral-400">No users match your search.</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <UserCard
                    user={u}
                    taskCount={taskCountByUser.get(String(u.id)) ?? 0}
                    projectCount={countProjectsForUser(u.id, projects)}
                    showActions={isAdmin}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <p className="mt-6 text-center text-xs text-neutral-600">
          Showing {filtered.length} of {list.length} users
        </p>
      </div>

      {/* Add user modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Add team member</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <label className="block">
                  <span className="text-xs text-neutral-500">Full name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Default: changeme123"
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Role</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="user">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-red-600 py-2.5 font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Create user"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
