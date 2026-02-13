
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch, 
  orderBy, 
  limit, 
  startAfter, 
  runTransaction,
  QueryConstraint
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  updatePassword, 
  User as FirebaseUser, 
  getAuth 
} from 'firebase/auth';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { auth, dbFirestore, firebaseConfig } from '../firebaseConfig';
import { Proposal, ProposalStatus, Review, Role, User, Notification, ProgressReport, RevisionLog, AuditLog, SurveyResponse, ReviewerStatus } from '../types';

class DatabaseService {
  currentUser: User | null = null;

  // --- Auth Methods ---

  async login(email: string, pass: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    // Sync to get data and handle multi-role migration
    const user = await this.syncCurrentUser(fbUser);
    
    if (user) {
        await this.logActivity('LOGIN', fbUser.uid, 'User logged in');
        return user;
    } else {
        throw new Error('ไม่พบข้อมูลผู้ใช้งานในระบบฐานข้อมูล');
    }
  }

  async logout() {
    if (this.currentUser) {
       await this.logActivity('LOGOUT', this.currentUser.id, 'User logged out');
    }
    await signOut(auth);
    this.currentUser = null;
  }

  async syncCurrentUser(fbUser: FirebaseUser | null): Promise<User | null> {
    if (!fbUser) {
      this.currentUser = null;
      return null;
    }
    try {
      const userDocRef = doc(dbFirestore, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        // Multi-role Migration: If 'roles' doesn't exist but 'role' does, create 'roles' array
        if (!userData.roles && userData.role) {
            userData.roles = [userData.role];
        }
        // Fallback safety
        if (!userData.roles) userData.roles = [];

        if ((userData as any).isDeleted) {
            await signOut(auth);
            return null;
        }
        this.currentUser = { ...userData, id: fbUser.uid };
        return this.currentUser;
      }
    } catch (e) {
      console.error("Error syncing user:", e);
    }
    return null;
  }

