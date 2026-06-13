"use client";

// Thin re-export so every motion recipe gates identically on the OS pref.
// motion ships `useReducedMotion` (boolean | null). When true, recipes must
// collapse transforms to constants — never animate.
export { useReducedMotion } from "motion/react";
