// pages/Home.jsx
import React from "react";
import ProjectsAccordionUnified from "../components/ProjectsAccordion";
import { useAppSelector } from "../store/Hooks";

export default function Home() {
  const role = useAppSelector((s) => s.auth?.user?.role) || "user";

  let mode = role == 'admin' ? 'auto' : 'mine'

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold">
          {/* {role === "admin" ? "📂 All Projects" : "📂 Your Projects"} */}
        </h3>
      </div>
      <ProjectsAccordionUnified mode={mode} />
    </section>
  );
}
