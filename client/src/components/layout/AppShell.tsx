import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useStudentMeta } from "../../hooks/useStudentMeta";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import "./layout.css";

export function AppShell() {
  const { user, logout } = useAuth();
  const meta = useStudentMeta();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const name = meta.displayName ?? user?.displayName ?? "طالب";
  const gradeLevel = meta.gradeLevel;
  const preferredMode = meta.preferredMode;
  const preferredModeName = meta.preferredModeName;

  const teacher = user?.role === "teacher";

  return (
    <div className="app-shell">
      {open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Sidebar
        open={open}
        displayName={name}
        gradeLevel={gradeLevel}
        preferredMode={preferredMode}
        preferredModeName={preferredModeName}
        pageReady={meta.pageReady}
        lessonSteps={meta.lessonSteps}
        lessonStepsLabel={meta.lessonStepsLabel}
        lessonModeName={meta.lessonModeName}
        changeModeHref={meta.changeModeHref}
        teacher={teacher}
        classInfo={meta.classInfo}
        onLogout={() => void logout()}
        onNavigate={() => setOpen(false)}
      />
      <div className="app-main">
        <Outlet context={{ openMenu: () => setOpen(true), path: location.pathname }} />
      </div>
      <MobileNav />
    </div>
  );
}
