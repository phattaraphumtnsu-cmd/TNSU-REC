import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  limit,
  setDoc,
  orderBy,
  startAfter,
  QueryConstraint,
  writeBatch
} from 'firebase/firestore';
import { dbFirestore } from '../../firebaseConfig';
import { Role, User, SurveyResponse } from '../../types';
import { AuditService } from './audit.service';

export class UserService {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  async getAllSurveys(): Promise<SurveyResponse[]> {
    const q = query(collection(dbFirestore, 'surveys'), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SurveyResponse);
  }

  async getUserSurveyStatus(userId: string): Promise<SurveyResponse | null> {
    const docRef = doc(dbFirestore, 'surveys', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as SurveyResponse;
    }
    return null;
  }

  async submitSurvey(response: SurveyResponse) {
    const docRef = doc(dbFirestore, 'surveys', response.userId);
    await setDoc(docRef, response);
    await this.auditService.logActivity({ id: response.userId, name: response.userName } as User, 'SUBMIT_SURVEY', response.userId, 'Submitted satisfaction survey');
  }

  async getUsers(roleFilter: string = 'ALL', limitCount: number = 20, lastDoc: any = null): Promise<{ users: User[], lastDoc: any }> {
    const usersRef = collection(dbFirestore, 'users');
    const constraints: QueryConstraint[] = [];

    // Filter out deleted users
    // Note: Firestore requires an index for 'isDeleted' combined with other fields if we use it in every query.
    // For now, we assume 'isDeleted' might not be on all docs, so we might filter client side if index is missing,
    // but best practice is to query for it.
    // constraints.push(where('isDeleted', '!=', true)); // Requires index with other fields

    if (roleFilter !== 'ALL') {
        constraints.push(where('roles', 'array-contains', roleFilter));
    }

    constraints.push(orderBy('name'));
    
    if (lastDoc) {
        constraints.push(startAfter(lastDoc));
    }
    
    constraints.push(limit(limitCount));

    const q = query(usersRef, ...constraints);
    
    try {
        const snapshot = await getDocs(q);
        
        const users = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            if (!data.roles && data.role) data.roles = [data.role];
            return { id: doc.id, ...data } as User;
        }).filter(u => !(u as any).isDeleted); // Client-side filter for safety if index missing

        return { 
            users, 
            lastDoc: snapshot.docs[snapshot.docs.length - 1] 
        };
    } catch (error: any) {
        console.error("Error fetching users:", error);
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
             console.error("Missing Index! Please create the index using the link in the console error.");
             // Fallback: Fetch without sorting/filtering if possible, or just fail gracefully
             // If role filter is active, we can't easily fallback without fetching ALL users.
             // So we re-throw but with a clear message.
             alert("Database Index Missing: Please check the console for the link to create the required index.");
        }
        throw error;
    }
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    try {
        const q = query(
            collection(dbFirestore, 'users'), 
            where('roles', 'array-contains', role)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data() as any;
                return { id: doc.id, ...data } as User;
            })
            .filter((u: any) => !u.isDeleted);
            
    } catch (e) {
        console.error("Error fetching users by role", e);
        return [];
    }
  }

  async getEligibleAdvisors(): Promise<User[]> {
    try {
        const q = query(
            collection(dbFirestore, 'users'), 
            where('roles', 'array-contains-any', [Role.ADVISOR, Role.REVIEWER])
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data() as any;
                return { id: doc.id, ...data } as User;
            })
            .filter((u: any) => !u.isDeleted);
            
    } catch (e) {
        console.error("Error fetching eligible advisors", e);
        return [];
    }
  }

  async getUserById(id: string): Promise<User | null> {
      try {
        const userDocRef = doc(dbFirestore, 'users', id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (!userData.roles && userData.role) {
                userData.roles = [userData.role];
            }
            if (!userData.roles) userData.roles = [];
            return { ...userData, id: userDoc.id };
        }
      } catch (e) {
          console.error("Error fetching user by ID", e);
      }
      return null;
  }

  async updateUser(currentUser: User | null, id: string, updates: Partial<User>) {
    const userRef = doc(dbFirestore, 'users', id);
    
    const sanitizedUpdates = { ...updates };
    Object.keys(sanitizedUpdates).forEach(key => {
        if ((sanitizedUpdates as any)[key] === undefined) {
            delete (sanitizedUpdates as any)[key];
        }
    });

    await updateDoc(userRef, sanitizedUpdates);
    await this.auditService.logActivity(currentUser, 'UPDATE_USER', id, `Updated fields: ${Object.keys(updates).join(', ')}`);
  }

  async deleteUser(currentUser: User | null, id: string) {
    const userRef = doc(dbFirestore, 'users', id);
    await updateDoc(userRef, {
        isDeleted: true,
        roles: [],
        role: 'SUSPENDED',
        updatedAt: new Date().toISOString()
    });
    await this.auditService.logActivity(currentUser, 'SUSPEND_USER', id, 'User account suspended (soft delete)');
  }

  async migrateUserRoles(currentUser: User | null): Promise<string> {
    if (!currentUser?.roles.includes(Role.ADMIN)) {
        throw new Error('Unauthorized');
    }

    const usersRef = collection(dbFirestore, 'users');
    const snapshot = await getDocs(usersRef);
    let updatedCount = 0;

    const batchSize = 500; // Firestore batch limit
    let batch = writeBatch(dbFirestore);
    let operationCounter = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let needsUpdate = false;
        const updates: any = {};

        // 1. Migrate 'role' string to 'roles' array if missing
        if (!data.roles && data.role) {
            updates.roles = [data.role];
            needsUpdate = true;
        }

        // 2. Ensure 'roles' exists
        if (!data.roles && !updates.roles) {
            updates.roles = [Role.RESEARCHER]; // Default
            needsUpdate = true;
        }

        // 3. Ensure 'role' (primary) exists for backward compatibility (or remove it if we decide to fully migrate)
        // For now, let's keep them synced. If 'role' is missing but 'roles' exists, set 'role' to first one.
        if (!data.role && (data.roles || updates.roles)) {
            updates.role = (data.roles || updates.roles)[0];
            needsUpdate = true;
        }

        if (needsUpdate) {
            const userRef = doc(dbFirestore, 'users', docSnap.id);
            batch.update(userRef, updates);
            updatedCount++;
            operationCounter++;

            if (operationCounter >= batchSize) {
                await batch.commit();
                batch = writeBatch(dbFirestore);
                operationCounter = 0;
            }
        }
    }

    if (operationCounter > 0) {
        await batch.commit();
    }

    await this.auditService.logActivity(currentUser, 'MIGRATE_DATA', 'ALL_USERS', `Migrated roles for ${updatedCount} users`);
    return `Migrated ${updatedCount} users successfully.`;
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

  async getSystemSettings(): Promise<any> {
    try {
      const docRef = doc(dbFirestore, 'system_settings', 'general');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return {};
    } catch (e) {
      console.error("Error fetching system settings", e);
      return {};
    }
  }

  async updateSystemSettings(currentUser: User | null, updates: any): Promise<void> {
    try {
      const docRef = doc(dbFirestore, 'system_settings', 'general');
      await setDoc(docRef, updates, { merge: true });
      await this.auditService.logActivity(currentUser, 'UPDATE_SETTINGS', 'general', 'Updated system settings');
    } catch (e) {
      console.error("Error updating system settings", e);
      throw e;
    }
  }
}
