// pages/Home.jsx
import React from "react";
import { useSelector } from "react-redux";
import ProjectsAccordionUnified from "../components/ProjectsAccordion";

export default function Home() {
  const role = useSelector((s) => s.auth?.user?.role) || "user";

  let mode = role == 'admin' ? 'auto':'mine'

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
