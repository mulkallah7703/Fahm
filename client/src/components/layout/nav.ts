export const TEACHER_NAV_ITEMS = [
  { to: "/teacher", label: "نظرة عامة", icon: "home" },
  { to: "/teacher/students", label: "الطلاب", icon: "progress" },
  { to: "/teacher/concepts", label: "المفاهيم", icon: "map" },
  { to: "/teacher/lessons", label: "الدروس", icon: "lesson" },
  { to: "/teacher/review", label: "التقارير", icon: "ask" },
] as const;

export const NAV_ITEMS = [
  { to: "/", label: "الرئيسية", icon: "home" },
  { to: "/lesson", label: "الدرس", icon: "lesson" },
  { to: "/map", label: "خريطة المعرفة", icon: "map" },
  { to: "/ask", label: "اسأل فَهْم", icon: "ask" },
  { to: "/progress", label: "تقدمي", icon: "progress" },
  { to: "/history", label: "السجل", icon: "history" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
