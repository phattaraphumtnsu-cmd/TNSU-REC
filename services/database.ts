import { User as FirebaseUser } from 'firebase/auth';
import { Proposal, ProposalStatus, Review, Role, User, ProgressReport, RevisionLog, ReviewerStatus, EmailTrigger, EmailTemplate } from '../types';
import { AuditService } from './modules/audit.service';
import { NotificationService } from './modules/notification.service';
import { UserService } from './modules/user.service';
import { AuthService } from './modules/auth.service';
import { ProposalService } from './modules/proposal.service';

class DatabaseService {
  currentUser: User | null = null;
  
  private auditService: AuditService;
  private notificationService: NotificationService;
  private userService: UserService;
  private authService: AuthService;
  private proposalService: ProposalService;

  constructor() {
    this.auditService = new AuditService();
    this.notificationService = new NotificationService(this.auditService);
    this.userService = new UserService(this.auditService);
    this.authService = new AuthService(this.auditService, this.notificationService, this.userService);
    this.proposalService = new ProposalService(this.auditService, this.notificationService, this.userService);
  }

  // --- Email Templates ---

  async initializeEmailTemplates() {
    await this.notificationService.initializeEmailTemplates();
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
      return this.notificationService.getEmailTemplates();
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
      await this.notificationService.updateEmailTemplate(this.currentUser, id, updates);
  }

  // --- Notifications & Emails ---

  async sendNotification(userId: string, message: string, link?: string, emailTrigger?: EmailTrigger, emailData?: Record<string, string>) {
    await this.notificationService.sendNotification(userId, message, link, emailTrigger, emailData);
  }

  async getNotifications(userId: string, limitCount: number = 20, lastDoc: any = null): Promise<{ data: any[], lastDoc: any }> {
    return this.notificationService.getNotifications(userId, limitCount, lastDoc);
  }

  subscribeToNotifications(userId: string, callback: (notifications: any[]) => void, limitCount: number = 20) {
      return this.notificationService.subscribeToNotifications(userId, callback, limitCount);
  }

  async getEmailLogs(limitCount: number = 50, lastDoc: any = null) {
      return this.notificationService.getEmailLogs(limitCount, lastDoc);
  }

  async markAsRead(notificationId: string) {
    await this.notificationService.markAsRead(notificationId);
  }

  async sendSystemEmail(to: string, trigger: EmailTrigger, data: Record<string, string>) {
      await this.notificationService.sendSystemEmail(to, trigger, data);
  }

  // --- Auth ---

  async login(email: string, pass: string): Promise<User> {
    const user = await this.authService.login(email, pass);
    this.currentUser = user;
    return user;
  }

  async logout() {
    await this.authService.logout(this.currentUser);
    this.currentUser = null;
  }

  async syncCurrentUser(fbUser: FirebaseUser | null): Promise<User | null> {
    const user = await this.authService.syncCurrentUser(fbUser);
    this.currentUser = user;
    return user;
  }

  async register(user: Omit<User, 'id'>, password: string): Promise<User> {
    const newUser = await this.authService.register(this.currentUser, user, password);
    // If self-registration (no current user), update current user
    if (!this.currentUser) {
        this.currentUser = newUser;
    }
    return newUser;
  }

  async resetPassword(email: string): Promise<boolean> {
    return this.authService.resetPassword(email);
  }
  
  async changePassword(newPassword: string): Promise<void> {
      return this.authService.changePassword(newPassword);
  }

  async migrateUserRoles() {
    return this.userService.migrateUserRoles(this.currentUser);
  }

  async checkAnyAdminExists(): Promise<boolean> {
    return this.userService.checkAnyAdminExists();
  }

  // --- User Management ---

  async getUsers(roleFilter: string = 'ALL', limitCount: number = 20, lastDoc: any = null): Promise<{ users: User[], lastDoc: any }> {
    return this.userService.getUsers(roleFilter, limitCount, lastDoc);
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    return this.userService.getUsersByRole(role);
  }

  async getEligibleAdvisors(): Promise<User[]> {
    return this.userService.getEligibleAdvisors();
  }

