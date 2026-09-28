import { MailPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Login() {
  return <main className="auth-page"><div className="auth-panel"><div className="brand-mark"><MailPlus size={22} /></div><h1 className="font-display auth-title">Mailroom</h1><p className="auth-copy">Schedule thoughtful outreach and keep every send in view.</p><Button tone="coral" className="auth-button" onClick={() => { window.location.href = '/auth/google'; }}>Sign in with Google</Button></div></main>;
}
