import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string };
export function Input({ label, className = '', ...props }: InputProps) {
  return <label className="control-label">{label}{label && <span /> }<input className={`field ${className}`} {...props} /></label>;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string };
export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return <label className="control-label">{label}{label && <span /> }<textarea className={`field ${className}`} {...props} /></label>;
}
