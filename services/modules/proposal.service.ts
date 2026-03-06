import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  limit, 
  startAfter, 
  runTransaction,
  QueryConstraint 
} from 'firebase/firestore';
import { dbFirestore } from '../../firebaseConfig';
import { Proposal, ProposalStatus, Review, Role, User, RevisionLog, ProgressReport, ReviewerStatus, EmailTrigger } from '../../types';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

export class ProposalService {
  private auditService: AuditService;
  private notificationService: NotificationService;
  private userService: UserService;

  constructor(auditService: AuditService, notificationService: NotificationService, userService: UserService) {
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.userService = userService;
  }

  private getFacultyCode(facultyName: string): string {
    if (facultyName?.includes('วิทยาศาสตร์')) return 'SCI';
    if (facultyName?.includes('ศิลปศาสตร์')) return 'ART';
    if (facultyName?.includes('ศึกษาศาสตร์')) return 'EDU';
    return 'GEN';
  }

  private async notifyAdmins(message: string, link: string) {
      const admins = await this.userService.getUsersByRole(Role.ADMIN);
      for (const admin of admins) {
          await this.notificationService.sendNotification(
              admin.id, 
              message, 
              link,
              EmailTrigger.GENERAL_NOTIFICATION,
              { message, link }
          );
      }
  }

