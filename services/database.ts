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
  orderBy
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth, dbFirestore } from '../firebaseConfig';
import { Proposal, ProposalStatus, Review, Role, User, Notification, ProgressReport, RevisionLog } from '../types';

class DatabaseService {
  currentUser: User | null = null;

  // --- Auth Methods ---

  async login(email: string, pass: string): Promise<User> {
    // 1. Login with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    // 2. Fetch extra user data (Role, Faculty) from Firestore 'users' collection
    const userDocRef = doc(dbFirestore, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      this.currentUser = { ...userData, id: fbUser.uid };
      return this.currentUser;
    } else {
      throw new Error('ไม่พบข้อมูลผู้ใช้งานในระบบฐานข้อมูล');
    }
  }

  async logout() {
    await signOut(auth);
    this.currentUser = null;
  }

  // Used by App.tsx to sync state when page reloads or auth state changes
  async syncCurrentUser(fbUser: FirebaseUser | null): Promise<User | null> {
    if (!fbUser) {
      this.currentUser = null;
      return null;
    }
    try {
      const userDocRef = doc(dbFirestore, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        this.currentUser = { ...(userDoc.data() as User), id: fbUser.uid };
        return this.currentUser;
      }
    } catch (e) {
      console.error("Error syncing user:", e);
    }
    return null;
  }

  async register(user: Omit<User, 'id'>, password: string): Promise<User> {
    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, user.email, password);
    const uid = userCredential.user.uid;

    // 2. Save Profile to Firestore
    const newUser: User = { ...user, id: uid };
    // Remove password from object before saving to Firestore
    const { password: _, ...userToSave } = newUser as any; 
    
    await setDoc(doc(dbFirestore, 'users', uid), userToSave);
    
    this.currentUser = newUser;
    return newUser;
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

  // Legacy mock method - in Firebase this is handled by syncCurrentUser/onAuthStateChanged
  restoreSession(): User | null {
    return this.currentUser;
  }

  // --- User Management ---

