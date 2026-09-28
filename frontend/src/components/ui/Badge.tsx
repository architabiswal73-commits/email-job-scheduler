import type { ReactNode } from 'react';

type BadgeProps = { children: ReactNode; tone?: 'green' | 'coral' | 'muted' };
export function Badge({ children, tone = 'green' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
