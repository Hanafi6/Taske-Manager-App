import React, { useEffect, useMemo, useState } from "react";
import TaskCard from "../components/TaskeCard";
import { makeSelectTasks } from "../store/selectors";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "../store/Hooks";
import type { TaskWithMeta } from "../types/selectors";

const TasksPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const role = user?.role;

  const selectTasks = useMemo(
    () => makeSelectTasks({ userId: user?.id, role }),
    [user?.id, role]
  );

  const { grouped, statuses } = useAppSelector(selectTasks);

  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (statuses.length > 0 && !activeTab) {
      setActiveTab(statuses[0]);
    }
  }, [statuses, activeTab]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Tasks Overview</h1>

      <div className="flex space-x-6 border-b border-gray-300 mb-6 relative">
        {statuses.length > 0 ? (
          statuses.map((status: string) => (
            <div
              key={status}
              className="cursor-pointer pb-2 relative"
              onClick={() => setActiveTab(status)}
            >
              <span
                className={`capitalize ${activeTab === status ? "font-semibold" : "font-normal"}`}
              >
                {status.replace("_", " ")}
              </span>
              {activeTab === status && (
                <motion.div
                  layoutId="underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded"
                />
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-400 italic">No statuses available</p>
        )}
      </div>

      {statuses.length > 0 ? (
        <AnimatePresence mode="wait">
          {statuses.map((status: string) =>
            status === activeTab ? (
              <motion.section
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {grouped[status] && grouped[status].length > 0 ? (
                  <div className="space-y-3">
                    {grouped[status].map((task: TaskWithMeta) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        compact={false}
                        showAssignee={role === "admin"}
                        showProject={true}
                        clickable
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No tasks in this section.
                  </p>
                )}
              </motion.section>
            ) : null
          )}
        </AnimatePresence>
      ) : (
        <p className="text-gray-500 italic text-center mt-8">
          No tasks available
        </p>
      )}
    </div>
  );
};

export default TasksPage;