  async register(user: Omit<User, 'id'>, password: string): Promise<User> {
    const isSecondaryCreation = !!this.currentUser;
    let targetAuth = auth;
    let secondaryApp: FirebaseApp | undefined = undefined;

    if (isSecondaryCreation) {
        secondaryApp = initializeApp(firebaseConfig, `SecondaryApp-${Date.now()}`);
        targetAuth = getAuth(secondaryApp);
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(targetAuth, user.email, password);
        const uid = userCredential.user.uid;
        
        // Ensure roles array is populated
        const initialRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
        
        const newUser: User = { ...user, id: uid, roles: initialRoles };
        const { password: _, ...userToSave } = newUser as any; 
        
        // REMOVE UNDEFINED FIELDS
        Object.keys(userToSave).forEach(key => {
            if (userToSave[key] === undefined) {
                delete userToSave[key];
            }
        });
        
        await setDoc(doc(dbFirestore, 'users', uid), {
            ...userToSave,
            isDeleted: false,
            createdAt: new Date().toISOString()
        });
        
        const auditRef = collection(dbFirestore, 'audit_logs');
        await addDoc(auditRef, {
            action: 'REGISTER',
            actorId: isSecondaryCreation ? this.currentUser?.id : uid,
            actorName: isSecondaryCreation ? this.currentUser?.name : user.name,
            actorRole: isSecondaryCreation ? this.currentUser?.roles.join(',') : user.roles.join(','),
            targetId: uid,
            details: `Registered new user: ${user.name} (${user.roles.join(', ')})`,
            timestamp: new Date().toISOString()
        });
        
        if (!isSecondaryCreation) {
            this.currentUser = newUser;
        } else if (secondaryApp) {
             await signOut(targetAuth);
             await deleteApp(secondaryApp);
        }

        return newUser;
    } catch (e: any) {
        if (secondaryApp) await deleteApp(secondaryApp);
        throw e;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (e) {
      console.error("Reset password failed:", e);
      return false;
    }
  }
  
  async changePassword(newPassword: string): Promise<void> {
      if (!auth.currentUser) throw new Error("No user logged in");
      await updatePassword(auth.currentUser, newPassword);
  }

  async checkAnyAdminExists(): Promise<boolean> {
    try {
      const q = query(collection(dbFirestore, 'users'), where('roles', 'array-contains', Role.ADMIN), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (e) {
      return false;
    }
  }

  // --- User Management ---

  async getUsers(): Promise<User[]> {
    const q = query(collection(dbFirestore, 'users'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => {
            const data = doc.data() as any;
            if (!data.roles && data.role) data.roles = [data.role];
            return { id: doc.id, ...data } as User;
        })
        .filter((u: any) => !u.isDeleted);
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    try {
        const q = query(collection(dbFirestore, 'users'));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data() as any;
                const roles = data.roles || (data.role ? [data.role] : []);
                return { id: doc.id, ...data, roles } as User;
            })
            .filter((u: any) => !u.isDeleted && u.roles.includes(role));
            
    } catch (e) {
        console.error("Error fetching users by role", e);
        return [];
    }
  }

  async updateUser(id: string, updates: Partial<User>) {
    const userRef = doc(dbFirestore, 'users', id);
    
    const sanitizedUpdates = { ...updates };
    Object.keys(sanitizedUpdates).forEach(key => {
        if ((sanitizedUpdates as any)[key] === undefined) {
            delete (sanitizedUpdates as any)[key];
        }
    });

    await updateDoc(userRef, sanitizedUpdates);
    
    if (this.currentUser && this.currentUser.id === id) {
        this.currentUser = { ...this.currentUser, ...sanitizedUpdates };
    }
    
    await this.logActivity('UPDATE_USER', id, `Updated fields: ${Object.keys(updates).join(', ')}`);
  }

  async deleteUser(id: string) {
    const userRef = doc(dbFirestore, 'users', id);
    await updateDoc(userRef, {
        isDeleted: true,
        roles: [],
        role: 'SUSPENDED',
        updatedAt: new Date().toISOString()
    });
    await this.logActivity('SUSPEND_USER', id, 'User account suspended (soft delete)');
  }

  // --- Proposals ---

  // Server-side Filtering Implemented Here
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

    // Helper to build common constraints
    const buildConstraints = (): QueryConstraint[] => {
        const constraints: QueryConstraint[] = [];
        if (filterStatus !== 'ALL') constraints.push(where('status', '==', filterStatus));
        if (filterFaculty !== 'ALL') constraints.push(where('faculty', '==', filterFaculty));
        
        // Sorting: If filtering by equality (status/faculty), Firestore sometimes recommends
        // sorting by that field first or strictly following composite index rules.
        // For simplicity and common use cases, we try to sort by updatedDate.
        // If index errors occur, the console will provide a link to create the specific index.
        constraints.push(orderBy('updatedDate', 'desc'));
        
        if (lastDoc) constraints.push(startAfter(lastDoc));
        constraints.push(limit(pageSize));
        
        return constraints;
    };

    const commonConstraints = buildConstraints();
    
    // Helper to process snapshots
    const processSnapshot = (snap: any) => {
        snap.docs.forEach((doc: any) => {
            const p = { id: doc.id, ...(doc.data() as any) } as Proposal;
            if (!(p as any).isDeleted) {
                results.set(doc.id, p);
            }
        });
    };

    // 1. ADMIN: Fetch All with filters
    if (userRoles.includes(Role.ADMIN)) {
        const q = query(proposalsRef, ...commonConstraints);
        const snapshot = await getDocs(q);
        processSnapshot(snapshot);
        return { data: Array.from(results.values()), lastDoc: snapshot.docs[snapshot.docs.length - 1] };
    }

    const queries = [];

    // 2. RESEARCHER: Where researcherId == userId + filters
    if (userRoles.includes(Role.RESEARCHER)) {
        queries.push(getDocs(query(proposalsRef, where('researcherId', '==', userId), ...commonConstraints)));
    }

    // 3. ADVISOR: Where advisorId == userId + filters
    if (userRoles.includes(Role.ADVISOR)) {
        queries.push(getDocs(query(proposalsRef, where('advisorId', '==', userId), ...commonConstraints)));
    }

    // 4. REVIEWER: Where reviewers array-contains userId + filters
    if (userRoles.includes(Role.REVIEWER)) {
        queries.push(getDocs(query(proposalsRef, where('reviewers', 'array-contains', userId), ...commonConstraints)));
    }

    // Execute relevant queries
    if (queries.length > 0) {
        const snapshots = await Promise.all(queries);
        snapshots.forEach(processSnapshot);
    }

    const data = Array.from(results.values());
    
    // Client-side Sort merge for mixed results (since we can't easily compound query different role-based fields)
    // Note: If using pagination with mixed roles, strict sorting across pages is complex. 
    // This sort ensures the *current page* is ordered.
    data.sort((a,b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
    
    // For pagination in mixed-role scenarios, strictly we rely on the lastDoc of the largest query
    // or return null to stop pagination if complexity is too high. 
    // Here we return null lastDoc if we merged multiple queries to prevent erratic pagination behavior,
    // otherwise (single role or admin) we return the last element.
    const effectiveLastDoc = queries.length > 1 ? null : (data.length > 0 ? (lastDoc ? null : 'end') : null); 
    // Note: Pagination logic for merged queries is non-trivial. 
    // For this implementation, we allow basic pagination for Admin (single query) 
    // but might limit it for multi-role users to ensuring they see top results first.
    
    return { data, lastDoc: null }; // Simplified for multi-role safety. Admin pagination works via logic block 1.
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

  private getFacultyCode(facultyName: string): string {
    if (facultyName?.includes('วิทยาศาสตร์')) return 'SCI';
    if (facultyName?.includes('ศิลปศาสตร์')) return 'ART';
    if (facultyName?.includes('ศึกษาศาสตร์')) return 'EDU';
    return 'GEN';
  }

  async createProposal(p: Partial<Proposal>): Promise<Proposal> {
    return await runTransaction(dbFirestore, async (transaction) => {
        const now = new Date();
        const thYear = now.getFullYear() + 543;
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateCode = `${thYear}${month}${day}`; 

        const facCode = this.getFacultyCode(p.faculty || '');
        
        const counterId = `prop_${dateCode}_${facCode}`;
        const counterRef = doc(dbFirestore, 'counters', counterId);
        const counterDoc = await transaction.get(counterRef);

        let newCount = 1;
        if (counterDoc.exists()) {
            newCount = counterDoc.data().count + 1;
        }

        const code = `TNSU-${facCode} ${dateCode}-${newCount.toString().padStart(3, '0')}`;

        const newProposalRef = doc(collection(dbFirestore, 'proposals'));
        
        const newProposalData: any = {
            ...p,
            code,
            isDeleted: false,
            revisionCount: 0,
            revisionHistory: [],
            reviews: [],
            reviewers: [],
            reviewerStates: {}, // Initialize reviewer states
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
        await this.logActivity('CREATE_PROPOSAL', proposal.id, `Created proposal: ${proposal.code}`);
        if (p.advisorId) {
            await this.sendNotification(p.advisorId, `มีคำขอใหม่จากนักศึกษา: ${p.titleTh}`, `proposal?id=${proposal.id}`);
        } else {
            await this.notifyAdmins(`มีคำขอใหม่: ${p.titleTh}`, `proposal?id=${proposal.id}`);
        }
        return proposal;
    });
  }

  async deleteProposal(id: string) {
      const proposalRef = doc(dbFirestore, 'proposals', id);
      await updateDoc(proposalRef, {
          isDeleted: true,
          status: 'DELETED',
          updatedAt: new Date().toISOString()
      });
      await this.logActivity('DELETE_PROPOSAL', id, 'Proposal soft deleted by user');
  }

  async withdrawProposal(id: string, reason?: string) {
      await this.updateProposal(id, { status: ProposalStatus.WITHDRAWN });
      await this.logActivity('WITHDRAW_PROPOSAL', id, `Reason: ${reason || 'N/A'}`);
      await this.notifyAdmins(`โครงการถูกถอนโดยผู้วิจัย: ${id}`, `proposal?id=${id}`);
  }

  async requestRenewal(id: string) {
      await this.updateProposal(id, { status: ProposalStatus.RENEWAL_REQUESTED });
      await this.logActivity('REQUEST_RENEWAL', id, 'Researcher requested certificate renewal');
      await this.notifyAdmins(`มีการขอยื่นต่ออายุใบรับรอง: ${id}`, `proposal?id=${id}`);
  }

  async updateProposal(id: string, updates: Partial<Proposal>) {
    const proposalRef = doc(dbFirestore, 'proposals', id);

    await runTransaction(dbFirestore, async (transaction) => {
        const currentDoc = await transaction.get(proposalRef);
        if (!currentDoc.exists()) throw new Error("Document does not exist!");
        
        const currentData = currentDoc.data() as Proposal;
        const finalUpdates = { ...updates, updatedDate: new Date().toISOString().split('T')[0] };

        // Auto-generate Certificate Number ONLY if explicitly approved and number not set
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

                // Update: Cert format changed to [FAC] [NUM]/[YEAR] (No TNSU- prefix)
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
        await this.logActivity('UPDATE_PROPOSAL', id, `Updated fields: ${Object.keys(updates).join(', ')}`);
    });
    
    const currentP = await this.getProposalById(id);
    if (currentP && updates.status && updates.status !== currentP.status) {
         const msg = `สถานะโครงการเปลี่ยนเป็น: ${updates.status}`;
         if (currentP.researcherId) {
             await this.sendNotification(currentP.researcherId, msg, `proposal?id=${id}`);
         }
    }
  }

  async advisorRejectProposal(proposalId: string, reason: string) {
     const proposal = await this.getProposalById(proposalId);
     if(!proposal) return;

     await this.updateProposal(proposalId, {
        status: ProposalStatus.ADMIN_REJECTED, // Reusing this status as 'Sent back to Researcher'
        adminFeedback: `[ความเห็นที่ปรึกษา]: ${reason}` 
     });

     await this.sendNotification(proposal.researcherId, `ที่ปรึกษาได้ส่งคืนโครงการแก้ไข: ${proposal.titleTh}`, `proposal?id=${proposalId}`);
     await this.logActivity('ADVISOR_REJECT', proposalId, 'Advisor sent back proposal for revision');
  }

  async assignReviewers(proposalId: string, reviewerIds: string[], proposalTitle: string) {
    // Initialize Reviewer States as PENDING
    const reviewerStates: Record<string, ReviewerStatus> = {};
    reviewerIds.forEach(id => reviewerStates[id] = ReviewerStatus.PENDING);

    await this.updateProposal(proposalId, {
      reviewers: reviewerIds,
      reviewerStates: reviewerStates,
      status: ProposalStatus.IN_REVIEW
    });
    for (const rid of reviewerIds) {
       await this.sendNotification(rid, `คุณได้รับมอบหมายให้พิจารณาโครงการ (กรุณากดตอบรับ): ${proposalTitle}`, `proposal?id=${proposalId}`);
    }
  }

  async updateReviewerStatus(proposalId: string, reviewerId: string, status: ReviewerStatus, currentStates: Record<string, ReviewerStatus>) {
      const newStates = { ...currentStates, [reviewerId]: status };
      await this.updateProposal(proposalId, { reviewerStates: newStates });
      
      // If declined, notify admin
      if (status === ReviewerStatus.DECLINED) {
          await this.notifyAdmins(`กรรมการปฏิเสธการพิจารณา: ${proposalId}`, `proposal?id=${proposalId}`);
      }
  }

  async submitReview(proposalId: string, review: Review, currentReviews: Review[], proposalTitle: string) {
     const existingIndex = currentReviews.findIndex(r => r.reviewerId === review.reviewerId);
     let newReviews = [...currentReviews];
     if (existingIndex >= 0) {
        newReviews[existingIndex] = review;
     } else {
        newReviews.push(review);
     }
     
     await this.updateProposal(proposalId, { reviews: newReviews });
     await this.notifyAdmins(`กรรมการ ${review.reviewerName} ส่งผลพิจารณา: ${proposalTitle}`, `proposal?id=${proposalId}`);
  }

  async submitRevision(proposalId: string, revisionLink: string, revisionNoteLink: string, currentHistory: RevisionLog[], currentCount: number, proposalTitle: string, adminFeedbackSnapshot?: string) {
     const newCount = currentCount + 1;
     const log: RevisionLog = {
        revisionCount: newCount,
        submittedDate: new Date().toISOString(),
        fileLink: revisionLink,
        noteLink: revisionNoteLink,
        adminFeedbackSnapshot: adminFeedbackSnapshot
     };
     
     const newHistory = [...currentHistory, log];
     await this.updateProposal(proposalId, {
        status: ProposalStatus.PENDING_ADMIN_CHECK,
        revisionLink: revisionLink,
        revisionNoteLink: revisionNoteLink,
        revisionCount: newCount,
        revisionHistory: newHistory
     });

     await this.notifyAdmins(`มีการส่งแก้ไขโครงการ: ${proposalTitle} (ครั้งที่ ${newCount})`, `proposal?id=${proposalId}`);
  }

  async submitProgressReport(proposalId: string, report: Partial<ProgressReport>, currentReports: ProgressReport[], proposalTitle: string) {
      const newReport: ProgressReport = {
          id: `rpt-${Date.now()}`,
          submittedDate: new Date().toISOString().split('T')[0],
          type: report.type!,
          fileLink: report.fileLink!,
          description: report.description
      };
      
      const updatedReports = [...currentReports, newReport];
      await this.updateProposal(proposalId, { progressReports: updatedReports });
      await this.notifyAdmins(`มีรายงานความก้าวหน้าใหม่: ${proposalTitle}`, `proposal?id=${proposalId}`);
  }

  async acknowledgeProgressReport(proposalId: string, reportId: string, adminName: string, currentReports: ProgressReport[]) {
      const updatedReports = currentReports.map(r => {
          if(r.id === reportId) {
              return { ...r, acknowledgedDate: new Date().toISOString().split('T')[0], acknowledgedBy: adminName };
          }
          return r;
      });
      await this.updateProposal(proposalId, { progressReports: updatedReports });
      await this.logActivity('ACKNOWLEDGE_REPORT', proposalId, `Report ${reportId} acknowledged`);
  }

  // --- Statistics & Workload ---
  async getReviewerWorkload(): Promise<Record<string, number>> {
      try {
          const q = query(
              collection(dbFirestore, 'proposals'), 
              where('status', '==', ProposalStatus.IN_REVIEW)
          );
          const snapshot = await getDocs(q);
          const workload: Record<string, number> = {};
          
          snapshot.forEach(doc => {
              const data = doc.data();
              if (data.reviewers && Array.isArray(data.reviewers)) {
                  data.reviewers.forEach((rid: string) => {
                      workload[rid] = (workload[rid] || 0) + 1;
                  });
              }
          });
          return workload;
      } catch (e) {
          console.error("Failed to fetch workload", e);
          return {};
      }
  }

  // --- Surveys ---

  async submitSurvey(response: Omit<SurveyResponse, 'submittedAt'>) {
    if (!this.currentUser) return;
    
    const surveyRef = doc(dbFirestore, 'surveys', this.currentUser.id);
    const surveyData: SurveyResponse = {
        ...response,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    await setDoc(surveyRef, surveyData);
    await this.logActivity('SUBMIT_SURVEY', this.currentUser.id, 'Submitted satisfaction survey');
  }

  async getUserSurveyStatus(userId: string): Promise<SurveyResponse | null> {
      const surveyRef = doc(dbFirestore, 'surveys', userId);
      const snap = await getDoc(surveyRef);
      if (snap.exists()) {
          return snap.data() as SurveyResponse;
      }
      return null;
  }

  async getAllSurveys(): Promise<SurveyResponse[]> {
      const q = query(collection(dbFirestore, 'surveys'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as SurveyResponse);
  }

  // --- Notifications & Emails ---

  async sendNotification(userId: string, message: string, link?: string) {
    const notificationsRef = collection(dbFirestore, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      message,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    try {
        const userRef = doc(dbFirestore, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            await this.queueEmail(userData.email, 'TNSU-REC Notification', 
                `<p>${message}</p><p><a href="${window.location.origin}/${link || 'dashboard'}">คลิกเพื่อดูรายละเอียด</a></p>`);
        }
    } catch (e) {
        console.error("Failed to queue email:", e);
    }
  }

  private async queueEmail(to: string, subject: string, html: string) {
      const mailRef = collection(dbFirestore, 'mail');
      await addDoc(mailRef, {
          to: [to],
          message: {
              subject: subject,
              html: html
          }
      });
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const q = query(
        collection(dbFirestore, 'notifications'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
    } catch (e) {
        const q2 = query(collection(dbFirestore, 'notifications'), where('userId', '==', userId));
        const qs = await getDocs(q2);
        return qs.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  async markAsRead(userId: string) {
    const q = query(collection(dbFirestore, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(dbFirestore);
    snapshot.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
  }

  private async notifyAdmins(message: string, link: string) {
     const admins = await this.getUsersByRole(Role.ADMIN);
     for (const admin of admins) {
        await this.sendNotification(admin.id, message, link);
     }
  }

  // --- Audit Logs ---

  async logActivity(action: string, targetId: string, details: string) {
      if (!this.currentUser) return;
      const logsRef = collection(dbFirestore, 'audit_logs');
      await addDoc(logsRef, {
          action,
          actorId: this.currentUser.id,
          actorName: this.currentUser.name,
          actorRole: this.currentUser.roles.join(','),
          targetId,
          details,
          timestamp: new Date().toISOString()
      });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
      const logsRef = collection(dbFirestore, 'audit_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
      try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AuditLog));
      } catch (e) {
        console.error("Logs index missing, fetching without sort");
        const snapshot = await getDocs(query(logsRef, limit(100)));
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AuditLog)).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
      }
  }

  async getExpiringProposals(days: number = 60): Promise<Proposal[]> {
      try {
          const q = query(collection(dbFirestore, 'proposals'), where('status', '==', ProposalStatus.APPROVED));
          const snapshot = await getDocs(q);
          
          const today = new Date();
          const expiring: Proposal[] = [];

          snapshot.forEach(doc => {
              const p = { id: doc.id, ...doc.data() } as Proposal;
              if (p.approvalDetail?.expiryDate) {
                  const expDate = new Date(p.approvalDetail.expiryDate);
                  const diffTime = expDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays >= 0 && diffDays <= days) {
                      expiring.push(p);
                  }
              }
          });
          
          return expiring.sort((a, b) => (a.approvalDetail?.expiryDate || '').localeCompare(b.approvalDetail?.expiryDate || ''));
      } catch (e) {
          console.error("Failed to get expiring proposals", e);
          return [];
      }
  }

  async checkExpiringCertificates() {
      // Logic for background check if needed, simplified here
  }
}

export const db = new DatabaseService();
