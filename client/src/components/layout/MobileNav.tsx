import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { NAV_ITEMS, TEACHER_NAV_ITEMS } from "./nav";
import { NavIcon } from "./NavIcon";

export function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const items = user?.role === "teacher" ? TEACHER_NAV_ITEMS : NAV_ITEMS;
  return (
    <nav className="mobile-nav" aria-label="تنقل الجوال">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/" || item.to === "/teacher"}
          className={({ isActive }) =>
            isActive || (item.to === "/ask" && location.pathname.includes("/ask")) || (item.to === "/map" && location.pathname.includes("/map")) || (item.to === "/history" && location.pathname.startsWith("/history")) ? "active" : undefined
          }
          aria-current={
            location.pathname === item.to ||
            (item.to === "/ask" && location.pathname.includes("/ask")) ||
            (item.to === "/map" && location.pathname.includes("/map")) ||
            (item.to === "/history" && location.pathname.startsWith("/history"))
              ? "page"
              : undefined
          }
        >
          <NavIcon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
