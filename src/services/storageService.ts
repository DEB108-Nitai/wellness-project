import {
  AuditLogEntry,
  ChallengeRegistration,
  ContactMessage,
  Demographics,
  FAQItem,
  SonicRegistration,
  SystemSettings,
  TestSession,
  UserAccount,
} from '../types';
import { DEFAULT_SETTINGS, INITIAL_FAQS } from '../data/initialData';
import { computeFactorScores, computeQualityFlags } from './scoringEngine';

const KEYS = {
  SESSIONS: 'wellness_sessions',
  SETTINGS: 'wellness_settings',
  AUDIT: 'wellness_audit_logs',
  MESSAGES: 'wellness_messages',
  FAQS: 'wellness_faqs',
  SUBSCRIBERS: 'wellness_subscribers',
  CURRENT_SESSION_TOKEN: 'wellness_current_token',
  CHALLENGE_REGISTRATIONS: 'wellness_challenge_registrations',
  SONIC_REGISTRATIONS: 'wellness_sonic_registrations',
  CURRENT_USER: 'wellness_current_user',
};

// Generate human-friendly reference ID like WL-7K2Q9X
export function generateReferenceId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'WL-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateToken(): string {
  return 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

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

  // --- SIGNED-IN USER (mirrored from AuthContext; real auth lives in the PHP API) ---
  public getCurrentUser(): UserAccount | null {
    try {
      const data = localStorage.getItem(KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public setCurrentUser(user: UserAccount | null) {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
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

  // --- SESSIONS ---
  public getSessions(): TestSession[] {
    try {
      const data = localStorage.getItem(KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getSessionByToken(token: string): TestSession | undefined {
    return this.getSessions().find((s) => s.token === token);
  }

  public getSessionByRefId(refId: string): TestSession | undefined {
    return this.getSessions().find((s) => s.referenceId.toUpperCase() === refId.trim().toUpperCase());
  }

  public getActiveDraftSession(userIdOrEmail?: string): TestSession | undefined {
    try {
      const currentUser = this.getCurrentUser();
      const targetUser = userIdOrEmail || currentUser?.email || currentUser?.id;

      // Strict rule: Draft continuation is exclusively for a logged-in user who left an assessment in-between
      if (!targetUser) {
        return undefined;
      }

      const sessions = this.getSessions();
      const userDraft = sessions.find(
        (s) =>
          s.status === 'in_progress' &&
          s.answeredCount > 0 &&
          (s.userEmail?.toLowerCase() === targetUser.toLowerCase() ||
            s.userId === targetUser ||
            s.demographics?.email?.toLowerCase() === targetUser.toLowerCase())
      );

      return userDraft;
    } catch {
      return undefined;
    }
  }

  public discardDraftSession(token?: string) {
    try {
      if (token) {
        const sessions = this.getSessions().filter((s) => s.token !== token);
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
      }
      localStorage.removeItem(KEYS.CURRENT_SESSION_TOKEN);
    } catch {
      // ignore
    }
  }

  public startSession(demographics: Demographics): TestSession {
    const sessions = this.getSessions();
    const refId = generateReferenceId();
    const token = generateToken();
    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();

    const newSession: TestSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token,
      referenceId: refId,
      userId: currentUser?.id,
      userEmail: currentUser?.email || demographics.email,
      status: 'in_progress',
      currentPage: 1,
      consentVersion: 'v1.0',
      consentAt: now,
      demographics,
      draftAnswers: {},
      answeredCount: 0,
      pageTimes: {},
      startedAt: now,
      lastActivityAt: now,
      idempotencyKey: `idemp_${token}`,
    };

    sessions.push(newSession);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(KEYS.CURRENT_SESSION_TOKEN, token);

    this.logAudit('system', currentUser?.name || 'System Engine', 'SESSION_START', 'TestSession', refId, 'Participant started assessment.');
    return newSession;
  }

  public autosaveAnswers(
    token: string,
    answers: Record<number, number>,
    page: number,
    pageSeconds: number
  ): TestSession | null {
    const sessions = this.getSessions();
    const idx = sessions.findIndex((s) => s.token === token);
    if (idx === -1) return null;

    const session = sessions[idx];
    if (session.status === 'completed') return session;

    const currentUser = this.getCurrentUser();

    // Merge answers
    const updatedDraft = { ...session.draftAnswers, ...answers };
    const answeredCount = Object.keys(updatedDraft).length;
    const pageTimes = { ...session.pageTimes, [page]: (session.pageTimes[page] || 0) + pageSeconds };

    const updatedSession: TestSession = {
      ...session,
      userId: session.userId || currentUser?.id,
      userEmail: session.userEmail || currentUser?.email,
      draftAnswers: updatedDraft,
      answeredCount,
      currentPage: page,
      pageTimes,
      lastActivityAt: new Date().toISOString(),
    };

    sessions[idx] = updatedSession;
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(KEYS.CURRENT_SESSION_TOKEN, token);
    return updatedSession;
  }

  public submitSession(token: string): { session: TestSession; error?: string } | { error: string } {
    const sessions = this.getSessions();
    const idx = sessions.findIndex((s) => s.token === token);
    if (idx === -1) return { error: 'Session not found or expired.' };

    const session = sessions[idx];
    if (session.status === 'completed') {
      return { session }; // Idempotent return
    }

    const settings = this.getSettings();
    const answers = session.draftAnswers;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < 10) {
      return { error: `Please answer more statements before submitting. (${answeredCount}/163 answered)` };
    }

    const now = new Date().toISOString();
    const durationSeconds = Math.max(60, Math.floor((new Date(now).getTime() - new Date(session.startedAt).getTime()) / 1000));

    const { scores, globalDomains } = computeFactorScores(answers, settings.scalePoints);
    const qualityFlags = computeQualityFlags(answers, durationSeconds, settings.tooFastMinutes);

    const completedSession: TestSession = {
      ...session,
      status: 'completed',
      completedAt: now,
      lastActivityAt: now,
      scores,
      globalDomains,
      qualityFlags,
    };

    sessions[idx] = completedSession;
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));

    this.logAudit('system', 'System Engine', 'SESSION_SUBMIT', 'TestSession', session.referenceId, `Participant completed 163-factor assessment. Sten scores computed.`);
    return { session: completedSession };
  }

  public saveReview(token: string, rating: number, comment?: string): boolean {
    const sessions = this.getSessions();
    const idx = sessions.findIndex((s) => s.token === token);
    if (idx === -1) return false;

    sessions[idx].review = {
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    return true;
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

  // --- EXPORT ENGINES (WITH FORMULA INJECTION DEFENSE) ---
  public exportParticipantsCSV(sessionsToExport?: TestSession[]): string {
    const list = sessionsToExport || this.getSessions();
    const factorCodes = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I', 'L', 'M', 'N', 'O', 'Q1', 'Q2', 'Q3', 'Q4'];

    const headers = [
      'Reference ID',
      'Status',
      'Started At',
      'Completed At',
      'Country',
      'Age',
      'Gender',
      'Education',
      'Occupation Field',
      'Rating',
      'Duration (sec)',
      'Flags',
      ...factorCodes.map((f) => `Factor ${f} (Sten)`),
      ...factorCodes.map((f) => `Factor ${f} (Raw)`),
    ];

    const sanitizeCell = (val: unknown): string => {
      if (val === undefined || val === null) return '""';
      let str = String(val);
      // NFR-SEC-015: Formula injection protection for CSV
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = list.map((s) => {
      const scoreMap = new Map((s.scores || []).map((sc) => [sc.factorCode, sc]));

      const rowData = [
        s.referenceId,
        s.status,
        s.startedAt,
        s.completedAt || '',
        s.demographics.country,
        s.demographics.age,
        s.demographics.gender,
        s.demographics.education || '',
        s.demographics.occupationField || '',
        s.review?.rating || '',
        s.qualityFlags?.durationSeconds || '',
        s.qualityFlags?.flagged ? 'FLAGGED' : 'CLEAN',
        ...factorCodes.map((f) => scoreMap.get(f as any)?.sten ?? ''),
        ...factorCodes.map((f) => scoreMap.get(f as any)?.rawScore ?? ''),
      ];

      return rowData.map(sanitizeCell).join(',');
    });

    return [headers.map(sanitizeCell).join(','), ...rows].join('\n');
  }

  public exportParticipantsJSON(sessionsToExport?: TestSession[]): string {
    const list = sessionsToExport || this.getSessions();
    return JSON.stringify(list, null, 2);
  }
}

export const storage = new StorageService();
