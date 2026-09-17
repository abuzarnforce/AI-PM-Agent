"use client";

import { MotionConfig } from "framer-motion";

/** reducedMotion="user" makes every framer-motion animation in the app respect
 * prefers-reduced-motion automatically: transform-based motion drops out and
 * only opacity cross-fades remain, no per-component handling needed. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
      {children}
    </MotionConfig>
  );
}
