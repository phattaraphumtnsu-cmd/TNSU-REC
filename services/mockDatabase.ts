import { Proposal, ProposalStatus, Review, ReviewType, Role, User, UserType, Vote, ProgressReport, Notification, RevisionLog } from '../types';

// Initial Mock Data
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin Staff', email: 'admin_rec@tnsu.ac.th', role: Role.ADMIN, password: 'admin_rec1234' },
  { id: 'u2', name: 'Dr. Somchai Reviewer', email: 'rev1@tnsu.ac.th', role: Role.REVIEWER, password: 'rec1234', campus: 'เชียงใหม่' },
  { id: 'u3', name: 'Ajarn Somsri Reviewer', email: 'rev2@tnsu.ac.th', role: Role.REVIEWER, password: 'rec1234', campus: 'กรุงเทพ' },
  { id: 'u4', name: 'Dr. Advisor One', email: 'adv1@tnsu.ac.th', role: Role.ADVISOR, password: 'password', campus: 'เชียงใหม่', faculty: 'คณะศึกษาศาสตร์' },
  { id: 'u5', name: 'Student A', email: 'stu1@tnsu.ac.th', role: Role.RESEARCHER, type: UserType.STUDENT, password: 'password', campus: 'เชียงใหม่', faculty: 'คณะศึกษาศาสตร์' },
  { id: 'u6', name: 'Ajarn Researcher', email: 'res1@tnsu.ac.th', role: Role.RESEARCHER, type: UserType.STAFF, password: 'password', campus: 'ชลบุรี', faculty: 'คณะวิทยาศาสตร์การกีฬาและสุขภาพ' },
];

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'p1',
    code: 'TNSU-EDU 001/2568',
    titleTh: 'การศึกษาผลของการฝึกตาราง 9 ช่อง',
    titleEn: 'Effect of 9 Square Training',
    researcherId: 'u5',
    researcherName: 'Student A',
    advisorId: 'u4',
    advisorName: 'Dr. Advisor One',
    type: ReviewType.EXPEDITED,
    campus: 'เชียงใหม่',
    faculty: 'คณะศึกษาศาสตร์',
    fileLink: 'http://drive.google.com/doc1',
    status: ProposalStatus.IN_REVIEW,
    submissionDate: '2025-01-10',
    updatedDate: '2025-01-12',
    reviewers: ['u2', 'u3'],
    reviews: [],
    revisionCount: 0,
    revisionHistory: [],
    progressReports: []
  },
  {
    id: 'p2',
    titleTh: 'การพัฒนาสมรรถภาพทางกาย',
    titleEn: 'Physical Fitness Development',
    researcherId: 'u6',
    researcherName: 'Ajarn Researcher',
    type: ReviewType.EXEMPTION,
    campus: 'ชลบุรี',
    faculty: 'คณะวิทยาศาสตร์การกีฬาและสุขภาพ',
    fileLink: 'http://drive.google.com/doc2',
    paymentSlipLink: 'http://drive.google.com/slip1',
    status: ProposalStatus.PENDING_ADMIN_CHECK,
    submissionDate: '2025-01-15',
    updatedDate: '2025-01-15',
    reviewers: [],
    reviews: [],
    revisionCount: 0,
    revisionHistory: [],
    progressReports: []
  }
];

class MockDatabase {
  users: User[] = [...INITIAL_USERS];
  proposals: Proposal[] = [...INITIAL_PROPOSALS];
  notifications: Notification[] = []; // In-memory notifications
  currentUser: User | null = null;

  // Auth
  login(email: string, pass: string): User | undefined {
    const user = this.users.find(u => u.email === email && u.password === pass);
    if (user) this.currentUser = user;
    return user;
  }

  logout() {
    this.currentUser = null;
  }

  register(user: User) {
    this.users.push({ ...user, id: `u${this.users.length + 1}` });
  }

  deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
  }

  // Notifications
  sendNotification(userId: string, message: string, link?: string) {
    this.notifications.unshift({
      id: `n-${Date.now()}-${Math.random()}`,
      userId,
      message,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  getNotifications(userId: string) {
    return this.notifications.filter(n => n.userId === userId);
  }

  markAsRead(userId: string) {
    this.notifications = this.notifications.map(n => 
      n.userId === userId ? { ...n, isRead: true } : n
    );
  }

  // Proposals
  getProposals(role: Role, userId: string): Proposal[] {
    if (role === Role.ADMIN) return this.proposals;
    if (role === Role.REVIEWER) return this.proposals.filter(p => p.reviewers.includes(userId));
    if (role === Role.ADVISOR) return this.proposals.filter(p => p.advisorId === userId);
    if (role === Role.RESEARCHER) return this.proposals.filter(p => p.researcherId === userId);
    return [];
  }

  getProposalById(id: string): Proposal | undefined {
    return this.proposals.find(p => p.id === id);
  }

  createProposal(p: Partial<Proposal>) {
    const newProposal: Proposal = {
      id: `p${this.proposals.length + 1}`,
      revisionCount: 0,
      revisionHistory: [],
      reviews: [],
      reviewers: [],
      progressReports: [],
      status: p.advisorId ? ProposalStatus.PENDING_ADVISOR : ProposalStatus.PENDING_ADMIN_CHECK,
      submissionDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      ...p as any
    };
    
    // Generate temporary code
    const year = new Date().getFullYear() + 543;
    const facCode = p.faculty?.includes('วิทยาศาสตร์') ? 'SCI' : p.faculty?.includes('ศิลปศาสตร์') ? 'ART' : 'EDU';
    newProposal.code = `TNSU-${facCode} ${String(this.proposals.length + 1).padStart(3, '0')}/${year}`;

    this.proposals.push(newProposal);

    // Notify Advisor if exists
    if (newProposal.advisorId) {
      this.sendNotification(newProposal.advisorId, `มีคำขอใหม่จากนักศึกษา: ${newProposal.titleTh}`, `proposal?id=${newProposal.id}`);
    } else {
      // Notify all admins
      this.users.filter(u => u.role === Role.ADMIN).forEach(admin => {
        this.sendNotification(admin.id, `มีคำขอใหม่: ${newProposal.titleTh}`, `proposal?id=${newProposal.id}`);
      });
    }

    return newProposal;
  }

  updateProposal(id: string, updates: Partial<Proposal>) {
    const index = this.proposals.findIndex(p => p.id === id);
    if (index !== -1) {
      const oldStatus = this.proposals[index].status;
      const currentProposal = this.proposals[index];
      
      // Auto-populate ApprovalDetail if status becomes APPROVED or WAITING_CERT
      if (
        (updates.status === ProposalStatus.APPROVED || updates.status === ProposalStatus.WAITING_CERT) && 
        !updates.approvalDetail && 
        !currentProposal.approvalDetail
      ) {
         const today = new Date();
         const nextYear = new Date(today);
         nextYear.setFullYear(today.getFullYear() + 1);
         
         const certNum = currentProposal.code ? currentProposal.code.replace('TNSU-', '') : `REC-${Date.now().toString().slice(-6)}`;
         
         updates.approvalDetail = {
             certificateNumber: certNum,
             issuanceDate: today.toISOString().split('T')[0],
             expiryDate: nextYear.toISOString().split('T')[0]
         };

         // Maintain legacy fields
         updates.certNumber = certNum;
         updates.approvalDate = today.toISOString().split('T')[0];
      }

      this.proposals[index] = { ...this.proposals[index], ...updates, updatedDate: new Date().toISOString().split('T')[0] };
      const updatedP = this.proposals[index];

      // Notify Researcher on Status Change
      if (oldStatus !== updatedP.status && updatedP.researcherId) {
        this.sendNotification(updatedP.researcherId, `สถานะโครงการเปลี่ยนเป็น: ${updatedP.status}`, `proposal?id=${updatedP.id}`);
      }
    }
  }

  submitRevision(proposalId: string, revisionLink: string, revisionNoteLink: string) {
    const proposal = this.getProposalById(proposalId);
    if (!proposal) return;

    const newRevisionCount = (proposal.revisionCount || 0) + 1;
    const log: RevisionLog = {
      revisionCount: newRevisionCount,
      submittedDate: new Date().toISOString().split('T')[0],
      fileLink: revisionLink,
      noteLink: revisionNoteLink,
      adminFeedbackSnapshot: proposal.consolidatedFeedback
    };

    const newHistory = [...(proposal.revisionHistory || []), log];

    this.updateProposal(proposalId, {
      status: ProposalStatus.PENDING_ADMIN_CHECK,
      revisionLink: revisionLink,
      revisionNoteLink: revisionNoteLink,
      revisionCount: newRevisionCount,
      revisionHistory: newHistory
    });

    // Notify Admins
    this.users.filter(u => u.role === Role.ADMIN).forEach(admin => {
      this.sendNotification(admin.id, `มีการส่งแก้ไขโครงการ: ${proposal.titleTh} (ครั้งที่ ${newRevisionCount})`, `proposal?id=${proposal.id}`);
    });
  }

  // Admin Actions
  assignReviewers(proposalId: string, reviewerIds: string[]) {
    this.updateProposal(proposalId, { 
      reviewers: reviewerIds, 
      status: ProposalStatus.IN_REVIEW 
    });
    // Notify Reviewers
    reviewerIds.forEach(rid => {
       const proposal = this.getProposalById(proposalId);
       this.sendNotification(rid, `คุณได้รับมอบหมายให้พิจารณาโครงการ: ${proposal?.titleTh}`, `proposal?id=${proposalId}`);
    });
  }

  // Reviewer Actions
  submitReview(proposalId: string, review: Review) {
    const proposal = this.getProposalById(proposalId);
    if (!proposal) return;

    const existingReviewIndex = proposal.reviews.findIndex(r => r.reviewerId === review.reviewerId);
    let newReviews = [...proposal.reviews];
    if (existingReviewIndex >= 0) {
      newReviews[existingReviewIndex] = review;
    } else {
      newReviews.push(review);
    }
    this.updateProposal(proposalId, { reviews: newReviews });

    // Notify Admin
    this.users.filter(u => u.role === Role.ADMIN).forEach(admin => {
        this.sendNotification(admin.id, `กรรมการ ${review.reviewerName} ส่งผลพิจารณาโครงการ: ${proposal.titleTh}`, `proposal?id=${proposal.id}`);
    });
  }

  // Post Approval Actions
  submitProgressReport(proposalId: string, report: Partial<ProgressReport>) {
     const proposal = this.getProposalById(proposalId);
     if (!proposal) return;
     
     const newReport: ProgressReport = {
        id: `rpt-${Date.now()}`,
        submittedDate: new Date().toISOString().split('T')[0],
        type: report.type!,
        fileLink: report.fileLink!,
        description: report.description
     };
     
     const updatedReports = [...(proposal.progressReports || []), newReport];
     this.updateProposal(proposalId, { progressReports: updatedReports });

     // Notify Admin
     this.users.filter(u => u.role === Role.ADMIN).forEach(admin => {
        this.sendNotification(admin.id, `มีรายงานความก้าวหน้าใหม่: ${proposal.titleTh}`, `proposal?id=${proposal.id}`);
     });
  }

  acknowledgeProgressReport(proposalId: string, reportId: string, adminName: string) {
      const proposal = this.getProposalById(proposalId);
      if (!proposal) return;

      const updatedReports = proposal.progressReports.map(r => {
         if (r.id === reportId) {
            return {
               ...r,
               acknowledgedDate: new Date().toISOString().split('T')[0],
               acknowledgedBy: adminName
            };
         }
         return r;
      });
      this.updateProposal(proposalId, { progressReports: updatedReports });
  }

  // Utility
  getUsersByRole(role: Role) {
    return this.users.filter(u => u.role === role);
  }
}

export const db = new MockDatabase();