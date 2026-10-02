import {
  AuditLogEntry,
  Campaign,
  ContactMessage,
  DeletionRequest,
  Demographics,
  FAQItem,
  Researcher,
  SystemSettings,
  TestSession,
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPAIGNS,
  INITIAL_DELETIONS,
  INITIAL_FAQS,
  INITIAL_MESSAGES,
  INITIAL_RESEARCHERS,
  INITIAL_SESSIONS,
} from '../data/initialData';
import { computeFactorScores, computeQualityFlags } from './scoringEngine';

const KEYS = {
  SESSIONS: 'wellness_sessions',
  RESEARCHERS: 'wellness_researchers',
  CAMPAIGNS: 'wellness_campaigns',
  SETTINGS: 'wellness_settings',
  AUDIT: 'wellness_audit_logs',
  DELETIONS: 'wellness_deletions',
  MESSAGES: 'wellness_messages',
  FAQS: 'wellness_faqs',
  SUBSCRIBERS: 'wellness_subscribers',
  CURRENT_SESSION_TOKEN: 'wellness_current_token',
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

  private init() {
    if (!localStorage.getItem(KEYS.SESSIONS)) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(INITIAL_SESSIONS));
    }
    if (!localStorage.getItem(KEYS.RESEARCHERS)) {
      localStorage.setItem(KEYS.RESEARCHERS, JSON.stringify(INITIAL_RESEARCHERS));
    }
    if (!localStorage.getItem(KEYS.CAMPAIGNS)) {
      localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(INITIAL_CAMPAIGNS));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(KEYS.AUDIT)) {
      localStorage.setItem(KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem(KEYS.DELETIONS)) {
      localStorage.setItem(KEYS.DELETIONS, JSON.stringify(INITIAL_DELETIONS));
    }
    if (!localStorage.getItem(KEYS.MESSAGES)) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
    }
    if (!localStorage.getItem(KEYS.FAQS)) {
      localStorage.setItem(KEYS.FAQS, JSON.stringify(INITIAL_FAQS));
    }
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

  public startSession(demographics: Demographics, campaignSlug?: string): TestSession {
    const sessions = this.getSessions();
    const refId = generateReferenceId();
    const token = generateToken();
    const now = new Date().toISOString();

    const newSession: TestSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token,
      referenceId: refId,
      campaignSlug,
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

    this.logAudit('system', 'System Engine', 'SESSION_START', 'TestSession', refId, `Participant started assessment. Campaign: ${campaignSlug || 'General'}`);
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

    // Merge answers
    const updatedDraft = { ...session.draftAnswers, ...answers };
    const answeredCount = Object.keys(updatedDraft).length;
    const pageTimes = { ...session.pageTimes, [page]: (session.pageTimes[page] || 0) + pageSeconds };

    const updatedSession: TestSession = {
      ...session,
      draftAnswers: updatedDraft,
      answeredCount,
      currentPage: page,
      pageTimes,
      lastActivityAt: new Date().toISOString(),
    };

    sessions[idx] = updatedSession;
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
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

    // Update campaign counter if attached
    if (completedSession.campaignSlug) {
      this.incrementCampaignCompletion(completedSession.campaignSlug);
    }

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

  public deleteSessionData(referenceId: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.referenceId.toUpperCase() !== referenceId.trim().toUpperCase());
    if (filtered.length !== sessions.length) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(filtered));
      this.logAudit('admin', 'Super Admin', 'DATA_PURGE', 'TestSession', referenceId, 'Participant data purged in compliance with deletion request.');
      return true;
    }
    return false;
  }

  // --- RESEARCHERS ---
  public getResearchers(): Researcher[] {
    try {
      const data = localStorage.getItem(KEYS.RESEARCHERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addResearcher(name: string, email: string, organization: string, country: string, purpose: string): Researcher {
    const list = this.getResearchers();
    const settings = this.getSettings();
    const newRes: Researcher = {
      id: `res_${Date.now()}`,
      name,
      email,
      organization,
      country,
      purpose,
      status: settings.researcherAutoApprove ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
    };
    list.push(newRes);
    localStorage.setItem(KEYS.RESEARCHERS, JSON.stringify(list));
    this.logAudit('researcher', name, 'RESEARCHER_REGISTER', 'Researcher', newRes.id, `Organization: ${organization}`);
    return newRes;
  }

  public updateResearcherStatus(id: string, status: Researcher['status'], reason?: string): boolean {
    const list = this.getResearchers();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    list[idx].status = status;
    list[idx].statusReason = reason;
    localStorage.setItem(KEYS.RESEARCHERS, JSON.stringify(list));
    this.logAudit('admin', 'Super Admin', 'RESEARCHER_STATUS_CHANGE', 'Researcher', id, `Status updated to ${status}. Reason: ${reason || 'N/A'}`);
    return true;
  }

  // --- CAMPAIGNS ---
  public getCampaigns(): Campaign[] {
    try {
      const data = localStorage.getItem(KEYS.CAMPAIGNS);
      const campaigns: Campaign[] = data ? JSON.parse(data) : [];
      const sessions = this.getSessions();

      // Recalculate dynamic live counts
      return campaigns.map((camp) => {
        const campSessions = sessions.filter((s) => s.campaignSlug === camp.slug);
        return {
          ...camp,
          responsesCount: campSessions.length,
          completedCount: campSessions.filter((s) => s.status === 'completed').length,
        };
      });
    } catch {
      return [];
    }
  }

  public getCampaignBySlug(slug: string): Campaign | undefined {
    return this.getCampaigns().find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  }

  public createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'status'>, autoApprove = false): Campaign {
    const list = this.getCampaigns();
    const newCamp: Campaign = {
      ...campaign,
      id: `camp_${Date.now()}`,
      status: autoApprove ? 'live' : 'pending_approval',
      createdAt: new Date().toISOString(),
      responsesCount: 0,
      completedCount: 0,
    };
    list.push(newCamp);
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(list));
    this.logAudit('researcher', campaign.researcherName || 'Researcher', 'CAMPAIGN_CREATE', 'Campaign', newCamp.slug, `Title: ${newCamp.title}`);
    return newCamp;
  }

  public updateCampaignStatus(id: string, status: Campaign['status'], reason?: string): boolean {
    const list = this.getCampaigns();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    list[idx].status = status;
    list[idx].statusReason = reason;
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(list));
    this.logAudit('admin', 'Super Admin', 'CAMPAIGN_STATUS_CHANGE', 'Campaign', id, `Status changed to ${status}. Reason: ${reason || 'N/A'}`);
    return true;
  }

  private incrementCampaignCompletion(slug: string) {
    const list = this.getCampaigns();
    const idx = list.findIndex((c) => c.slug === slug);
    if (idx !== -1) {
      list[idx].completedCount = (list[idx].completedCount || 0) + 1;
      localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(list));
    }
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
    actorType: 'admin' | 'researcher' | 'system',
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

  // --- DELETION REQUESTS ---
  public getDeletions(): DeletionRequest[] {
    try {
      const data = localStorage.getItem(KEYS.DELETIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public submitDeletionRequest(referenceId: string, email?: string): DeletionRequest {
    const list = this.getDeletions();
    const req: DeletionRequest = {
      id: `del_${Date.now()}`,
      referenceId: referenceId.trim().toUpperCase(),
      email,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    list.unshift(req);
    localStorage.setItem(KEYS.DELETIONS, JSON.stringify(list));
    this.logAudit('system', 'System Engine', 'DELETION_REQUEST_SUBMITTED', 'DeletionRequest', referenceId);
    return req;
  }

  public approveDeletion(id: string): boolean {
    const list = this.getDeletions();
    const req = list.find((d) => d.id === id);
    if (!req) return false;

    // Purge corresponding session
    this.deleteSessionData(req.referenceId);

    req.status = 'approved';
    req.handledAt = new Date().toISOString();
    localStorage.setItem(KEYS.DELETIONS, JSON.stringify(list));
    return true;
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
      return data ? JSON.parse(data) : INITIAL_FAQS;
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
      'Campaign',
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
        s.campaignSlug || 'General',
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
