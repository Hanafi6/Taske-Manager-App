// pages/User.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import TaskCard from "../components/TaskeCard";
import {
  makeSelectUserProjects,
  makeSelectCollaboratorsPerProjectForUser,
  makeSelectTasks,
} from "../store/selectors"; // عدّل المسار حسب مكانك

import { useAppSelector } from "../store/Hooks";

export default function User() {
  const { id } = useParams();
  const uid = Number(id);

  const user = useAppSelector((s) =>
    (s.auth?.usersList || []).find((u) => Number(u.id) === uid)
  );

  const selectMyProjects = React.useMemo(() => makeSelectUserProjects(uid), [uid]);
  const myProjects = useAppSelector(selectMyProjects);


  const selectCollabsPerProject = React.useMemo(
    () => makeSelectCollaboratorsPerProjectForUser(uid),
    [uid]
  );

  const collabTree = useAppSelector(selectCollabsPerProject);


  const selectMyTasks = React.useMemo(() => makeSelectTasks({ userId: uid, role: user.role }), [uid]);
  const myTasks = useAppSelector(selectMyTasks);


  if (!user) return <div className="p-6">❌ User not found</div>;

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{user.name}</h1>
          <div className="text-gray-600">{user.email}</div>
          <div className="text-gray-600 text-sm">Role: {user.role}</div>
        </div>
      </header>

      {/* Projects summary */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Projects ({myProjects.length})
        </h2>
        {myProjects.length ? (
          <ul className="space-y-2">
            {myProjects.map((p) => (
              <li key={p.id} className="text-sm">
                <Link to={`/projects/${p.id}`} className="text-sky-700 hover:underline">
                  {p.name}
                </Link>
                <span className="text-gray-500"> — {p.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-3 rounded border border-dashed text-gray-600">
            No projects yet.
          </div>
        )}
      </section>

      {/* Collaborators per project */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Collaborators in your projects</h2>

        {collabTree.length ? (
          <div className="space-y-4">
            {collabTree.map(({ project, collaborators }) => (
              <div key={project.id} className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">
                  <Link to={`/projects/${project.id}`} className="text-sky-700 hover:underline">
                    {project.name}
                  </Link>
                </div>
                {collaborators.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {collaborators.map(({ user: u, tasksCountWithYou }) => (
                      <li key={u.id}>
                        <Link
                          to={`/user/${u.id}`}
                          className="inline-flex items-center gap-2 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                          title={`${u.name} — ${tasksCountWithYou} task(s) in this project`}
                        >
                          <span>{u.name}</span>
                          <span className="text-xs text-gray-600">({tasksCountWithYou})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-sm">No collaborators.</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded border border-dashed text-gray-600">
            No collaborator data.
          </div>
        )}
      </section>

      {/* User's tasks (flat) */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Tasks ({myTasks.length})</h2>
        {myTasks.length ? (
          <ul className="space-y-2">
            {myTasks.map((t) => (
              <li key={t.id}>
                <TaskCard task={t} showAssignee={false} showProject clickable />
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-3 rounded border border-dashed text-gray-600">
            No tasks assigned.
          </div>
        )}
      </section>
    </div>
  );
}
