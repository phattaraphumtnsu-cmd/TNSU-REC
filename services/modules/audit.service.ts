import { collection, addDoc, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { dbFirestore } from '../../firebaseConfig';
import { User } from '../../types';

export class AuditService {
  async getAuditLogs(limitCount: number = 50, lastDoc: any = null): Promise<{ data: any[], lastDoc: any }> {
    const constraints: any[] = [orderBy('timestamp', 'desc')];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    constraints.push(limit(limitCount));
    
    const q = query(collection(dbFirestore, 'audit_logs'), ...constraints);
    const snapshot = await getDocs(q);
    
    return {
        data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  }

  async logActivity(user: User | null, action: string, targetId: string, details: string) {
    try {
      await addDoc(collection(dbFirestore, 'audit_logs'), {
        action,
        actorId: user ? user.id : 'SYSTEM',
        actorName: user ? user.name : 'System',
        actorRole: user ? (user.roles ? user.roles.join(',') : (user.role || 'USER')) : 'SYSTEM',
        targetId,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  }
}
