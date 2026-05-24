import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Shield, User as UserIcon, Briefcase, CheckSquare } from "lucide-react";
import type { User } from "../types";

export interface UserCardProps {
  user: User;
  taskCount?: number;
  projectCount?: number;
  showActions?: boolean;
  onDelete?: (user: User) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const roleStyles: Record<string, { badge: string; ring: string; icon: React.ReactNode }> = {
  admin: {
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    ring: "ring-red-500/40",
    icon: <Shield size={12} />,
  },
  user: {
    badge: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    ring: "ring-sky-500/40",
    icon: <UserIcon size={12} />,
  },
};

const UserCard: React.FC<UserCardProps> = ({
  user,
  taskCount = 0,
  projectCount = 0,
  showActions = false,
  onDelete,
}) => {
  const role = (user.role || "user").toLowerCase();
  const style = roleStyles[role] ?? roleStyles.user;

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`group relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900/90 to-neutral-950 p-5 shadow-lg shadow-black/20 ring-1 ${style.ring}`}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/5 blur-2xl transition group-hover:bg-red-500/10" />

      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-2 ${style.ring} bg-neutral-950`}
        >
          {getInitials(user.name || "?")}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-white">
              {user.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${style.badge}`}
            >
              {style.icon}
              {role}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-neutral-400">
            <Mail size={14} className="shrink-0" />
            {user.email}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1">
              <Briefcase size={13} className="text-green-400" />
              {projectCount} projects
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1">
              <CheckSquare size={13} className="text-purple-400" />
              {taskCount} tasks
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex gap-2 border-t border-neutral-800 pt-4">
        <Link
          // to={`/user/${user.id}`}
          to={``}
          
          className="flex-1 rounded-xl bg-neutral-800 py-2 text-center text-sm font-medium text-neutral-200 transition hover:bg-red-600 hover:text-white"
        >
          View profile
        </Link>
        {showActions && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(user)}
            className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-400 transition hover:border-red-500/50 hover:bg-red-950/40 hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>
    </motion.article>
  );
};

export default UserCard;
