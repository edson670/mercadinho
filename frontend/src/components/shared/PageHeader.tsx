import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 animate-fadeUp">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-.02em]">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
