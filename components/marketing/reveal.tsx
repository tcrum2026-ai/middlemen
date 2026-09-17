"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades a section in as it reaches the viewport.
 *
 * Deliberately not IntersectionObserver: that only fires when the intersection
 * ratio crosses a threshold, so a jump that skips an element entirely (a deep
 * link, or scrolling to the bottom in one go) leaves it stuck at opacity 0 —
 * invisible content. A position check on mount plus a rAF-throttled scroll
 * listener cannot miss that case. `<noscript>` in the layout forces every
 * section visible when JS never runs at all.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let done = false;

    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    const check = () => {
      frame = 0;
      if (done) return;
      // Reached the viewport, or already scrolled past it.
      if (node.getBoundingClientRect().top < window.innerHeight - 60) {
        done = true;
        setShown(true);
        stop();
      }
    };

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(check);
    }

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      stop();
    };
  }, []);

  return (
    <div ref={ref} data-shown={shown} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
