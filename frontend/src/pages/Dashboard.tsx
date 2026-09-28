import { useEffect, useState } from 'react';
import { CheckCircle2, MailPlus, Plus, Search, Settings2 } from 'lucide-react';
import { disconnectSlack, getSlackStatus } from '../api/endpoints';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { EmailTable } from '../components/EmailTable';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { useEmails } from '../hooks/useEmails';
import { useToast } from '../hooks/useToast';

type DashboardProps = { onLogout: () => Promise<void> };
type EmailTab = 'scheduled' | 'sent';

export function Dashboard({ onLogout }: DashboardProps) {
  const { user } = useAuth();
  const { message, show, clear } = useToast();
  const [tab, setTab] = useState<EmailTab>('scheduled');
  const [query, setQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const { emails, loading, error, retry } = useEmails(tab, query);

  useEffect(() => {
    void getSlackStatus().then((result) => setSlackConnected(result.connected)).catch(() => setSlackConnected(false));
  }, []);

  async function toggleSlack() {
    if (slackConnected) {
      await disconnectSlack();
      setSlackConnected(false);
      show('Slack disconnected');
    } else {
      window.location.href = '/slack/connect';
    }
  }

  return <main className="dashboard-page">
    <nav className="topbar"><div className="brand"><span className="brand-mark"><MailPlus size={20} /></span><span className="font-display brand-name">Mailroom</span></div><div className="account"><button className="slack-link" onClick={() => void toggleSlack()}><Settings2 size={17} />{slackConnected ? 'Disconnect Slack' : 'Connect Slack'}</button><img src={user?.avatar} alt="" className="avatar" /><span className="account-copy"><strong>{user?.name}</strong><small>{user?.email}</small></span><Button tone="quiet" onClick={() => void onLogout()}>Logout</Button></div></nav>
    <section className="dashboard-content"><div className="dashboard-heading"><div><p className="eyebrow eyebrow-light">Mailroom</p><h1 className="font-display page-title">Your email schedule</h1><p className="page-copy">Keep every message paced, visible, and ready to send.</p></div><Button tone="coral" onClick={() => setComposeOpen(true)}><Plus size={18} />Compose New Email</Button></div>
      <div className="email-toolbar"><div className="dashboard-tabs"><button className={tab === 'scheduled' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setTab('scheduled')}><CheckCircle2 size={16} />Scheduled Emails</button><button className={tab === 'sent' ? 'dashboard-tab active' : 'dashboard-tab'} onClick={() => setTab('sent')}><CheckCircle2 size={16} />Sent Emails</button></div><label className="dashboard-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emails" /></label></div>
      <EmailTable emails={emails} loading={loading} error={error} onRetry={() => void retry()} />
    </section>
    <ComposeEmailModal open={composeOpen} onClose={() => setComposeOpen(false)} onScheduled={retry} onToast={show} />
    <Toast message={message} onClose={clear} />
  </main>;
}
