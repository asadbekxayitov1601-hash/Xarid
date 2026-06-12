"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "light" : "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);

    // Set cookie to persist across page loads and server-side rendering
    document.cookie = `theme=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    if (next === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative overflow-hidden rounded-full flex-shrink-0 cursor-pointer select-none border border-border-primary transition-all duration-300"
      style={{ width: 64, height: 32 }}
      title={isDark ? "Kunduzgi rejim / Дневной режим" : "Tungi rejim / Ночной режим"}
      aria-label="Toggle theme"
    >
      {/* Dark sky bg */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isDark ? 1 : 0,
          background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
        }}
      >
        {[{x:12,y:8},{x:28,y:12},{x:44,y:7},{x:52,y:18},{x:20,y:22}].map((s,i) => (
          <div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-white animate-pulse"
            style={{ left: s.x, top: s.y, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>

      {/* Light sky bg */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isDark ? 0 : 1,
          background: "linear-gradient(135deg, #bae6fd, #e0f2fe)",
        }}
      >
        {/* Fluffy Cloud 1 */}
        <div className="absolute top-[6px] left-[6px] flex items-end">
          <div className="w-[10px] h-[7px] rounded-full bg-white/90" />
          <div className="w-[14px] h-[11px] rounded-full bg-white/90 -ml-[5px]" />
          <div className="w-[8px] h-[5px] rounded-full bg-white/90 -ml-[4px]" />
        </div>
        {/* Fluffy Cloud 2 */}
        <div className="absolute top-[13px] left-[18px] flex items-end opacity-75">
          <div className="w-[7px] h-[5px] rounded-full bg-white/85" />
          <div className="w-[10px] h-[8px] rounded-full bg-white/85 -ml-[3.5px]" />
          <div className="w-[6px] h-[4px] rounded-full bg-white/85 -ml-[3px]" />
        </div>
      </div>


      {/* Knob */}
      <motion.div
        animate={{ x: isDark ? 2 : 34 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="absolute top-1 w-6 h-6 rounded-full shadow-lg"
        style={{
          background: isDark
            ? "radial-gradient(circle at 40% 40%, #9ca3af, #6b7280)"
            : "radial-gradient(circle at 40% 30%, #fde68a, #f97316)",
          boxShadow: isDark
            ? "0 0 8px rgba(156,163,175,0.4)"
            : "0 0 12px rgba(251,191,36,0.6)",
        }}
      >
        {isDark && (
          <div className="absolute inset-0">
            {[{x:4,y:4,r:2},{x:12,y:8,r:1.5},{x:8,y:14,r:1}].map((c,i) => (
              <div key={i} className="absolute rounded-full"
                style={{ left:c.x, top:c.y, width:c.r*2, height:c.r*2, background:"rgba(0,0,0,0.2)" }} />
            ))}
          </div>
        )}
      </motion.div>
    </button>
  );
}
