"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollParallax({
  children,
  className = "",
  speed = 0.5,
  scaleEffect = false,
  fadeEffect = false,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  scaleEffect?: boolean;
  fadeEffect?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ y: 0, scale: 1, opacity: 1 });

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate depth percentage relative to the screen height
      const centerOffset = rect.top + rect.height / 2 - windowHeight / 2;
      const progress = centerOffset / windowHeight; // range generally around -1 to 1

      // Speed-controlled translation
      const yVal = centerOffset * speed * 0.12;

      // Scale effect: Shrink when scrolling past/off the top
      let scaleVal = 1;
      if (scaleEffect) {
        if (rect.top < 0) {
          scaleVal = Math.max(0.78, 1 + (rect.top / windowHeight) * 0.4);
        } else {
          // Subtle zoom-in as it approaches from bottom
          const approach = Math.max(0, rect.top - windowHeight);
          scaleVal = Math.min(1.02, 1 + (1 - approach / windowHeight) * 0.02);
        }
      }

      // Fade effect: Fade out near screen limits
      let opacityVal = 1;
      if (fadeEffect) {
        if (rect.top < 0) {
          opacityVal = Math.max(0.1, 1 + (rect.top / (windowHeight * 0.4)));
        }
      }

      setTransform({ y: yVal, scale: scaleVal, opacity: opacityVal });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Trigger initial state
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed, scaleEffect, fadeEffect]);

  return (
    <div
      ref={ref}
      className={`will-change-transform transition-all duration-300 ease-out ${className}`}
      style={{
        transform: `translate3d(0, ${transform.y}px, 0) scale(${transform.scale})`,
        opacity: transform.opacity,
      }}
    >
      {children}
    </div>
  );
}
