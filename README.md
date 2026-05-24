# 🚀 Task Manager Platform

### _Enterprise-Grade Project & Team Management System_

A professional, internal SPA (Single Page Application) platform designed to streamline project management, task assignment, and team collaboration between administrators and team members. Features include comprehensive workload tracking, real-time analytics, and role-based access control.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 19, Vite, Tailwind CSS v4, TypeScript.
- **State Management:** Redux Toolkit (Thunks for Async Operations + RTK Listeners for side effects like real-time notifications).
- **Performance Optimization:** Highly optimized using Memoized Selectors (`createSelector`) for efficient state querying and real-time analytics.
- **UI/UX & Interactivity:** Framer Motion (Fluid animations), Lucide Icons, `@hello-pangea/dnd` (Drag & Drop Kanban board).
- **Data Visualization:** Chart.js with `react-chartjs-2`.
- **Routing & API:** React Router v7, RESTful API architecture integrated with a local JSON Server backend (`db.json`).

---

## 🌟 Key Features Implemented

### 🛡️ Authentication & Role-Based Access Control (RBAC)

- Fully secure User Registration and Login with session persistence via `localStorage`.
- **Protected Routes:** Strict multi-role routing system (Admin vs. Member).
- **Dynamic Data Views:** Admins have absolute visibility over all teams and projects, while Members get a customized view filtering only their assigned workspace.

### 👥 Advanced Team & User Management

- Complete team directory with real-time text-search and dynamic filtering (Admin / Member).
- Executive Admin statistics panel displaying absolute numbers of users, admins, and members.
- Dynamic metric cards showing individual workloads (active tasks count, total projects) with one-click navigation to user profiles.

### 📊 Interactive Business Dashboard & Analytics

- Executive KPIs tracking system-wide projects, active tasks, and team counts.
- Interactive data visualization using Chart.js to map project distributions and task statuses.
- Fully functional Kanban Board utilizing Drag & Drop for rapid task status transitions.

### 📁 Scalable Project & Task Infrastructure

- Complete CRUD operations handled efficiently via Async Redux Thunks.
- **Robust Data Modeling:** Tasks are structured securely under `state.projects.tasks` and dynamically referenced to parent projects via `projectId`.
- Multi-state project lifecycle management (**Active**, **Hidden**, **Archived**, **Completed**).
- Advanced task cards featuring live timers, priority tags, and status markers (_Overdue_, _Blocked_, _Done_).

---

## 🚀 Getting Started

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Hanafi6/Taske-Manager-App.git](https://github.com/Hanafi6/Taske-Manager-App.git)
   cd Taske-Manager-App
   ```

📁 Project Structure

src/
├── api/ # REST API fetch configurations
├── components/ # Reusable UI Components (Sidebar, NavBar, etc.)
├── store/ # Redux Toolkit Slices & selectors.ts
├── pages/ # Page layouts (Dashboard, Projects, Tasks, Auth)
├── App.tsx # Main application component & routes
└── main.tsx # Application entry point & providers

📝 License

This project is open-source and available under the MIT License.
