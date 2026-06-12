"use client";

import { useRef, useState } from "react";

// 3D-tilt card: tilts toward the pointer on hover (desktop), inert on touch.
export function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(700px) rotateX(${py * -8}deg) rotateY(${px * 10}deg) translateY(-4px)`,
    });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setStyle({ transform: "perspective(700px)" })}
      style={{ ...style, transition: "transform 0.2s ease-out" }}
      className={className}
    >
      {children}
    </div>
  );
}
