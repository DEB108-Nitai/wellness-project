import {
  AuditLogEntry,
  ChallengeRegistration,
  ContactMessage,
  FAQItem,
  SonicRegistration,
  SystemSettings,
} from '../types';
import { DEFAULT_SETTINGS, INITIAL_FAQS } from '../data/initialData';

const KEYS = {
  SETTINGS: 'wellness_settings',
  AUDIT: 'wellness_audit_logs',
  MESSAGES: 'wellness_messages',
  FAQS: 'wellness_faqs',
  SUBSCRIBERS: 'wellness_subscribers',
  CHALLENGE_REGISTRATIONS: 'wellness_challenge_registrations',
  SONIC_REGISTRATIONS: 'wellness_sonic_registrations',
};

class StorageService {
  constructor() {
    this.init();
  }

  // Temporary browser storage until each feature moves to the PHP API (PRD phases 2-5).
  // No demo data is seeded.
  private init() {
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(KEYS.FAQS)) {
      localStorage.setItem(KEYS.FAQS, JSON.stringify(INITIAL_FAQS));
    }
  }

  // --- 60-DAY CHALLENGE REGISTRATIONS ---
  public getChallengeRegistrations(): ChallengeRegistration[] {
    try {
      const data = localStorage.getItem(KEYS.CHALLENGE_REGISTRATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addChallengeRegistration(data: Omit<ChallengeRegistration, 'id' | 'createdAt' | 'status' | 'referenceCode'>): ChallengeRegistration {
    const list = this.getChallengeRegistrations();
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let codeSuffix = '';
    for (let i = 0; i < 6; i++) {
      codeSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const referenceCode = `TTI-60-${codeSuffix}`;

    const newReg: ChallengeRegistration = {
      ...data,
      id: `reg_${Date.now()}`,
      referenceCode,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    list.unshift(newReg);
    localStorage.setItem(KEYS.CHALLENGE_REGISTRATIONS, JSON.stringify(list));
    this.logAudit('system', data.name, 'CHALLENGE_REGISTRATION', 'ChallengeRegistration', referenceCode, `Track: ${data.programTrack}, Timing: ${data.cohortTiming}`);
    return newReg;
  }

  public updateChallengeRegistrationStatus(id: string, status: ChallengeRegistration['status'], notes?: string): boolean {
    const list = this.getChallengeRegistrations();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    list[idx].status = status;
    if (notes !== undefined) list[idx].notes = notes;
    localStorage.setItem(KEYS.CHALLENGE_REGISTRATIONS, JSON.stringify(list));
    this.logAudit('admin', 'Super Admin', 'CHALLENGE_STATUS_UPDATE', 'ChallengeRegistration', list[idx].referenceCode, `Status: ${status}`);
    return true;
  }

  public deleteChallengeRegistration(id: string): boolean {
    const list = this.getChallengeRegistrations();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      localStorage.setItem(KEYS.CHALLENGE_REGISTRATIONS, JSON.stringify(filtered));
      this.logAudit('admin', 'Super Admin', 'CHALLENGE_REG_DELETE', 'ChallengeRegistration', id, 'Deleted registration record.');
      return true;
    }
    return false;
  }

  public exportChallengeRegistrationsCSV(): string {
    const list = this.getChallengeRegistrations();
    const headers = [
      'Reference Code',
      'Name',
      'Email',
      'Phone',
      'Age',
      'City',
      'Program Track',
      'Cohort Timing',
      'Current Struggles',
      'Primary Goal',
      'Status',
      'Registered At',
      'Notes',
    ];

    const sanitizeCell = (val: unknown): string => {
      if (val === undefined || val === null) return '""';
      let str = Array.isArray(val) ? val.join('; ') : String(val);
      if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = list.map((r) => [
      r.referenceCode,
      r.name,
      r.email,
      r.phone,
      r.age || '',
      r.city || '',
      r.programTrack === 'tti-intensive' ? 'TTI Intensive Mentorship' : 'Mind-Consciousness Awakening',
      r.cohortTiming,
      r.currentStruggles,
      r.primaryGoal,
      r.status,
      r.createdAt,
      r.notes || '',
    ]);

    return [headers.map(sanitizeCell).join(','), ...rows.map((row) => row.map(sanitizeCell).join(','))].join('\n');
  }

  public exportChallengeRegistrationsJSON(): string {
    return JSON.stringify(this.getChallengeRegistrations(), null, 2);
  }

  // --- SONIC THERAPEUTIC INTERVENTION (STI) REGISTRATIONS ---
  public getSonicRegistrations(): SonicRegistration[] {
    try {
      const data = localStorage.getItem(KEYS.SONIC_REGISTRATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addSonicRegistration(data: Omit<SonicRegistration, 'id' | 'createdAt' | 'status' | 'referenceCode'>): SonicRegistration {
    const list = this.getSonicRegistrations();
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let codeSuffix = '';
    for (let i = 0; i < 6; i++) {
      codeSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const referenceCode = `STI-SOUND-${codeSuffix}`;

    const newReg: SonicRegistration = {
      ...data,
      id: `sonic_${Date.now()}`,
      referenceCode,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    list.unshift(newReg);
    localStorage.setItem(KEYS.SONIC_REGISTRATIONS, JSON.stringify(list));
    this.logAudit('system', data.name, 'SONIC_THERAPY_REGISTRATION', 'SonicRegistration', referenceCode, `Format: ${data.therapyFormat}, Pref: ${data.sessionPreference}`);
    return newReg;
  }

  public updateSonicRegistrationStatus(id: string, status: SonicRegistration['status'], notes?: string): boolean {
    const list = this.getSonicRegistrations();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    list[idx].status = status;
    if (notes !== undefined) list[idx].specialNotes = notes;
    localStorage.setItem(KEYS.SONIC_REGISTRATIONS, JSON.stringify(list));
    this.logAudit('admin', 'Super Admin', 'SONIC_STATUS_UPDATE', 'SonicRegistration', list[idx].referenceCode, `Status: ${status}`);
    return true;
  }

  public deleteSonicRegistration(id: string): boolean {
    const list = this.getSonicRegistrations();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      localStorage.setItem(KEYS.SONIC_REGISTRATIONS, JSON.stringify(filtered));
      this.logAudit('admin', 'Super Admin', 'SONIC_REG_DELETE', 'SonicRegistration', id, 'Deleted sonic therapy registration.');
      return true;
    }
    return false;
  }

  public exportSonicRegistrationsCSV(): string {
    const list = this.getSonicRegistrations();
    const headers = [
      'Reference Code',
      'Name',
      'Email',
      'Phone',
      'Age',
      'City',
      'Therapy Format',
      'Session Preference',
      'Primary Focus Areas',
      'Special Notes / Goals',
      'Status',
      'Registered At',
    ];

    const sanitizeCell = (val: unknown): string => {
      if (val === undefined || val === null) return '""';
      let str = Array.isArray(val) ? val.join('; ') : String(val);
      if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = list.map((r) => [
      r.referenceCode,
      r.name,
      r.email,
      r.phone,
      r.age || '',
      r.city || '',
      r.therapyFormat,
      r.sessionPreference,
      r.primaryFocus,
      r.specialNotes || '',
      r.status,
      r.createdAt,
    ]);

    return [headers.map(sanitizeCell).join(','), ...rows.map((row) => row.map(sanitizeCell).join(','))].join('\n');
  }

  public exportSonicRegistrationsJSON(): string {
    return JSON.stringify(this.getSonicRegistrations(), null, 2);
  }

  // --- SETTINGS ---
  public getSettings(): SystemSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    this.logAudit('admin', 'Super Admin', 'SETTINGS_UPDATE', 'System', 'GLOBAL', JSON.stringify(newSettings));
    return updated;
  }

  // --- AUDIT LOG ---
  public getAuditLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(KEYS.AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public logAudit(
    actorType: 'admin' | 'system',
    actorName: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: string
  ) {
    const logs = this.getAuditLogs();
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorType,
      actorName,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    logs.unshift(entry);
    // Keep max 500 logs
    if (logs.length > 500) logs.pop();
    localStorage.setItem(KEYS.AUDIT, JSON.stringify(logs));
  }

  // --- CONTACT MESSAGES ---
  public getContactMessages(): ContactMessage[] {
    try {
      const data = localStorage.getItem(KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addContactMessage(name: string, email: string, subject: string, message: string): ContactMessage {
    const list = this.getContactMessages();
    const msg: ContactMessage = {
      id: `msg_${Date.now()}`,
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      handled: false,
    };
    list.unshift(msg);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(list));
    return msg;
  }

  // --- FAQS ---
  public getFAQs(): FAQItem[] {
    try {
      const data = localStorage.getItem(KEYS.FAQS);
      const faqs: FAQItem[] = data ? JSON.parse(data) : INITIAL_FAQS;

      // Ensure any outdated deletion line is stripped from cached state
      const cleaned = faqs.map((f) => {
        if (f.id === 'faq_04' || f.question.toLowerCase().includes('data private') || f.question.toLowerCase().includes('data stored')) {
          return {
            ...f,
            question: 'Is my data private and confidential?',
            answer: f.answer.replace(/You can request complete deletion of your data at any time using your unique reference ID\.?/gi, '').trim(),
          };
        }
        return f;
      });

      return cleaned;
    } catch {
      return INITIAL_FAQS;
    }
  }

  public saveFAQs(faqs: FAQItem[]) {
    localStorage.setItem(KEYS.FAQS, JSON.stringify(faqs));
  }
}

export const storage = new StorageService();
