import { cn } from '@/lib/utils';

/**
 * Esqueleto com brilho deslizante em vez de pulsar. O movimento lateral
 * sugere "chegando" em vez de "piscando", e some sozinho para quem pediu
 * menos animação (ver globals.css).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl2 bg-muted/70 bg-[length:200%_100%] animate-shimmer',
        'bg-[linear-gradient(90deg,transparent_0%,hsl(var(--card)/0.55)_50%,transparent_100%)]',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
