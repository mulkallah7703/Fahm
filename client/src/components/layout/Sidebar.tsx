import { NavLink, useLocation } from "react-router-dom";
import type { LessonStepMeta, PageReadyMeta } from "../../hooks/useStudentMeta";
import { conceptCountLabel, modeLabel } from "../../utils/format";
import { Button } from "../common/Button";
import { NAV_ITEMS, TEACHER_NAV_ITEMS } from "./nav";
import { NavIcon } from "./NavIcon";

interface Props {
  open: boolean;
  displayName: string;
  gradeLevel?: string | null;
  preferredMode?: string | null;
  preferredModeName?: string | null;
  pageReady?: PageReadyMeta | null;
  lessonSteps?: LessonStepMeta[] | null;
  lessonStepsLabel?: string | null;
  lessonModeName?: string | null;
  changeModeHref?: string | null;
  onLogout: () => void;
  onNavigate: () => void;
  teacher?: boolean;
  classInfo?: { kicker: string; title: string; detail: string } | null;
}

export function Sidebar({
  open,
  displayName,
  gradeLevel,
  preferredMode,
  preferredModeName,
  pageReady,
  lessonSteps,
  lessonStepsLabel,
  lessonModeName,
  changeModeHref,
  onLogout,
  onNavigate,
  teacher = false,
  classInfo = null,
}: Props) {
  const location = useLocation();
  const items = teacher ? TEACHER_NAV_ITEMS : NAV_ITEMS;
  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="التنقل الرئيسي">
      <div className="brand">
        <span className="brand-en">{teacher ? "TEACHER" : "FAHM"}</span>
        <span className="brand-ar">فَهْم</span>
      </div>
      <nav>
        <ul className="nav-list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/" || item.to === "/teacher"}
                className={({ isActive }) =>
                  `nav-link${isActive || (!teacher && item.to === "/ask" && location.pathname.includes("/ask")) || (!teacher && item.to === "/map" && location.pathname.includes("/map")) || (!teacher && item.to === "/history" && location.pathname.startsWith("/history")) ? " active" : ""}`
                }
                aria-current={
                  location.pathname === item.to ||
                  (!teacher && item.to === "/ask" && location.pathname.includes("/ask")) ||
                  (!teacher && item.to === "/map" && location.pathname.includes("/map")) ||
                  (!teacher && item.to === "/history" && location.pathname.startsWith("/history"))
                    ? "page"
                    : undefined
                }
                onClick={onNavigate}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-profile">
        {lessonSteps && lessonSteps.length > 0 ? (
          <div className="page-ready" aria-label={lessonStepsLabel ?? "خطوات التعلم"}>
            <div className="kicker">{lessonStepsLabel ?? "خطوات التعلم"}</div>
            <ol className="lesson-steps">
              {lessonSteps.map((step) => (
                <li
                  key={`${step.title}-${step.status}`}
                  className={`${step.status}${step.status === "in_progress" || step.status === "needs_review" ? " current" : ""}`}
                  aria-current={step.status === "in_progress" ? "step" : undefined}
                >
                  <span aria-hidden="true">
                    {step.status === "completed" ? "✓" : step.status === "not_started" ? "○" : "●"}
                  </span>
                  <span>
                    {step.title}
                    <span className="sr-only">، {step.status}</span>
                  </span>
                </li>
              ))}
            </ol>
            {lessonModeName ? (
              <p>
                الوضع الحالي: {lessonModeName}
                {changeModeHref ? (
                  <>
                    <br />
                    <NavLink to={changeModeHref}>تغيير الوضع</NavLink>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
        {pageReady ? (
          <div className="page-ready" aria-label="سياق الصفحة الحالية">
            <div className="kicker">الصفحة الجاهزة</div>
            <strong>
              {pageReady.title}
              {pageReady.pageNumber ? ` • صفحة ${pageReady.pageNumber}` : ""}
            </strong>
            <span>
              {[
                pageReady.conceptCount !== null ? conceptCountLabel(pageReady.conceptCount) : null,
                pageReady.wordCount !== null ? `${pageReady.wordCount} كلمة` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
            </span>
          </div>
        ) : null}
        {classInfo ? (
          <div className="page-ready" aria-label={classInfo.kicker}>
            <div className="kicker">{classInfo.kicker}</div>
            <strong>{classInfo.title}</strong>
            <span>{classInfo.detail}</span>
          </div>
        ) : null}
        <div className="kicker">{teacher ? "حساب المعلم" : "ملف التعلم"}</div>
        <strong>
          {displayName}
          {gradeLevel ? ` • ${gradeLevel}` : ""}
        </strong>
        {teacher ? null : <span>الوضع المفضل: {modeLabel(preferredMode, preferredModeName)}</span>}
        <Button className="logout-btn" variant="ghost" type="button" onClick={onLogout}>
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  );
}
