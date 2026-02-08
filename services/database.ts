
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
  runTransaction
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { auth, dbFirestore, firebaseConfig } from '../firebaseConfig';
import { Proposal, ProposalStatus, Review, Role, User, Notification, ProgressReport, RevisionLog, AuditLog } from '../types';

class DatabaseService {
  currentUser: User | null = null;

  // --- Auth Methods ---

  async login(email: string, pass: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    const userDocRef = doc(dbFirestore, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      if ((userData as any).isDeleted) {
         await signOut(auth);
         throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      }

      this.currentUser = { ...userData, id: fbUser.uid };
      await this.logActivity('LOGIN', fbUser.uid, 'User logged in');
      return this.currentUser;
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
    // If we are currently logged in (e.g. Admin creating a user), we must use a secondary app
    // to avoid logging out the current user.
    const isSecondaryCreation = !!this.currentUser;
    
    let targetAuth = auth;
    let secondaryApp: FirebaseApp | undefined = undefined;

    if (isSecondaryCreation) {
        // Create a temporary secondary app to handle the new user creation without affecting current session
        secondaryApp = initializeApp(firebaseConfig, `SecondaryApp-${Date.now()}`);
        targetAuth = getAuth(secondaryApp);
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(targetAuth, user.email, password);
        const uid = userCredential.user.uid;
        const newUser: User = { ...user, id: uid };
        const { password: _, ...userToSave } = newUser as any; 
        
        // Save to Firestore (main instance)
        await setDoc(doc(dbFirestore, 'users', uid), {
            ...userToSave,
            isDeleted: false,
            createdAt: new Date().toISOString()
        });
        
        // Log registration
        const auditRef = collection(dbFirestore, 'audit_logs');
        await addDoc(auditRef, {
            action: 'REGISTER',
            actorId: isSecondaryCreation ? this.currentUser?.id : uid,
            actorName: isSecondaryCreation ? this.currentUser?.name : user.name,
            actorRole: isSecondaryCreation ? this.currentUser?.role : user.role,
            targetId: uid,
            details: `Registered new user: ${user.name} (${user.role})`,
            timestamp: new Date().toISOString()
        });
        
        // If this was self-registration, update current user. 
        // If Admin created it, DO NOT update currentUser.
        if (!isSecondaryCreation) {
            this.currentUser = newUser;
        } else if (secondaryApp) {
             // Sign out the secondary auth so it doesn't leave lingering sessions
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

  async checkAnyAdminExists(): Promise<boolean> {
    try {
      const q = query(collection(dbFirestore, 'users'), where('role', '==', Role.ADMIN), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (e) {
      console.warn("Error checking admin existence (defaulting to false):", e);
      return false;
    }
  }

  // --- User Management ---

  async getUsers(): Promise<User[]> {
    const q = query(collection(dbFirestore, 'users'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) } as User))
        .filter((u: any) => !u.isDeleted);
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    const q = query(collection(dbFirestore, 'users'), where('role', '==', role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) } as User))
        .filter((u: any) => !u.isDeleted);
  }

  async updateUser(id: string, updates: Partial<User>) {
    const userRef = doc(dbFirestore, 'users', id);
    await updateDoc(userRef, updates);
    await this.logActivity('UPDATE_USER', id, `Updated fields: ${Object.keys(updates).join(', ')}`);
  }

  async deleteUser(id: string) {
    const userRef = doc(dbFirestore, 'users', id);
    await updateDoc(userRef, {
        isDeleted: true,
        role: 'SUSPENDED',
        updatedAt: new Date().toISOString()
    });
    await this.logActivity('SUSPEND_USER', id, 'User account suspended (soft delete)');
  }

  // --- Proposals ---

  async getProposals(role: Role, userId: string): Promise<Proposal[]> {
    const proposalsRef = collection(dbFirestore, 'proposals');
    let q;

    if (role === Role.ADMIN) {
      q = query(proposalsRef);
    } else if (role === Role.REVIEWER) {
      q = query(proposalsRef, where('reviewers', 'array-contains', userId));
    } else if (role === Role.ADVISOR) {
      q = query(proposalsRef, where('advisorId', '==', userId));
    } else if (role === Role.RESEARCHER) {
      q = query(proposalsRef, where('researcherId', '==', userId));
    } else {
      return [];
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Proposal));
  }

  async getProposalById(id: string): Promise<Proposal | undefined> {
    if (!id) return undefined;
    const docRef = doc(dbFirestore, 'proposals', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as any) } as Proposal;
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
        // Refined Logic: Date-based running number for uniqueness
        // Format: TNSU-{FAC} {ThaiYear}{MM}{DD}-{SEQ}
        const now = new Date();
        const thYear = now.getFullYear() + 543;
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateCode = `${thYear}${month}${day}`; // e.g., 25670226

        const facCode = this.getFacultyCode(p.faculty || '');
        
        // Counter Document Reference: counters/prop_25670226_SCI
        const counterId = `prop_${dateCode}_${facCode}`;
        const counterRef = doc(dbFirestore, 'counters', counterId);
        const counterDoc = await transaction.get(counterRef);

        let newCount = 1;
        if (counterDoc.exists()) {
            newCount = counterDoc.data().count + 1;
        }

        // Generate Code: TNSU-SCI 25670226-001
        const code = `TNSU-${facCode} ${dateCode}-${newCount.toString().padStart(3, '0')}`;

        const newProposalRef = doc(collection(dbFirestore, 'proposals'));
        
        const newProposalData: any = {
            ...p,
            code,
            revisionCount: 0,
            revisionHistory: [],
            reviews: [],
            reviewers: [],
            progressReports: [],
            status: p.advisorId ? ProposalStatus.PENDING_ADVISOR : ProposalStatus.PENDING_ADMIN_CHECK,
            submissionDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedDate: new Date().toISOString().split('T')[0],
        };

        // Remove undefined fields (e.g. advisorName if undefined) to prevent Firestore errors
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

  async updateProposal(id: string, updates: Partial<Proposal>) {
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

                const certNum = `TNSU-${facCode} ${newCount.toString().padStart(3, '0')}/${year}`;
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

        // Sanitize updates
        Object.keys(finalUpdates).forEach(key => {
            if ((finalUpdates as any)[key] === undefined) {
                delete (finalUpdates as any)[key];
            }
        });

        transaction.update(proposalRef, finalUpdates);
    }).then(async () => {
        await this.logActivity('UPDATE_PROPOSAL', id, `Updated fields: ${Object.keys(updates).join(', ')}`);
    });
    
