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
    const rx = py * -14;
    const ry = px * 16;
    setStyle({
      transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) translateZ(15px)`,
      boxShadow: `${-px * 20}px ${-py * 20 + 20}px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(89, 199, 73, 0.1)`,
    });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setStyle({ transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) translateZ(0px)" })}
      style={{ ...style, transition: "transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)", transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </div>
  );
}
