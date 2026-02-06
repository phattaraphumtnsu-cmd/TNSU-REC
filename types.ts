export enum Role {
  RESEARCHER = 'RESEARCHER',
  ADVISOR = 'ADVISOR',
  REVIEWER = 'REVIEWER',
  ADMIN = 'ADMIN'
}

export enum UserType {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  EXTERNAL = 'EXTERNAL'
}

export enum ProposalStatus {
  DRAFT = 'ร่างเอกสาร',
  PENDING_ADVISOR = 'รอที่ปรึกษาอนุมัติ',
  PENDING_ADMIN_CHECK = 'รอเจ้าหน้าที่ตรวจสอบ',
  ADMIN_REJECTED = 'เอกสารไม่ถูกต้อง(แก้ไข)',
  IN_REVIEW = 'อยู่ระหว่างพิจารณา',
  REVISION_REQ = 'แก้ไขตามข้อเสนอแนะ',
  PENDING_DECISION = 'รอสรุปผล',
  WAITING_CERT = 'รอออกใบรับรอง',
  APPROVED = 'อนุมัติ/ได้รับใบรับรอง',
  REJECTED = 'ไม่อนุมัติ',
  SUSPENDED = 'ระงับชั่วคราว'
}

export enum ReviewType {
  EXEMPTION = 'Exemption Review (ยกเว้น)',
  EXPEDITED = 'Expedited Review (เร่งด่วน)',
  FULL_BOARD = 'Full Board (เต็มคณะ)'
}

export enum Vote {
  APPROVE = 'APPROVE',
  FIX = 'FIX',
  REJECT = 'REJECT'
}

export enum ReportType {
  PROGRESS_6_MONTH = 'รายงานความก้าวหน้า (6 เดือน)',
  PROGRESS_12_MONTH = 'รายงานความก้าวหน้า (1 ปี)',
  CLOSING = 'รายงานปิดโครงการ (Closing Report)',
  DEVIATION = 'รายงานการเบี่ยงเบน (Deviation)',
  ADVERSE_EVENT = 'รายงานเหตุการณ์ไม่พึงประสงค์ (SAE)'
}

export interface ProgressReport {
  id: string;
  type: ReportType;
  fileLink: string;
  description?: string;
  submittedDate: string;
  acknowledgedDate?: string; // If present, admin has reviewed
  acknowledgedBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  type?: UserType;
  campus?: string; // Campus or School
  faculty?: string;
  password?: string; // In real app, never store plain text
}

export interface Review {
  reviewerId: string;
  reviewerName: string; // Only shown to Admin
  vote: Vote;
  comment: string;
  fileLink?: string;
  reviewProcessLink?: string; // Link to review process details
  submittedAt: string;
}

export interface RevisionLog {
  revisionCount: number;
  submittedDate: string;
  fileLink: string;
  noteLink?: string;
  adminFeedbackSnapshot?: string; // The feedback they were responding to
}

export interface ApprovalDetail {
  certificateNumber: string;
  issuanceDate: string;
  expiryDate: string;
}

export interface Proposal {
  id: string;
  code?: string; // TNSU-SCI XXX/YYYY
  certNumber?: string; // Legacy field, kept for compatibility
  titleTh: string;
  titleEn: string;
  researcherId: string;
  researcherName: string;
  advisorId?: string;
  advisorName?: string;
  type: ReviewType;
  campus: string;
  faculty: string;
  fileLink: string; // Google Drive Link
  paymentSlipLink?: string;
  status: ProposalStatus;
  submissionDate: string;
  updatedDate: string;
  
  // Workflow data
  adminFeedback?: string; // Feedback from admin during initial check
  reviewers: string[]; // IDs of assigned reviewers
  reviews: Review[]; // Review contents
  consolidatedFeedback?: string; // Final feedback sent to researcher
  revisionCount: number;
  revisionLink?: string; // Link to fixed files
  revisionNoteLink?: string; // Optional link for clarification/memo
  revisionHistory: RevisionLog[]; // Log of all revisions
  
  // Post Approval
  approvalDate?: string; // Legacy field
  approvalDetail?: ApprovalDetail; // New detailed approval info
  certLink?: string;
  progressReports: ProgressReport[];
  nextReportDueDate?: string;
}

export const CAMPUSES = [
  "เชียงใหม่", "เพชรบูรณ์", "ลำปาง", "สุโขทัย", "กรุงเทพ", "ชลบุรี", "สมุทรสาคร", 
  "สุพรรณบุรี", "อ่างทอง", "ชัยภูมิ", "มหาสารคาม", "ศรีสะเกษ", "อุดรธานี", 
  "กระบี่", "ชุมพร", "ตรัง", "ยะลา"
];

export const SCHOOLS = [
  "โรงเรียนกีฬาจังหวัดเชียงใหม่", "โรงเรียนกีฬาจังหวัดนครสวรรค์", "โรงเรียนกีฬาจังหวัดลำปาง", 
  "โรงเรียนกีฬาจังหวัดชลบุรี", "โรงเรียนกีฬาจังหวัดนครนายก", "โรงเรียนกีฬาจังหวัดสุพรรณบุรี", 
  "โรงเรียนกีฬาจังหวัดอ่างทอง", "โรงเรียนกีฬาจังหวัดขอนแก่น", "โรงเรียนกีฬาจังหวัดศรีสะเกษ", 
  "โรงเรียนกีฬาจังหวัดอุบลราชธานี", "โรงเรียนกีฬาจังหวัดตรัง", "โรงเรียนกีฬาจังหวัดนครศรีธรรมราช", 
  "โรงเรียนกีฬาจังหวัดยะลา"
];

export const FACULTIES = [
  "คณะวิทยาศาสตร์การกีฬาและสุขภาพ",
  "คณะศิลปศาสตร์",
  "คณะศึกษาศาสตร์"
];

// --- PERMISSIONS SYSTEM ---

export enum Permission {
  // General
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  
  // User Management
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_REPORTS = 'VIEW_REPORTS',

  // Proposal Actions
  SUBMIT_PROPOSAL = 'SUBMIT_PROPOSAL',
  APPROVE_AS_ADVISOR = 'APPROVE_AS_ADVISOR',
  ASSIGN_REVIEWERS = 'ASSIGN_REVIEWERS',
  VOTE_AS_REVIEWER = 'VOTE_AS_REVIEWER',
  FINALIZE_DECISION = 'FINALIZE_DECISION',
  SUBMIT_REVISION = 'SUBMIT_REVISION',
  
  // Post Approval
  SUBMIT_PROGRESS_REPORT = 'SUBMIT_PROGRESS_REPORT',
  ACKNOWLEDGE_PROGRESS_REPORT = 'ACKNOWLEDGE_PROGRESS_REPORT'
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_USERS,
    Permission.VIEW_REPORTS,
    Permission.ASSIGN_REVIEWERS,
    Permission.FINALIZE_DECISION,
    Permission.ACKNOWLEDGE_PROGRESS_REPORT
  ],
  [Role.RESEARCHER]: [
    Permission.VIEW_DASHBOARD,
    Permission.SUBMIT_PROPOSAL,
    Permission.SUBMIT_REVISION,
    Permission.SUBMIT_PROGRESS_REPORT
  ],
  [Role.ADVISOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.APPROVE_AS_ADVISOR
  ],
  [Role.REVIEWER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VOTE_AS_REVIEWER
  ]
};

export const hasPermission = (userRole: Role, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions ? permissions.includes(permission) : false;
};