  async updateUser(id: string, updates: Partial<User>) {
    await this.userService.updateUser(this.currentUser, id, updates);
    if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = { ...this.currentUser, ...updates };
    }
  }

  async deleteUser(id: string) {
    await this.userService.deleteUser(this.currentUser, id);
  }

  // --- Proposals ---

  async getProposals(
      userRoles: Role[], 
      userId: string, 
      lastDoc: any = null, 
      pageSize: number = 20,
      filterStatus: string = 'ALL',
      filterFaculty: string = 'ALL'
  ): Promise<{ data: Proposal[], lastDoc: any }> {
    return this.proposalService.getProposals(userRoles, userId, lastDoc, pageSize, filterStatus, filterFaculty);
  }

  async getExpiringProposals(daysThreshold: number = 30): Promise<Proposal[]> {
    return this.proposalService.getExpiringProposals(daysThreshold);
  }

  async getProposalById(id: string): Promise<Proposal | undefined> {
    return this.proposalService.getProposalById(id);
  }

  async createProposal(p: Partial<Proposal>): Promise<Proposal> {
    return this.proposalService.createProposal(this.currentUser, p);
  }

  async updateProposalCode(id: string, newCode: string) {
      return this.proposalService.updateProposalCode(this.currentUser, id, newCode);
  }

  async deleteProposal(id: string) {
      return this.proposalService.deleteProposal(this.currentUser, id);
  }

  async withdrawProposal(id: string, reason?: string) {
      return this.proposalService.withdrawProposal(this.currentUser, id, reason);
  }

  async requestRenewal(id: string) {
      return this.proposalService.requestRenewal(this.currentUser, id);
  }

  async updateProposal(id: string, updates: Partial<Proposal>) {
    return this.proposalService.updateProposal(this.currentUser, id, updates);
  }

  async advisorRejectProposal(proposalId: string, reason: string) {
     return this.proposalService.advisorRejectProposal(this.currentUser, proposalId, reason);
  }

  async assignReviewers(proposalId: string, reviewerIds: string[], proposalTitle: string) {
    return this.proposalService.assignReviewers(this.currentUser, proposalId, reviewerIds, proposalTitle);
  }

  async updateReviewerStatus(proposalId: string, reviewerId: string, status: ReviewerStatus, currentStates: Record<string, ReviewerStatus>) {
      return this.proposalService.updateReviewerStatus(this.currentUser, proposalId, reviewerId, status, currentStates);
  }

  async submitReview(proposalId: string, review: Review, currentReviews: Review[], proposalTitle: string) {
     return this.proposalService.submitReview(this.currentUser, proposalId, review, currentReviews, proposalTitle);
  }

  async submitRevision(proposalId: string, revisionLink: string, revisionNoteLink: string, currentHistory: RevisionLog[], currentCount: number, proposalTitle: string, adminFeedbackSnapshot?: string) {
     return this.proposalService.submitRevision(this.currentUser, proposalId, revisionLink, revisionNoteLink, currentHistory, currentCount, proposalTitle, adminFeedbackSnapshot);
  }

  async submitProgressReport(proposalId: string, report: Partial<ProgressReport>, currentReports: ProgressReport[], proposalTitle: string) {
      return this.proposalService.submitProgressReport(this.currentUser, proposalId, report, currentReports, proposalTitle);
  }

  async getReviewerWorkload(): Promise<any[]> {
    return this.proposalService.getReviewerWorkload();
  }

  async acknowledgeProgressReport(proposalId: string, reportId: string) {
    return this.proposalService.acknowledgeProgressReport(this.currentUser, proposalId, reportId);
  }

  async getAuditLogs(limitCount: number = 50, lastDoc: any = null): Promise<{ data: any[], lastDoc: any }> {
    return this.auditService.getAuditLogs(limitCount, lastDoc);
  }

  async getAllSurveys() {
    return this.userService.getAllSurveys();
  }

  async getUserSurveyStatus(userId: string) {
    return this.userService.getUserSurveyStatus(userId);
  }

  async submitSurvey(response: any) {
    return this.userService.submitSurvey(response);
  }

  // Helper to expose logActivity if needed by other components (though mostly internal)
  async logActivity(action: string, targetId: string, details: string) {
      await this.auditService.logActivity(this.currentUser, action, targetId, details);
  }
}

const db = new DatabaseService();
export { db };
export default db;
