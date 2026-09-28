import { api } from './client';
import type { EmailListResponse, ScheduleInput, ScheduleResponse, SlackStatus, User } from '../types/api';

export const getCurrentUser = () => api<User>('/auth/me');
export const logout = () => api<void>('/auth/logout', { method: 'POST' });
export const getEmails = (status: 'scheduled' | 'sent') => api<EmailListResponse>(`/api/emails?status=${status}`);
export const searchEmails = (query: string, status: 'scheduled' | 'sent') => api<EmailListResponse>(`/api/emails/search?q=${encodeURIComponent(query)}&status=${status}`);
export const scheduleEmails = (input: ScheduleInput) => api<ScheduleResponse>('/api/emails/schedule', { method: 'POST', body: JSON.stringify(input) });
export const getSlackStatus = () => api<SlackStatus>('/slack/status');
export const disconnectSlack = () => api<void>('/slack/disconnect', { method: 'DELETE' });
