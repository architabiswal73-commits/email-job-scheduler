import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'dark' | 'coral' | 'quiet';
};

export function Button({ children, tone = 'dark', className = '', ...props }: ButtonProps) {
  return <button className={`button button-${tone} ${className}`} {...props}>{children}</button>;
}
