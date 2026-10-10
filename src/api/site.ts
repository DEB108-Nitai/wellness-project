import { api } from './client';

export interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
}

/** Bot-protection fields sent with public forms (see api/src/Services/SpamGuard.php). */
export interface SpamFields {
  website: string;
  formStartedAt: number;
}

export const siteApi = {
  faqs: () => api.get<Faq[]>('/faqs'),
  contact: (body: { name: string; email: string; subject?: string; message: string } & SpamFields) =>
    api.post<{ message: string }>('/contact', body),
  subscribe: (email: string, spam: SpamFields) => api.post<{ message: string }>('/newsletter/subscribe', { email, ...spam }),
  unsubscribe: (token: string) => api.post<{ message: string }>('/newsletter/unsubscribe', { token }),
};
