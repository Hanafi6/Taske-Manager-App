import { AnimatePresence, motion } from "framer-motion";
import {
  Pencil,
  Trash2,
  Archive,
  Copy,
  Link2,
  RotateCcw
} from "lucide-react";
import { useEffect } from "react";

import { useAppSelector } from "../store/Hooks"

/* ================= TYPES ================= */

type ContextAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
};

/* ================= LOGIC ================= */

function getContextActions(element: any): ContextAction[] {
  if (!element) return [];

  const actions: ContextAction[] = [];

  actions.push(
    {
      key: "edit",
      label: "Edit project",
      icon: <Pencil size={16} />,
      onClick: () => console.log("edit", element),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy size={16} />,
      onClick: () => console.log("duplicate", element),
    },
    {
      key: "copy-link",
      label: "Copy link",
      icon: <Link2 size={16} />,
      onClick: () => console.log("copy link", element),
    }
  );

  /* ---------- ARCHIVE / RESTORE ---------- */

  if (element.hidden) {
    actions.push({
      key: "restore",
      label: "Restore project",
      icon: <RotateCcw size={16} />,
      dividerBefore: true,
      onClick: () => console.log("restore", element),
    });
  } else {
    actions.push({
      key: "archive",
      label: "Archive",
      icon: <Archive size={16} />,
      dividerBefore: true,
      onClick: () => console.log("archive", element),
    });
  }

  /* ---------- DELETE ---------- */

  actions.push({
    key: "delete",
    label: "Delete",
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: () => console.log("delete", element),
  });

  return actions;
}

/* ================= UI ================= */

function ContextMenu({
  top,
  left,
  actions,
}: {
  top: number;
  left: number;
  actions: ContextAction[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.85, y: -6 }}
      animate={{ opacity: 1, scaleY: 1, y: 0 }}
      exit={{ opacity: 0, scaleY: 0.8, y: -8 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 9999,
        transformOrigin: "top",
      }}
      className="
        w-56
        rounded-2xl
        bg-white
        border border-gray-200
        shadow-[0_12px_28px_rgba(0,0,0,0.12)]
        overflow-hidden
      "
    >
      {actions.map(action => (
        <div key={action.key}>
          {action.dividerBefore && <Divider />}
          <MenuItem {...action} key={action.key} />
        </div>
      ))}
    </motion.div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3
        px-4 py-2.5
        text-sm font-medium
        cursor-pointer select-none
        transition-colors duration-150
        ${danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100"
        }
      `}
    >
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 my-1" />;
}

/* ================= EXPORT ================= */

export default function GlobalContextMenu() {
  const {
    ShowContextMeneu,
    ContextMeneuDimention,
    SelectElement,
  } = useAppSelector((s: any) => s.modals);

  const actions = getContextActions(SelectElement);
  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);

  return (
    <AnimatePresence mode="sync">
      {ShowContextMeneu && ContextMeneuDimention && (
        <ContextMenu
          key={SelectElement.id}
          top={ContextMeneuDimention.top}
          left={ContextMeneuDimention.left}
          actions={actions}
        />
      )}
    </AnimatePresence>
  );
}
