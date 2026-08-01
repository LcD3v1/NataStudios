import { clsx } from '@/lib/clsx';

const RATIO = 776 / 466; // intrinsic size of /logo.png

/** NATA STUDIOS brand mark. Height-driven; width keeps the aspect ratio. */
export function Logo({ className, height = 38 }: { className?: string; height?: number }) {
  return (
    <img
      src="/logo.png"
      alt="NATA STUDIOS"
      width={Math.round(height * RATIO)}
      height={height}
      style={{ height }}
      className={clsx('w-auto select-none', className)}
    />
  );
}
