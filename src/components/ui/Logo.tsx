import Image from 'next/image';
import { clsx } from '@/lib/clsx';

// Intrinsic size of the trimmed, transparent brand mark in /public/logo.png
const LOGO_W = 776;
const LOGO_H = 466;
const RATIO = LOGO_W / LOGO_H;

/**
 * NATA STUDIOS brand mark (white, transparent PNG). Renders at a fixed pixel
 * height; width scales to keep the aspect ratio.
 */
export function Logo({
  className,
  height = 38,
  priority = false
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="NATA STUDIOS"
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      className={clsx('w-auto select-none', className)}
      style={{ height }}
    />
  );
}
