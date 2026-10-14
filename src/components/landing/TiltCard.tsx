"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * 3D tilt + parallax on hover (the "tilt card" effect).
 *
 * The card leans toward the cursor (up to `max` degrees), a soft glare follows
 * the pointer, and any child marked `.tilt-pop` sits forward in Z so it drifts
 * more than the surface behind it — that difference is the parallax. On
 * leave it eases back flat.
 *
 * Off for touch-only devices (nothing to hover) and for anyone who prefers
 * reduced motion: the card then just renders flat, no listeners attached.
 * Pointer moves are batched to one style write per animation frame.
 */
export function TiltCard({
  children,
  className = "",
  max = 9,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = outer.current;
    const card = inner.current;
    if (!el || !card) return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    let frame = 0;
    let px = 0.5;
    let py = 0.5;

    const paint = () => {
      frame = 0;
      card.style.setProperty("--rx", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onEnter = () => card.classList.add("is-tilting");
    const onLeave = () => {
      card.classList.remove("is-tilting");
      px = 0.5;
      py = 0.5;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [max]);

  return (
    <div ref={outer} className={`tilt ${className}`}>
      <div ref={inner} className="tilt-inner">
        {children}
        {glare && <span aria-hidden="true" className="tilt-glare" />}
      </div>
    </div>
  );
}
