
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
  WAITING_CERT = 'อนุมัติ (รอใบรับรอง)',
  APPROVED = 'อนุมัติ (ได้รับใบรับรองแล้ว)',
  REJECTED = 'ไม่อนุมัติ',
  SUSPENDED = 'ระงับชั่วคราว',
  WITHDRAWN = 'ถอนโครงการ',
  RENEWAL_REQUESTED = 'ยื่นขอต่ออายุ'
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

export enum ReviewerStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED'
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

export interface AuditLog {
  id: string;
  action: string; // e.g., 'CREATE_PROPOSAL', 'APPROVE'
  actorId: string;
  actorName: string;
  actorRole: string; // Stored as string to avoid complexity in logs
  targetId: string; // Proposal ID or User ID
  details: string;
  timestamp: string;
}

export interface SurveyResponse {
  userId: string;
  userName: string;
  role: Role; // Primary role at time of submission
  scores: Record<string, number>;
  suggestion: string;
  urgentSuggestion: string;
  submittedAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role; // Deprecated: Kept for backward compatibility, use 'roles' instead
  roles: Role[]; // New: Support multiple roles
  type?: UserType;
  campus?: string; // Campus or School
  faculty?: string;
  password?: string; // In real app, never store plain text
}

export interface Review {
  reviewerId: string;
  reviewerName: string;
  vote: Vote;
  comment: string;
  fileLink?: string;
  reviewProcessLink?: string; 
  submittedAt: string;
}

export interface RevisionLog {
  revisionCount: number;
  submittedDate: string;
  fileLink: string;
  noteLink?: string;
  adminFeedbackSnapshot?: string; 
}

export interface ApprovalDetail {
  certificateNumber: string;
  issuanceDate: string;
  expiryDate: string;
}

export interface Proposal {
  id: string;
  code?: string; // TNSU-SCI XXX/YYYY
  certNumber?: string; // Legacy field
  titleTh: string;
  titleEn: string;
  objective?: string; // Added
  sampleCount?: string; // Added
  duration?: string; // Added
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
  adminFeedback?: string; 
  reviewers: string[]; 
  reviewerStates?: Record<string, ReviewerStatus>; // New: Track Accept/Decline status
  reviews: Review[]; 
  consolidatedFeedback?: string; 
  consolidatedFileLink?: string; 
  revisionCount: number;
  revisionLink?: string; 
  revisionNoteLink?: string; 
  revisionHistory: RevisionLog[]; 
  
  // Post Approval
  approvalDate?: string; 
  approvalDetail?: ApprovalDetail; 
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
  WITHDRAW_PROPOSAL = 'WITHDRAW_PROPOSAL', // New
  REQUEST_RENEWAL = 'REQUEST_RENEWAL', // New
  
  // Certificate & Post Approval
  ISSUE_CERTIFICATE = 'ISSUE_CERTIFICATE',
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
    Permission.ISSUE_CERTIFICATE,
    Permission.ACKNOWLEDGE_PROGRESS_REPORT,
    Permission.WITHDRAW_PROPOSAL // Admin can also withdraw
  ],
  [Role.RESEARCHER]: [
    Permission.VIEW_DASHBOARD,
    Permission.SUBMIT_PROPOSAL,
    Permission.SUBMIT_REVISION,
    Permission.SUBMIT_PROGRESS_REPORT,
    Permission.WITHDRAW_PROPOSAL,
    Permission.REQUEST_RENEWAL
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

// Modified: Check if ANY of the user's roles has the permission
export const hasPermission = (userRoles: Role[], permission: Permission): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.includes(permission) : false;
  });
};
