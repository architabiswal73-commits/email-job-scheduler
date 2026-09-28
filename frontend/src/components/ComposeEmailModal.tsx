import { useState, type ChangeEvent, type FormEvent } from 'react';
import { FileUp, Send } from 'lucide-react';
import { scheduleEmails } from '../api/endpoints';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Modal } from './ui/Modal';
import type { ScheduleInput } from '../types/api';

type ComposeEmailModalProps = {
  open: boolean;
  onClose: () => void;
  onScheduled: () => Promise<void>;
  onToast: (message: string) => void;
};

type FormErrors = Partial<Record<'subject' | 'recipients' | 'startTime' | 'delaySeconds' | 'hourlyLimit', string>>;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function ComposeEmailModal({ open, onClose, onScheduled, onToast }: ComposeEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualRecipients, setManualRecipients] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function addRecipients(value: string) {
    const found = value.match(emailPattern) ?? [];
    setRecipients((current) => [...new Set([...current, ...found.map((email) => email.toLowerCase())])]);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void file.text().then(addRecipients);
  }

  function validate() {
    const next: FormErrors = {};
    const allRecipients = [...recipients, ...(manualRecipients.match(emailPattern) ?? []).map((email) => email.toLowerCase())];
    if (!subject.trim()) next.subject = 'Subject is required';
    if (allRecipients.length === 0) next.recipients = 'Add at least one email address';
    if (!startTime || new Date(startTime).getTime() <= Date.now()) next.startTime = 'Start time must be in the future';
    if (!delaySeconds || Number(delaySeconds) < 0) next.delaySeconds = 'Delay is required';
    if (!hourlyLimit || Number(hourlyLimit) < 1) next.hourlyLimit = 'Hourly limit is required';
    setErrors(next);
    return { next, allRecipients: [...new Set(allRecipients)] };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { next, allRecipients } = validate();
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    try {
      const input: ScheduleInput = {
        subject: subject.trim(),
        body,
        recipients: allRecipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenMs: Number(delaySeconds) * 1000,
        hourlyLimit: Number(hourlyLimit)
      };
      await scheduleEmails(input);
      onToast('Email batch scheduled');
      onClose();
      await onScheduled();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not schedule emails');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setErrors({});
    onClose();
  }

  return <Modal open={open} title="Compose New Email" onClose={close}><form className="modal-form" onSubmit={submit}>
    <Input label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
    {errors.subject && <p className="inline-error">{errors.subject}</p>}
    <Textarea label="Body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your message" rows={5} />
    <label className="file-drop"><FileUp size={18} /><span>Upload CSV or TXT recipient file</span><input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFile} /></label>
    <Textarea label="Or paste recipients" value={manualRecipients} onChange={(event) => setManualRecipients(event.target.value)} placeholder="One email per line" rows={3} />
    <p className="detected-count">{[...new Set([...recipients, ...(manualRecipients.match(emailPattern) ?? []).map((email) => email.toLowerCase())])].length} email addresses detected</p>
    {errors.recipients && <p className="inline-error">{errors.recipients}</p>}
    <div className="form-row"><Input label="Start time" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} /> <Input label="Delay between emails (seconds)" type="number" min="0" value={delaySeconds} onChange={(event) => setDelaySeconds(event.target.value)} /></div>
    {errors.startTime && <p className="inline-error">{errors.startTime}</p>}
    {errors.delaySeconds && <p className="inline-error">{errors.delaySeconds}</p>}
    <Input label="Hourly limit" type="number" min="1" value={hourlyLimit} onChange={(event) => setHourlyLimit(event.target.value)} />
    {errors.hourlyLimit && <p className="inline-error">{errors.hourlyLimit}</p>}
    <div className="modal-actions"><Button type="button" tone="quiet" onClick={close}>Cancel</Button><Button type="submit" tone="coral" disabled={submitting}><Send size={16} />{submitting ? 'Scheduling...' : 'Schedule email'}</Button></div>
  </form></Modal>;
}
