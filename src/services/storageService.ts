import {
  AuditLogEntry,
  Campaign,
  ChallengeRegistration,
  ContactMessage,
  DeletionRequest,
  Demographics,
  FAQItem,
  Researcher,
  SonicRegistration,
  SystemSettings,
  TestSession,
  UserAccount,
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPAIGNS,
  INITIAL_CHALLENGE_REGISTRATIONS,
  INITIAL_DELETIONS,
  INITIAL_FAQS,
  INITIAL_MESSAGES,
  INITIAL_RESEARCHERS,
  INITIAL_SESSIONS,
  INITIAL_SONIC_REGISTRATIONS,
  INITIAL_USERS,
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
  CHALLENGE_REGISTRATIONS: 'wellness_challenge_registrations',
  SONIC_REGISTRATIONS: 'wellness_sonic_registrations',
  CURRENT_USER: 'wellness_current_user',
  USERS: 'wellness_users',
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
    if (!localStorage.getItem(KEYS.CHALLENGE_REGISTRATIONS)) {
      localStorage.setItem(KEYS.CHALLENGE_REGISTRATIONS, JSON.stringify(INITIAL_CHALLENGE_REGISTRATIONS));
    }
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(KEYS.SONIC_REGISTRATIONS)) {
      localStorage.setItem(KEYS.SONIC_REGISTRATIONS, JSON.stringify(INITIAL_SONIC_REGISTRATIONS));
    }
  }

  // --- USER AUTHENTICATION ---
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

  public getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public signupUser(name: string, email: string, role: 'user' | 'researcher' | 'admin' = 'user'): UserAccount {
    const users = this.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      this.setCurrentUser(existing);
      return existing;
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);
    this.logAudit('system', name, 'USER_SIGNUP', 'UserAccount', newUser.id, `Signed up as ${role}`);
    return newUser;
  }

  public loginUser(email: string, nameFallback?: string): UserAccount {
    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      user = {
        id: `usr_${Date.now()}`,
        name: nameFallback || email.split('@')[0],
        email,
        role: email.includes('admin') ? 'admin' : email.includes('research') ? 'researcher' : 'user',
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }

    this.setCurrentUser(user);
    this.logAudit('system', user.name, 'USER_LOGIN', 'UserAccount', user.id, `Role: ${user.role}`);
    return user;
  }

  public logoutUser() {
    this.setCurrentUser(null);
  }

  // --- 60-DAY CHALLENGE REGISTRATIONS ---
  public getChallengeRegistrations(): ChallengeRegistration[] {
    try {
      const data = localStorage.getItem(KEYS.CHALLENGE_REGISTRATIONS);
      return data ? JSON.parse(data) : INITIAL_CHALLENGE_REGISTRATIONS;
    } catch {
      return INITIAL_CHALLENGE_REGISTRATIONS;
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
      return data ? JSON.parse(data) : INITIAL_SONIC_REGISTRATIONS;
    } catch {
      return INITIAL_SONIC_REGISTRATIONS;
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

  public startSession(demographics: Demographics, campaignSlug?: string): TestSession {
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

    this.logAudit('system', currentUser?.name || 'System Engine', 'SESSION_START', 'TestSession', refId, `Participant started assessment. Campaign: ${campaignSlug || 'General'}`);
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