  async getProposals(
      userRoles: Role[], 
      userId: string, 
      lastDoc: any = null, 
      pageSize: number = 20,
      filterStatus: string = 'ALL',
      filterFaculty: string = 'ALL'
  ): Promise<{ data: Proposal[], lastDoc: any }> {
    const proposalsRef = collection(dbFirestore, 'proposals');
    const results = new Map<string, Proposal>();

    const buildConstraints = (): QueryConstraint[] => {
        const constraints: QueryConstraint[] = [];
        if (filterStatus !== 'ALL') constraints.push(where('status', '==', filterStatus));
        if (filterFaculty !== 'ALL') constraints.push(where('faculty', '==', filterFaculty));
        
        if (lastDoc) constraints.push(startAfter(lastDoc));
        constraints.push(limit(pageSize));
        
        return constraints;
    };

    const commonConstraints = buildConstraints();
    
    const processSnapshot = (snap: any) => {
        snap.docs.forEach((doc: any) => {
            const p = { id: doc.id, ...(doc.data() as any) } as Proposal;
            if (!(p as any).isDeleted) {
                results.set(doc.id, p);
            }
        });
    };

    if (userRoles.includes(Role.ADMIN)) {
        const q = query(proposalsRef, ...commonConstraints);
        const snapshot = await getDocs(q);
        processSnapshot(snapshot);
        return { data: Array.from(results.values()), lastDoc: snapshot.docs[snapshot.docs.length - 1] };
    }

    const queries = [];

    queries.push(getDocs(query(proposalsRef, where('researcherId', '==', userId), ...commonConstraints)));

    if (userRoles.includes(Role.ADVISOR) || userRoles.includes(Role.REVIEWER)) {
        queries.push(getDocs(query(proposalsRef, where('advisorId', '==', userId), ...commonConstraints)));
    }

    if (userRoles.includes(Role.REVIEWER)) {
        queries.push(getDocs(query(proposalsRef, where('reviewers', 'array-contains', userId), ...commonConstraints)));
    }

    if (queries.length > 0) {
        const snapshots = await Promise.all(queries);
        snapshots.forEach(processSnapshot);
    }

    const data = Array.from(results.values());
    
    data.sort((a,b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
    
    return { data, lastDoc: null }; 
  }

  async getExpiringProposals(daysThreshold: number = 30): Promise<Proposal[]> {
    const proposalsRef = collection(dbFirestore, 'proposals');
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + daysThreshold);
    
    const todayStr = now.toISOString().split('T')[0];
    const futureStr = future.toISOString().split('T')[0];

    const q = query(
        proposalsRef,
        where('approvalDetail.expiryDate', '>=', todayStr),
        where('approvalDetail.expiryDate', '<=', futureStr)
    );
    
    const snapshot = await getDocs(q);
    const proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
    
    return proposals.filter(p => 
        !p.isDeleted && (
            p.status === ProposalStatus.APPROVED || 
            p.status === ProposalStatus.WAITING_CERT
        )
    );
  }

  async getProposalById(id: string): Promise<Proposal | undefined> {
    if (!id) return undefined;
    const docRef = doc(dbFirestore, 'proposals', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const p = { id: docSnap.id, ...(docSnap.data() as any) } as Proposal;
      if((p as any).isDeleted) return undefined;
      return p;
    }
    return undefined;
  }

  async createProposal(currentUser: User | null, p: Partial<Proposal>): Promise<Proposal> {
    return await runTransaction(dbFirestore, async (transaction) => {
        const now = new Date();
        const thYear = now.getFullYear() + 543;

        const facCode = this.getFacultyCode(p.faculty || '');
        
        const counterId = `prop_${thYear}_${facCode}`;
        const counterRef = doc(dbFirestore, 'counters', counterId);
        const counterDoc = await transaction.get(counterRef);

        let newCount = 1;
        if (counterDoc.exists()) {
            newCount = counterDoc.data().count + 1;
        }

        const code = `TNSU-${facCode} ${thYear}-${newCount.toString().padStart(3, '0')}`;

        const newProposalRef = doc(collection(dbFirestore, 'proposals'));
        
        const newProposalData: any = {
            ...p,
            code,
            isDeleted: false,
            revisionCount: 0,
            revisionHistory: [],
            reviews: [],
            reviewers: [],
            reviewerStates: {}, 
            progressReports: [],
            status: p.advisorId ? ProposalStatus.PENDING_ADVISOR : ProposalStatus.PENDING_ADMIN_CHECK,
            submissionDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedDate: new Date().toISOString().split('T')[0],
        };

        Object.keys(newProposalData).forEach(key => {
            if (newProposalData[key] === undefined) {
                delete newProposalData[key];
            }
        });

        transaction.set(counterRef, { count: newCount }, { merge: true });
        transaction.set(newProposalRef, newProposalData);

        return { id: newProposalRef.id, ...(newProposalData as any) };
    }).then(async (proposal) => {
        await this.auditService.logActivity(currentUser, 'CREATE_PROPOSAL', proposal.id, `Created proposal: ${proposal.code}`);
        if (p.advisorId) {
            await this.notificationService.sendNotification(
                p.advisorId, 
                `มีคำขอใหม่จากนักศึกษา: ${p.titleTh}`, 
                `proposal?id=${proposal.id}`,
                EmailTrigger.PROPOSAL_SUBMITTED,
                { title: p.titleTh || '', researcher: p.researcherName || '', link: `proposal?id=${proposal.id}` }
            );
        } else {
            await this.notifyAdmins(
                `มีคำขอใหม่: ${p.titleTh}`, 
                `proposal?id=${proposal.id}`
            );
        }
        return proposal;
    });
  }

  async updateProposalCode(currentUser: User | null, id: string, newCode: string) {
      await this.updateProposal(currentUser, id, { code: newCode });
      await this.auditService.logActivity(currentUser, 'UPDATE_PROPOSAL_CODE', id, `Updated code to: ${newCode}`);
  }

  async deleteProposal(currentUser: User | null, id: string) {
      const proposalRef = doc(dbFirestore, 'proposals', id);
      await updateDoc(proposalRef, {
          isDeleted: true,
          status: 'DELETED',
          updatedAt: new Date().toISOString()
      });
      await this.auditService.logActivity(currentUser, 'DELETE_PROPOSAL', id, 'Proposal soft deleted by user');
  }

  async withdrawProposal(currentUser: User | null, id: string, reason?: string) {
      await this.updateProposal(currentUser, id, { status: ProposalStatus.WITHDRAWN });
      await this.auditService.logActivity(currentUser, 'WITHDRAW_PROPOSAL', id, `Reason: ${reason || 'N/A'}`);
      await this.notifyAdmins(`โครงการถูกถอนโดยผู้วิจัย: ${id}`, `proposal?id=${id}`);
  }

  async requestRenewal(currentUser: User | null, id: string) {
      await this.updateProposal(currentUser, id, { status: ProposalStatus.RENEWAL_REQUESTED });
      await this.auditService.logActivity(currentUser, 'REQUEST_RENEWAL', id, 'Researcher requested certificate renewal');
      await this.notifyAdmins(`มีการขอยื่นต่ออายุใบรับรอง: ${id}`, `proposal?id=${id}`);
  }

  async updateProposal(currentUser: User | null, id: string, updates: Partial<Proposal>) {
    const proposalRef = doc(dbFirestore, 'proposals', id);

    await runTransaction(dbFirestore, async (transaction) => {
        const currentDoc = await transaction.get(proposalRef);
        if (!currentDoc.exists()) throw new Error("Document does not exist!");
        
        const currentData = currentDoc.data() as Proposal;
        const finalUpdates = { ...updates, updatedDate: new Date().toISOString().split('T')[0] };

        if ((updates.status === ProposalStatus.APPROVED || updates.status === ProposalStatus.WAITING_CERT)) {
            const existingCert = currentData.approvalDetail?.certificateNumber || currentData.certNumber;

            if (!existingCert && !updates.approvalDetail?.certificateNumber) {
                const year = new Date().getFullYear() + 543;
                const facCode = this.getFacultyCode(currentData.faculty);
                const counterRef = doc(dbFirestore, 'counters', `CERT_${year}_${facCode}`);
                const counterDoc = await transaction.get(counterRef);

                let newCount = 1;
                if (counterDoc.exists()) {
                    newCount = counterDoc.data().count + 1;
                }

                const certNum = `${facCode} ${newCount.toString().padStart(3, '0')}/${year}`;
                const today = new Date();
                const nextYear = new Date(today);
                nextYear.setFullYear(today.getFullYear() + 1);

                finalUpdates.approvalDetail = {
                     certificateNumber: certNum,
                     issuanceDate: today.toISOString().split('T')[0],
                     expiryDate: nextYear.toISOString().split('T')[0]
                };
                finalUpdates.certNumber = certNum;
                finalUpdates.approvalDate = today.toISOString().split('T')[0];

                transaction.set(counterRef, { count: newCount }, { merge: true });
            }
        }

        Object.keys(finalUpdates).forEach(key => {
            if ((finalUpdates as any)[key] === undefined) {
                delete (finalUpdates as any)[key];
            }
        });

        transaction.update(proposalRef, finalUpdates);
    }).then(async () => {
        await this.auditService.logActivity(currentUser, 'UPDATE_PROPOSAL', id, `Updated fields: ${Object.keys(updates).join(', ')}`);
    });
    
    const currentP = await this.getProposalById(id);
    if (currentP && updates.status && updates.status !== currentP.status) {
         const msg = `สถานะโครงการเปลี่ยนเป็น: ${updates.status}`;
         if (currentP.researcherId) {
             await this.notificationService.sendNotification(
                 currentP.researcherId, 
                 msg, 
                 `proposal?id=${id}`,
                 EmailTrigger.PROPOSAL_STATUS_CHANGE,
                 { 
                     name: currentP.researcherName, 
                     title: currentP.titleTh, 
                     status: updates.status, 
                     message: updates.adminFeedback || 'กรุณาตรวจสอบรายละเอียดในระบบ',
                     link: `proposal?id=${id}`
                 }
             );
         }
    }
  }

  async advisorRejectProposal(currentUser: User | null, proposalId: string, reason: string) {
     const proposal = await this.getProposalById(proposalId);
     if(!proposal) return;

     await this.updateProposal(currentUser, proposalId, {
        status: ProposalStatus.ADMIN_REJECTED, 
        adminFeedback: `[ความเห็นที่ปรึกษา]: ${reason}` 
     });

     await this.notificationService.sendNotification(proposal.researcherId, `ที่ปรึกษาได้ส่งคืนโครงการแก้ไข: ${proposal.titleTh}`, `proposal?id=${proposalId}`);
     await this.auditService.logActivity(currentUser, 'ADVISOR_REJECT', proposalId, 'Advisor sent back proposal for revision');
  }

  async assignReviewers(currentUser: User | null, proposalId: string, reviewerIds: string[], proposalTitle: string) {
    const reviewerStates: Record<string, ReviewerStatus> = {};
    reviewerIds.forEach(id => reviewerStates[id] = ReviewerStatus.PENDING);

    await this.updateProposal(currentUser, proposalId, {
      reviewers: reviewerIds,
      reviewerStates: reviewerStates,
      status: ProposalStatus.IN_REVIEW
    });
    for (const rid of reviewerIds) {
       const reviewer = await this.userService.getUserById(rid);
       await this.notificationService.sendNotification(
           rid, 
           `คุณได้รับมอบหมายให้พิจารณาโครงการ (กรุณากดตอบรับ): ${proposalTitle}`, 
           `proposal?id=${proposalId}`,
           EmailTrigger.REVIEW_ASSIGNED,
           { name: reviewer?.name || 'Reviewer', title: proposalTitle, link: `proposal?id=${proposalId}` }
       );
    }
  }

  async updateReviewerStatus(currentUser: User | null, proposalId: string, reviewerId: string, status: ReviewerStatus, currentStates: Record<string, ReviewerStatus>) {
      const newStates = { ...currentStates, [reviewerId]: status };
      await this.updateProposal(currentUser, proposalId, { reviewerStates: newStates });
      
      if (status === ReviewerStatus.DECLINED) {
          await this.notifyAdmins(`กรรมการปฏิเสธการพิจารณา: ${proposalId}`, `proposal?id=${proposalId}`);
      }
  }

  async submitReview(currentUser: User | null, proposalId: string, review: Review, currentReviews: Review[], proposalTitle: string) {
     const existingIndex = currentReviews.findIndex(r => r.reviewerId === review.reviewerId);
     let newReviews = [...currentReviews];
     if (existingIndex >= 0) {
        newReviews[existingIndex] = review;
     } else {
        newReviews.push(review);
     }
     
     await this.updateProposal(currentUser, proposalId, { reviews: newReviews });
     await this.notifyAdmins(`กรรมการ ${review.reviewerName} ส่งผลพิจารณา: ${proposalTitle}`, `proposal?id=${proposalId}`);
  }

  async submitRevision(currentUser: User | null, proposalId: string, revisionLink: string, revisionNoteLink: string, currentHistory: RevisionLog[], currentCount: number, proposalTitle: string, adminFeedbackSnapshot?: string) {
     const newCount = currentCount + 1;
     const log: RevisionLog = {
        revisionCount: newCount,
        submittedDate: new Date().toISOString(),
        fileLink: revisionLink,
        noteLink: revisionNoteLink,
        adminFeedbackSnapshot: adminFeedbackSnapshot
     };
     
     const newHistory = [...currentHistory, log];
     await this.updateProposal(currentUser, proposalId, {
        status: ProposalStatus.PENDING_ADMIN_CHECK,
        revisionLink: revisionLink,
        revisionNoteLink: revisionNoteLink,
        revisionCount: newCount,
        revisionHistory: newHistory
     });

     await this.notifyAdmins(`มีการส่งแก้ไขโครงการ: ${proposalTitle} (ครั้งที่ ${newCount})`, `proposal?id=${proposalId}`);
  }

  async getReviewerWorkload(): Promise<any[]> {
    const reviewers = await this.userService.getUsersByRole(Role.REVIEWER);
    const workload = reviewers.map(r => ({
        reviewerId: r.id,
        reviewerName: r.name,
        activeCount: 0,
        completedCount: 0
    }));
    
    const proposalsRef = collection(dbFirestore, 'proposals');
    const q = query(proposalsRef, where('status', '!=', ProposalStatus.DRAFT));
    const snap = await getDocs(q);
    
    snap.docs.forEach(doc => {
        const p = doc.data() as Proposal;
        if (p.reviewers && Array.isArray(p.reviewers)) {
            p.reviewers.forEach(rid => {
                const w = workload.find(x => x.reviewerId === rid);
                if (w) {
                    const hasReviewed = p.reviews?.some(r => r.reviewerId === rid);
                    if (hasReviewed) {
                        w.completedCount++;
                    } else {
                        w.activeCount++;
                    }
                }
            });
        }
    });
    
    return workload;
  }

  async acknowledgeProgressReport(currentUser: User | null, proposalId: string, reportId: string) {
      const p = await this.getProposalById(proposalId);
      if (!p) return;
      
      const newReports = p.progressReports.map(r => {
          if (r.id === reportId) {
              return { 
                  ...r, 
                  status: 'ACKNOWLEDGED' as const, 
                  acknowledgedDate: new Date().toISOString(),
                  acknowledgedBy: currentUser?.name || 'Admin'
              };
          }
          return r;
      });
      
      await this.updateProposal(currentUser, proposalId, { progressReports: newReports });
      await this.notificationService.sendNotification(
          p.researcherId,
          `รายงานความก้าวหน้าของคุณได้รับการรับทราบแล้ว: ${p.titleTh}`,
          `proposal?id=${proposalId}`,
          EmailTrigger.GENERAL_NOTIFICATION
      );
  }

  async submitProgressReport(currentUser: User | null, proposalId: string, report: Partial<ProgressReport>, currentReports: ProgressReport[], proposalTitle: string) {
      const newReport: ProgressReport = {
          id: `rpt-${Date.now()}`,
          submittedDate: new Date().toISOString().split('T')[0],
          type: report.type!,
          fileLink: report.fileLink!,
          status: 'PENDING'
      };
      
      const newReports = [...currentReports, newReport];
      await this.updateProposal(currentUser, proposalId, { progressReports: newReports });
      await this.notifyAdmins(`มีการส่งรายงานความก้าวหน้า: ${proposalTitle}`, `proposal?id=${proposalId}`);
  }
}