    // Notifications and Email (Simulated backend trigger)
    const currentP = await this.getProposalById(id);
    if (currentP && updates.status && updates.status !== currentP.status) {
         const msg = `สถานะโครงการเปลี่ยนเป็น: ${updates.status}`;
         // Notify Researcher
         if (currentP.researcherId) {
             await this.sendNotification(currentP.researcherId, msg, `proposal?id=${id}`);
         }
    }
  }

  async assignReviewers(proposalId: string, reviewerIds: string[], proposalTitle: string) {
    await this.updateProposal(proposalId, {
      reviewers: reviewerIds,
      status: ProposalStatus.IN_REVIEW
    });
    for (const rid of reviewerIds) {
       await this.sendNotification(rid, `คุณได้รับมอบหมายให้พิจารณาโครงการ: ${proposalTitle}`, `proposal?id=${proposalId}`);
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

  // --- Notifications & Emails ---

  async sendNotification(userId: string, message: string, link?: string) {
    // 1. In-App Notification
    const notificationsRef = collection(dbFirestore, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      message,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    // 2. Email Notification (Triggered by Firestore write to 'mail' collection via Firebase Extension)
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
        // Fallback if index missing
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

  // --- Audit Logs & Background Checks ---

  async logActivity(action: string, targetId: string, details: string) {
      if (!this.currentUser) return;
      const logsRef = collection(dbFirestore, 'audit_logs');
      await addDoc(logsRef, {
          action,
          actorId: this.currentUser.id,
          actorName: this.currentUser.name,
          actorRole: this.currentUser.role,
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

  async checkExpiringCertificates() {
      if (!this.currentUser || this.currentUser.role !== Role.ADMIN) return;

      const proposalsRef = collection(dbFirestore, 'proposals');
      const q = query(proposalsRef, where('status', '==', ProposalStatus.APPROVED));
      const snapshot = await getDocs(q);
      
      const today = new Date();
      const warningThreshold = 30; // days

      snapshot.forEach(async (docSnap) => {
          const p = docSnap.data() as Proposal;
          const expiryString = p.approvalDetail?.expiryDate || '';
          if (!expiryString) return;

          const expiryDate = new Date(expiryString);
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 0 && diffDays <= warningThreshold) {
              if (p.researcherId) {
                  // Alert logic here
              }
          }
      });
  }
}

export const db = new DatabaseService();
