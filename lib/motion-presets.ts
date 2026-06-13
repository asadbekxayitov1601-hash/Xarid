// Shared motion presets — keep spring/easing values in one place so every
// surface feels like the same physics. Mirrors DESIGN_SYSTEM.md §5.1 easings.
import type { Transition } from "motion/react";

export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 30 };
export const springSoft: Transition = { type: "spring", stiffness: 200, damping: 26 };

// Named cubic-beziers (match the --ease-* CSS tokens).
export const easeGlide = [0.25, 0.8, 0.25, 1] as const; // --ease-glide
export const easeSpring = [0.215, 0.61, 0.355, 1] as const; // --ease-spring
export const easeSnap = [0.4, 0, 0.2, 1] as const; // --ease-snap
