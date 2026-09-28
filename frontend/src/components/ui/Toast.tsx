type ToastProps = { message: string; onClose: () => void };
export function Toast({ message, onClose }: ToastProps) {
  if (!message) return null;
  return <button className="toast" onClick={onClose} role="status">{message}</button>;
}
