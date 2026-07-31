'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Blob = {
  className: string;
  x: number[];
  y: number[];
  duration: number;
};

const PRESETS: Record<'hero' | 'section', Blob[]> = {
  hero: [
    {
      className:
        'left-1/2 top-[-12%] h-[560px] w-[560px] -translate-x-1/2 bg-accent/25',
      x: [-30, 30, -30],
      y: [0, 24, 0],
      duration: 16
    },
    {
      className: 'right-[4%] top-[26%] h-[340px] w-[340px] bg-accent-2/15',
      x: [0, -40, 0],
      y: [0, 30, 0],
      duration: 20
    }
  ],
  section: [
    {
      className: 'right-1/4 top-0 h-[420px] w-[420px] bg-accent/15',
      x: [0, 40, 0],
      y: [0, -24, 0],
      duration: 22
    }
  ]
};

/**
 * Slowly oscillating, blurred light "blobs" that give the page its cinematic,
 * atmospheric depth. Purely decorative and disabled under prefers-reduced-motion.
 */
export function AmbientBlobs({ variant = 'hero' }: { variant?: 'hero' | 'section' }) {
  const reduce = useReducedMotion();
  const blobs = PRESETS[variant];

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[120px] ${blob.className}`}
          animate={reduce ? undefined : { x: blob.x, y: blob.y }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}
