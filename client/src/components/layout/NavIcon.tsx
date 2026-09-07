import type { NavIcon as NavIconName } from "./nav";

export function NavIcon({ name }: { name: NavIconName }) {
  const common = {
    className: "nav-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "lesson") {
    return (
      <svg {...common}>
        <path d="M5 5h10a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3z" />
        <path d="M5 5v14a3 3 0 0 1 3-3h13" />
      </svg>
    );
  }
  if (name === "map") {
    return (
      <svg {...common}>
        <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" />
        <path d="M9 4v14M15 6v14" />
      </svg>
    );
  }
  if (name === "ask") {
    return (
      <svg {...common}>
        <path d="M6 18v-1a7 7 0 1 1 12 0v1" />
        <path d="M9 21h6" />
      </svg>
    );
  }
  if (name === "progress") {
    return (
      <svg {...common}>
        <path d="M4 19V5M10 19V10M16 19V7M22 19H3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}