  async getUsers(): Promise<User[]> {
    const q = query(collection(dbFirestore, 'users'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    const q = query(collection(dbFirestore, 'users'), where('role', '==', role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  async updateUser(id: string, updates: Partial<User>) {
    const userRef = doc(dbFirestore, 'users', id);
    await updateDoc(userRef, updates);
  }

  async deleteUser(id: string) {
    // Note: This only deletes Firestore data. Auth deletion requires Admin SDK.
    await deleteDoc(doc(dbFirestore, 'users', id));
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
  }

  async getProposalById(id: string): Promise<Proposal | undefined> {
    if (!id) return undefined;
    const docRef = doc(dbFirestore, 'proposals', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Proposal;
    }
    return undefined;
  }

  async createProposal(p: Partial<Proposal>): Promise<Proposal> {
    const proposalsRef = collection(dbFirestore, 'proposals');
    
    // Generate Code
    const year = new Date().getFullYear() + 543;
    const facCode = p.faculty?.includes('วิทยาศาสตร์') ? 'SCI' : p.faculty?.includes('ศิลปศาสตร์') ? 'ART' : 'EDU';
    const uniqueSuffix = Date.now().toString().slice(-4);
    const tempCode = `TNSU-${facCode} ${uniqueSuffix}/${year}`;

    const newProposalData = {
      ...p,
      code: tempCode,
      revisionCount: 0,
      revisionHistory: [],
      reviews: [],
      reviewers: [],
      progressReports: [],
      status: p.advisorId ? ProposalStatus.PENDING_ADVISOR : ProposalStatus.PENDING_ADMIN_CHECK,
      submissionDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
    };

    const docRef = await addDoc(proposalsRef, newProposalData);
    
    // Notifications
    if (p.advisorId) {
      this.sendNotification(p.advisorId, `มีคำขอใหม่จากนักศึกษา: ${p.titleTh}`, `proposal?id=${docRef.id}`);
    } else {
      this.notifyAdmins(`มีคำขอใหม่: ${p.titleTh}`, `proposal?id=${docRef.id}`);
    }

    return { id: docRef.id, ...(newProposalData as any) };
  }

  async updateProposal(id: string, updates: Partial<Proposal>) {
    const proposalRef = doc(dbFirestore, 'proposals', id);
    const currentP = await this.getProposalById(id);
    if (!currentP) return;

    // Logic to generate Certificate Number automatically upon approval
    if ((updates.status === ProposalStatus.APPROVED || updates.status === ProposalStatus.WAITING_CERT)) {
        if(!updates.approvalDetail && !currentP.approvalDetail) {
            const today = new Date();
            const nextYear = new Date(today);
            nextYear.setFullYear(today.getFullYear() + 1);
            
            const certNum = `REC-${Date.now().toString().slice(-6)}`;
            
            updates.approvalDetail = {
                 certificateNumber: certNum,
                 issuanceDate: today.toISOString().split('T')[0],
                 expiryDate: nextYear.toISOString().split('T')[0]
             };
             // Legacy fields support
             updates.certNumber = certNum;
             updates.approvalDate = today.toISOString().split('T')[0];
        }
    }

    await updateDoc(proposalRef, {
      ...updates,
      updatedDate: new Date().toISOString().split('T')[0]
    });

    // Notify Researcher if status changes
    if (updates.status && updates.status !== currentP.status && currentP.researcherId) {
        this.sendNotification(currentP.researcherId, `สถานะโครงการเปลี่ยนเป็น: ${updates.status}`, `proposal?id=${id}`);
    }
  }

  async assignReviewers(proposalId: string, reviewerIds: string[], proposalTitle: string) {
    await this.updateProposal(proposalId, {
      reviewers: reviewerIds,
      status: ProposalStatus.IN_REVIEW
    });
    reviewerIds.forEach(rid => {
       this.sendNotification(rid, `คุณได้รับมอบหมายให้พิจารณาโครงการ: ${proposalTitle}`, `proposal?id=${proposalId}`);
    });
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
     this.notifyAdmins(`กรรมการ ${review.reviewerName} ส่งผลพิจารณา: ${proposalTitle}`, `proposal?id=${proposalId}`);
  }

  async submitRevision(proposalId: string, revisionLink: string, revisionNoteLink: string, currentHistory: RevisionLog[], currentCount: number, proposalTitle: string, adminFeedbackSnapshot?: string) {
     const newCount = currentCount + 1;
     const log: RevisionLog = {
        revisionCount: newCount,
        submittedDate: new Date().toISOString().split('T')[0],
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

     this.notifyAdmins(`มีการส่งแก้ไขโครงการ: ${proposalTitle} (ครั้งที่ ${newCount})`, `proposal?id=${proposalId}`);
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
      
      this.notifyAdmins(`มีรายงานความก้าวหน้าใหม่: ${proposalTitle}`, `proposal?id=${proposalId}`);
  }

  async acknowledgeProgressReport(proposalId: string, reportId: string, adminName: string, currentReports: ProgressReport[]) {
      const updatedReports = currentReports.map(r => {
          if(r.id === reportId) {
              return { ...r, acknowledgedDate: new Date().toISOString().split('T')[0], acknowledgedBy: adminName };
          }
          return r;
      });
      await this.updateProposal(proposalId, { progressReports: updatedReports });
  }

  // --- Notifications ---

  async sendNotification(userId: string, message: string, link?: string) {
    const notificationsRef = collection(dbFirestore, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      message,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
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
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (e) {
        // Fallback if index is missing
        const q2 = query(collection(dbFirestore, 'notifications'), where('userId', '==', userId));
        const qs = await getDocs(q2);
        return qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
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
     admins.forEach(admin => {
        this.sendNotification(admin.id, message, link);
     });
  }
}

export const db = new DatabaseService();
