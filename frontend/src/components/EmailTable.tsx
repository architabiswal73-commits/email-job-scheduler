import { CheckCircle2, Clock3, TriangleAlert } from 'lucide-react';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { Spinner } from './ui/Spinner';
import { Table } from './ui/Table';
import type { Email, EmailStatus } from '../types/api';

type EmailTableProps = {
  emails: Email[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function iconFor(status: EmailStatus) {
  if (status === 'failed') return <TriangleAlert size={17} />;
  if (status === 'sent') return <CheckCircle2 size={17} />;
  return <Clock3 size={17} />;
}

export function EmailTable({ emails, loading, error, onRetry }: EmailTableProps) {
  if (loading) return <div className="table-state"><Spinner /><span>Loading emails...</span></div>;
  if (error) return <div className="table-state table-error"><strong>Could not load emails</strong><span>{error}</span><button onClick={onRetry}>Retry</button></div>;
  if (emails.length === 0) return <EmptyState title="No emails here yet." />;

  return <Table headers={['Email', 'Subject', 'Time', 'Status']}>
    {emails.map((email) => <tr key={email.id}>
      <td className="email-cell">{email.toEmail}</td>
      <td>{email.subject}</td>
      <td>{formatDate(email.status === 'sent' && email.sentAt ? email.sentAt : email.scheduledAt)}</td>
      <td><Badge tone={email.status === 'failed' ? 'coral' : 'green'}><span className="status-content">{iconFor(email.status)}{email.status}</span></Badge></td>
    </tr>)}
  </Table>;
}
