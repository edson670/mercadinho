import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Pílula com fundo "tint" e texto na cor cheia — o estado continua legível
  // pela cor, que é o que importa num badge de status.
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold tracking-tight transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-accent-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/12 text-destructive',
        outline: 'border-border text-ink-soft',
        success: 'border-transparent bg-ok/12 text-ok',
        warning: 'border-transparent bg-warn/15 text-warn',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
