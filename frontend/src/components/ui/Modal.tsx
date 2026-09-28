import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = { open: boolean; title: string; children: ReactNode; onClose: () => void };
export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</section></div>;
}
