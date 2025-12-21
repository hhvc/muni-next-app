"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    const initial = stored || "dark";

    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    document.documentElement.setAttribute("data-bs-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);

    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.setAttribute("data-bs-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <button
      className="btn btn-sm btn-outline-secondary"
      onClick={toggleTheme}
      title="Cambiar tema"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
