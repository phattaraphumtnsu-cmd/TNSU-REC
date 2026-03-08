import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { dbFirestore } from '../../firebaseConfig';
import { EmailTemplate, EmailTrigger, User } from '../../types';
import { AuditService } from './audit.service';

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: EmailTrigger.REGISTER_WELCOME,
    name: 'Welcome Email',
    subject: 'ยินดีต้อนรับสู่ระบบ TNSU-REC (Welcome to TNSU-REC)',
    body: '<p>เรียน {{name}},</p><p>ยินดีต้อนรับสู่ระบบบริหารจัดการงานวิจัย TNSU-REC บัญชีของคุณได้รับการลงทะเบียนเรียบร้อยแล้ว</p><p>คุณสามารถเข้าสู่ระบบได้ที่: <a href="{{link}}">{{link}}</a></p>',
    variables: ['name', 'link'],
    isActive: true
  },
  {
    id: EmailTrigger.PROPOSAL_SUBMITTED,
    name: 'Proposal Submitted',
    subject: 'มีการยื่นข้อเสนอโครงการใหม่: {{title}}',
    body: '<p>เรียน Admin/Advisor,</p><p>มีการยื่นข้อเสนอโครงการวิจัยใหม่ในระบบ:</p><p><b>เรื่อง:</b> {{title}}</p><p><b>ผู้วิจัย:</b> {{researcher}}</p><p>กรุณาตรวจสอบได้ที่: <a href="{{link}}">คลิกที่นี่</a></p>',
    variables: ['title', 'researcher', 'link'],
    isActive: true
  },
  {
    id: EmailTrigger.PROPOSAL_STATUS_CHANGE,
    name: 'Proposal Status Change',
    subject: 'อัปเดตสถานะโครงการ: {{title}}',
    body: '<p>เรียน {{name}},</p><p>สถานะของโครงการวิจัย <b>{{title}}</b> ได้เปลี่ยนเป็น:</p><h3>{{status}}</h3><p>{{message}}</p><p>ตรวจสอบรายละเอียด: <a href="{{link}}">คลิกที่นี่</a></p>',
    variables: ['name', 'title', 'status', 'message', 'link'],
    isActive: true
  },
  {
    id: EmailTrigger.REVIEW_ASSIGNED,
    name: 'Review Assigned',
    subject: 'เชิญเป็นกรรมการพิจารณาโครงการ: {{title}}',
    body: '<p>เรียน {{name}},</p><p>ท่านได้รับมอบหมายให้เป็นผู้เชี่ยวชาญพิจารณาโครงการวิจัยเรื่อง:</p><p><b>{{title}}</b></p><p>กรุณาตอบรับการพิจารณาภายใน 7 วัน</p><p>ดำเนินการ: <a href="{{link}}">คลิกที่นี่</a></p>',
    variables: ['name', 'title', 'link'],
    isActive: true
  },
  {
    id: EmailTrigger.GENERAL_NOTIFICATION,
    name: 'General Notification',
    subject: 'แจ้งเตือนจากระบบ TNSU-REC',
    body: '<p>เรียน ผู้ใช้งาน,</p><p>{{message}}</p><p>ตรวจสอบรายละเอียด: <a href="{{link}}">คลิกที่นี่</a></p>',
    variables: ['message', 'link'],
    isActive: true
  }
];

export class NotificationService {
  private auditService: AuditService;
  private templatesCache: EmailTemplate[] | null = null;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  async initializeEmailTemplates() {
    const templatesRef = collection(dbFirestore, 'email_templates');
    const snapshot = await getDocs(templatesRef);
    
    if (snapshot.empty) {
        const batch = writeBatch(dbFirestore);
        DEFAULT_EMAIL_TEMPLATES.forEach(tmpl => {
            const docRef = doc(templatesRef, tmpl.id);
            batch.set(docRef, tmpl);
        });
        await batch.commit();
        this.templatesCache = DEFAULT_EMAIL_TEMPLATES;
    } else {
        this.templatesCache = snapshot.docs.map(doc => doc.data() as EmailTemplate);
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
      if (this.templatesCache) return this.templatesCache;

      const templatesRef = collection(dbFirestore, 'email_templates');
      const snapshot = await getDocs(templatesRef);
      if (snapshot.empty) {
          await this.initializeEmailTemplates();
          return DEFAULT_EMAIL_TEMPLATES;
      }
      this.templatesCache = snapshot.docs.map(doc => doc.data() as EmailTemplate);
      return this.templatesCache;
  }

  async updateEmailTemplate(user: User | null, id: string, updates: Partial<EmailTemplate>) {
      const docRef = doc(dbFirestore, 'email_templates', id);
      await updateDoc(docRef, updates);
      this.templatesCache = null; // Invalidate cache
      await this.auditService.logActivity(user, 'UPDATE_EMAIL_TEMPLATE', id, 'Updated email template');
  }

  async getNotifications(userId: string, limitCount: number = 20, lastDoc: any = null): Promise<{ data: any[], lastDoc: any }> {
    const notificationsRef = collection(dbFirestore, 'notifications');
    const constraints: any[] = [
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    ];
    
    if (lastDoc) constraints.push(startAfter(lastDoc));
    constraints.push(limit(limitCount));

    const q = query(notificationsRef, ...constraints);
    
    try {
        const snapshot = await getDocs(q);
        return {
            data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            lastDoc: snapshot.docs[snapshot.docs.length - 1]
        };
    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
             console.error("Missing Index! Please create the index using the link in the console error.");
             // Fallback: Fetch without sorting (might return wrong order but won't crash)
             const fallbackQ = query(notificationsRef, where('userId', '==', userId), limit(limitCount));
             const fallbackSnapshot = await getDocs(fallbackQ);
             const data = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
             
             return {
                 data,
                 lastDoc: fallbackSnapshot.docs[fallbackSnapshot.docs.length - 1]
             };
        }
        throw error;
    }
  }

