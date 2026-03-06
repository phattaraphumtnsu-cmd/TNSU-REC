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
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { auth, dbFirestore, firebaseConfig } from '../../firebaseConfig';
import { User, EmailTrigger } from '../../types';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

export class AuthService {
  private auditService: AuditService;
  private notificationService: NotificationService;
  private userService: UserService;

  constructor(auditService: AuditService, notificationService: NotificationService, userService: UserService) {
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.userService = userService;
  }

  async login(email: string, pass: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    const user = await this.syncCurrentUser(fbUser);
    
    if (user) {
        await this.auditService.logActivity(user, 'LOGIN', fbUser.uid, 'User logged in');
        return user;
    } else {
        throw new Error('ไม่พบข้อมูลผู้ใช้งานในระบบฐานข้อมูล');
    }
  }

  async logout(currentUser: User | null) {
    if (currentUser) {
       await this.auditService.logActivity(currentUser, 'LOGOUT', currentUser.id, 'User logged out');
    }
    await signOut(auth);
  }

  async syncCurrentUser(fbUser: FirebaseUser | null): Promise<User | null> {
    if (!fbUser) return null;
    
    try {
      // Use UserService logic or direct fetch? Direct fetch to ensure we get the raw doc first
      // Actually UserService.getUserById handles the role migration logic too.
      // But let's keep it self-contained or use UserService?
      // UserService.getUserById returns User | null.
      
      const user = await this.userService.getUserById(fbUser.uid);
      if (user) {
          if ((user as any).isDeleted) {
              await signOut(auth);
              return null;
          }
          return user;
      }
    } catch (e) {
      console.error("Error syncing user:", e);
    }
    return null;
  }

  async register(currentUser: User | null, user: Omit<User, 'id'>, password: string): Promise<User> {
    const isSecondaryCreation = !!currentUser;
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
        
        await this.auditService.logActivity(
            currentUser || { id: uid, name: user.name, roles: initialRoles } as any, 
            'REGISTER', 
            uid, 
            `Registered new user: ${user.name} (${user.roles.join(', ')})`
        );
        
        if (isSecondaryCreation && secondaryApp) {
             await signOut(targetAuth);
             await deleteApp(secondaryApp);
        }

        // Send Welcome Email
        await this.notificationService.sendNotification(
            uid, 
            'ยินดีต้อนรับสู่ระบบ TNSU-REC', 
            'dashboard', 
            EmailTrigger.REGISTER_WELCOME, 
            { name: user.name, link: 'dashboard' }
        );

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
}
