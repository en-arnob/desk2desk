import { cn } from '@/lib/utils';

/**
 * Premier Cement mark: a 2×2 grid of rounded squares with the bottom-right
 * cell left empty, rendered in the brand red.
 */
export function PremierMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 58 58"
      className={cn('shrink-0', className)}
      fill="#931017"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="26" height="26" rx="4" />
      <rect x="32" y="0" width="26" height="26" rx="4" />
      <rect x="0" y="32" width="26" height="26" rx="4" />
    </svg>
  );
}

/** Mark + "Desk2Desk" wordmark, used in the sidebar and login. */
export function BrandLockup({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <PremierMark className={cn('h-7 w-7', markClassName)} />
      <span className="text-lg font-bold tracking-tight">
        <span className="text-primary">Desk</span>2Desk
      </span>
    </div>
  );
}