  subscribeToNotifications(userId: string, callback: (notifications: any[]) => void, limitCount: number = 20): Unsubscribe {
    const notificationsRef = collection(dbFirestore, 'notifications');
    const q = query(
        notificationsRef, 
        where('userId', '==', userId), 
        orderBy('createdAt', 'desc'), 
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    }, (error) => {
        console.error("Error subscribing to notifications:", error);
        // Fallback for missing index or other errors
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
             console.error("Missing Index for Realtime Notifications!");
        }
    });
  }

  async getEmailLogs(limitCount: number = 50, lastDoc: any = null): Promise<{ data: any[], lastDoc: any }> {
      // Use 'audit_logs' but query ONLY by timestamp to avoid composite index requirement
      // We will filter for 'EMAIL_SENT' client-side
      const logsRef = collection(dbFirestore, 'audit_logs');
      const constraints: any[] = [
          orderBy('timestamp', 'desc')
      ]; 
      
      if (lastDoc) constraints.push(startAfter(lastDoc));
      // Fetch more than requested limit to increase chance of finding email logs after filtering
      constraints.push(limit(limitCount * 4)); 

      const q = query(logsRef, ...constraints);
      try {
        const snapshot = await getDocs(q);
        
        // Filter in memory
        const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const emailLogs = allLogs.filter(log => log.action === 'EMAIL_SENT');

        return {
            data: emailLogs.map(data => ({ 
                id: data.id, 
                createdAt: data.timestamp,
                to: [data.targetId], // We store recipient in targetId
                message: { subject: data.details }, // We store subject in details
                delivery: { state: 'SENT' } // Assume sent
            })),
            lastDoc: snapshot.docs[snapshot.docs.length - 1] // Return the cursor of the RAW query
        };
      } catch (e) {
          console.error("Error fetching email logs", e);
          return { data: [], lastDoc: null };
      }
  }

  async markAsRead(notificationId: string) {
    const docRef = doc(dbFirestore, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true });
  }

  async sendNotification(userId: string, message: string, link?: string, emailTrigger?: EmailTrigger, emailData?: Record<string, string>) {
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
            
            // Use Template if provided, otherwise fallback to General
            const trigger = emailTrigger || EmailTrigger.GENERAL_NOTIFICATION;
            const data = emailData || { message, link: link ? `${window.location.origin}/${link}` : window.location.origin };
            
            // Ensure link is absolute
            if (data.link && !data.link.startsWith('http')) {
                data.link = `${window.location.origin}/${data.link}`;
            }

            await this.sendSystemEmail(userData.email, trigger, data);
        }
    } catch (e) {
        console.error("Failed to queue email:", e);
    }
  }

  async sendSystemEmail(to: string, trigger: EmailTrigger, data: Record<string, string>) {
      // Fetch Template (Use Cache if available)
      let template: EmailTemplate | undefined;
      
      if (this.templatesCache) {
          template = this.templatesCache.find(t => t.id === trigger);
      } else {
          // Fallback to fetch if cache empty (though getEmailTemplates populates it)
          const templateRef = doc(dbFirestore, 'email_templates', trigger);
          const templateSnap = await getDoc(templateRef);
          if (templateSnap.exists()) {
              template = templateSnap.data() as EmailTemplate;
          }
      }
      
      let subject = 'TNSU-REC Notification';
      let html = `<p>${data.message || 'You have a new notification.'}</p>`;

      if (template) {
          if (!template.isActive) return; // Skip if disabled

          subject = template.subject;
          html = template.body;

          // Replace variables
          Object.keys(data).forEach(key => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              subject = subject.replace(regex, data[key]);
              html = html.replace(regex, data[key]);
          });
      } else {
          // Fallback to default if not in DB yet
          const defaultTmpl = DEFAULT_EMAIL_TEMPLATES.find(t => t.id === trigger);
          if (defaultTmpl) {
              subject = defaultTmpl.subject;
              html = defaultTmpl.body;
              Object.keys(data).forEach(key => {
                  const regex = new RegExp(`{{${key}}}`, 'g');
                  subject = subject.replace(regex, data[key]);
                  html = html.replace(regex, data[key]);
              });
          }
      }

      await this.queueEmail(to, subject, html);
  }

  private async queueEmail(to: string, subject: string, html: string) {
      const timestamp = new Date().toISOString();
      const emailData = {
          to: [to],
          message: {
              subject: subject,
              html: html
          },
          createdAt: timestamp
      };

      // 1. Add to 'mail' collection for the Extension to process (Actual Sending)
      const mailRef = collection(dbFirestore, 'mail');
      await addDoc(mailRef, emailData);

      // 2. Log to 'audit_logs' for Admin UI (Logging) - Safest for permissions
      // We use 'EMAIL_SENT' action, targetId = recipient, details = subject
      await this.auditService.logActivity(null, 'EMAIL_SENT', to, subject);
  }
}
