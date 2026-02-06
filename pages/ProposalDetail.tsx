import React, { useState } from 'react';
import { db } from '../services/mockDatabase';
import { Proposal, ProposalStatus, Role, Vote, Review, User, ReviewType, ReportType, Permission, hasPermission } from '../types';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertTriangle, FileText, UserPlus, Send, MessageSquare, Clock, Calendar, ShieldCheck, Link2, History, AlertCircle } from 'lucide-react';

interface ProposalDetailProps {
  id: string;
  onNavigate: (page: string) => void;
}

const ProposalDetail: React.FC<ProposalDetailProps> = ({ id, onNavigate }) => {
  const user = db.currentUser;
  const proposal = db.getProposalById(id);
  const [refresh, setRefresh] = useState(0);

  // Admin Assign State
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const reviewers = db.getUsersByRole(Role.REVIEWER);

  // Reviewer Vote State
  const [vote, setVote] = useState<Vote>(Vote.APPROVE);
  const [comment, setComment] = useState('');
  const [reviewerLink, setReviewerLink] = useState('');
  const [reviewProcessLink, setReviewProcessLink] = useState('');

  // Admin Final Decision State
  const [adminDecision, setAdminDecision] = useState<Vote>(Vote.APPROVE);
  const [adminFeedback, setAdminFeedback] = useState('');

  // Researcher Revision State
  const [revisionLink, setRevisionLink] = useState('');
  const [revisionNoteLink, setRevisionNoteLink] = useState('');

  // Progress Report State
  const [reportType, setReportType] = useState<ReportType>(ReportType.PROGRESS_6_MONTH);
  const [reportLink, setReportLink] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  if (!user || !proposal) return <div>Not Found</div>;

  const handleAction = (action: () => void) => {
    action();
    setRefresh(prev => prev + 1);
  };

  // --- Actions ---

  const handleAdvisorApprove = () => {
    db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_ADMIN_CHECK });
    alert('อนุมัติให้นักศึกษาแล้ว');
    handleAction(() => {});
  };

  const handleAdminAssign = () => {
    if (selectedReviewers.length === 0) return alert('เลือกกรรมการอย่างน้อย 1 ท่าน');
    db.assignReviewers(proposal.id, selectedReviewers);
    alert('มอบหมายกรรมการเรียบร้อย');
    handleAction(() => {});
  };

  const handleReviewerSubmit = () => {
    db.submitReview(proposal.id, {
      reviewerId: user.id,
      reviewerName: user.name,
      vote,
      comment,
      fileLink: reviewerLink,
      reviewProcessLink: reviewProcessLink,
      submittedAt: new Date().toISOString()
    });
    
    // Check if all reviewers voted to change status to PENDING_DECISION
    const updatedP = db.getProposalById(proposal.id);
    if (updatedP && updatedP.reviews.length === updatedP.reviewers.length) {
       db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_DECISION });
    }

    alert('บันทึกผลการพิจารณาแล้ว');
    handleAction(() => {});
  };

  const handleAdminFinalize = () => {
    if (adminDecision === Vote.FIX) {
       db.updateProposal(proposal.id, { 
          status: ProposalStatus.REVISION_REQ,
          consolidatedFeedback: adminFeedback
       });
    } else if (adminDecision === Vote.REJECT) {
       db.updateProposal(proposal.id, { 
          status: ProposalStatus.REJECTED,
          consolidatedFeedback: adminFeedback
       });
    } else {
       // Automatically handled by DB: certificateNumber, issuanceDate, expiryDate
       db.updateProposal(proposal.id, { 
          status: ProposalStatus.APPROVED, 
          certLink: 'http://tnsu.ac.th/cert/generated.pdf',
          nextReportDueDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
       });
    }
    alert('บันทึกผลสรุปเรียบร้อย');
    handleAction(() => {});
  };

  const handleResearcherRevise = () => {
    if (!revisionLink) return alert('กรุณาใส่ลิงก์ไฟล์แก้ไข');
    db.submitRevision(proposal.id, revisionLink, revisionNoteLink);
    setRevisionLink('');
    setRevisionNoteLink('');
    alert('ส่งแก้ไขเรียบร้อย สถานะกลับสู่ "รอเจ้าหน้าที่ตรวจสอบ"');
    handleAction(() => {});
  };

  const handleSubmitProgressReport = () => {
     if (!reportLink) return alert('กรุณาใส่ลิงก์ไฟล์รายงาน');
     db.submitProgressReport(proposal.id, {
        type: reportType,
        fileLink: reportLink,
        description: reportDesc
     });
     setReportLink('');
     setReportDesc('');
     alert('ส่งรายงานเรียบร้อย เจ้าหน้าที่จะทำการตรวจสอบ');
     handleAction(() => {});
  };

  const handleAdminAcknowledgeReport = (reportId: string) => {
     db.acknowledgeProgressReport(proposal.id, reportId, user.name);
     handleAction(() => {});
  };

  // --- UI Components ---

  const renderStatusBadge = () => {
    let color = 'bg-gray-100 text-gray-700';
    if (proposal.status === ProposalStatus.APPROVED) color = 'bg-green-100 text-green-700';
    if (proposal.status === ProposalStatus.REJECTED) color = 'bg-red-100 text-red-700';
    if (proposal.status === ProposalStatus.REVISION_REQ) color = 'bg-orange-100 text-orange-700';
    if (proposal.status === ProposalStatus.IN_REVIEW) color = 'bg-blue-100 text-blue-700';

    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{proposal.status}</span>;
  };

  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={20} className="mr-2" /> กลับไปแดชบอร์ด
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{proposal.code || 'NO CODE'}</span>
             {renderStatusBadge()}
           </div>
           <h1 className="text-xl font-bold text-slate-900">{proposal.titleTh}</h1>
           <p className="text-slate-500">{proposal.titleEn}</p>
        </div>
        
        {proposal.status === ProposalStatus.APPROVED && proposal.certLink && (
           <div className="flex flex-col items-end gap-2">
             <a href={proposal.certLink} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition-transform active:scale-95">
               <ShieldCheck size={18} /> ดาวน์โหลดใบรับรอง
             </a>
             <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12}/> วันที่รับรอง: {proposal.approvalDetail?.issuanceDate || proposal.approvalDate}
             </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-semibold text-lg mb-4 text-slate-800 border-b pb-2">รายละเอียดโครงการ</h3>
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 block">ผู้วิจัย:</span> {proposal.researcherName}</div>
                <div><span className="text-slate-500 block">สังกัด:</span> {proposal.faculty} ({proposal.campus})</div>
                <div><span className="text-slate-500 block">ประเภท:</span> {proposal.type}</div>
                <div><span className="text-slate-500 block">วันที่ยื่น:</span> {proposal.submissionDate}</div>
                {proposal.advisorName && <div><span className="text-slate-500 block">ที่ปรึกษา:</span> {proposal.advisorName}</div>}
             </div>
             
             <div className="mt-6 flex flex-col gap-2">
                <a href={proposal.fileLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <ExternalLink size={16} /> ลิงก์เอกสารโครงการ (Google Drive)
                </a>
                {proposal.paymentSlipLink && (
                   <a href={proposal.paymentSlipLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-3 rounded-lg border border-blue-100">
                     <FileText size={16} /> หลักฐานการชำระเงิน
                   </a>
                )}
             </div>

             {/* Admin/Reviewer Revision Alert - Visibility Check */}
             {(hasPermission(user.role, Permission.ASSIGN_REVIEWERS) || hasPermission(user.role, Permission.VOTE_AS_REVIEWER)) && 
               proposal.revisionLink && proposal.status === ProposalStatus.PENDING_ADMIN_CHECK && (
                <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded-lg animate-pulse">
                   <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                      <AlertCircle size={20} /> มีเอกสารฉบับแก้ไขใหม่ (Revision {proposal.revisionCount})
                   </h4>
                   <div className="flex flex-col gap-2">
                       <a href={proposal.revisionLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-orange-700 hover:underline bg-white p-2 rounded border border-orange-100 text-sm">
                         <ExternalLink size={14} /> ไฟล์แก้ไข (Revision Files)
                       </a>
                       {proposal.revisionNoteLink && (
                         <a href={proposal.revisionNoteLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-600 hover:underline bg-white p-2 rounded border border-slate-100 text-sm">
                           <FileText size={14} /> บันทึกข้อความ/เอกสารชี้แจง
                         </a>
                       )}
                   </div>
                </div>
             )}

             {/* Revision History Log */}
             {proposal.revisionHistory && proposal.revisionHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                       <History size={16} /> ประวัติการแก้ไข (Revision History)
                    </h4>
                    <div className="space-y-3">
                       {proposal.revisionHistory.map((rev, idx) => (
                          <div key={idx} className="text-sm bg-slate-50 p-3 rounded border border-slate-100 flex justify-between items-center">
                             <div>
                                <span className="font-medium text-slate-800 mr-2">ครั้งที่ {rev.revisionCount}</span>
                                <span className="text-slate-500 text-xs">เมื่อ {rev.submittedDate}</span>
                             </div>
                             <div className="flex gap-2">
                                <a href={rev.fileLink} target="_blank" className="text-blue-600 hover:underline text-xs">ไฟล์</a>
                                {rev.noteLink && <a href={rev.noteLink} target="_blank" className="text-slate-600 hover:underline text-xs">บันทึก</a>}
                             </div>
                          </div>
                       ))}
                    </div>
                </div>
             )}
          </div>

          {/* Feedback & Revision Zone - Visibility Check */}
          {(hasPermission(user.role, Permission.FINALIZE_DECISION) || hasPermission(user.role, Permission.SUBMIT_REVISION)) && proposal.consolidatedFeedback && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
               <div className="bg-orange-50 border-b border-orange-100 p-4">
                  <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                    <AlertTriangle size={20} /> ข้อเสนอแนะจากคณะกรรมการ (Feedback)
                  </h3>
               </div>
               <div className="p-6">
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap mb-6">
                      {proposal.consolidatedFeedback}
                  </div>

                  {/* RESEARCHER REVISION SUBMISSION AREA */}
                  {hasPermission(user.role, Permission.SUBMIT_REVISION) && (proposal.status === ProposalStatus.REVISION_REQ || proposal.status === ProposalStatus.ADMIN_REJECTED) && (
                     <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                           <Send size={18} /> ส่งงานแก้ไข (Submit Revision)
                        </h4>
                        <p className="text-sm text-blue-600 mb-4">
                           กรุณาแก้ไขเอกสารตามข้อเสนอแนะด้านบน และแนบลิงก์ไฟล์ใหม่เพื่อส่งให้เจ้าหน้าที่ตรวจสอบ
                        </p>
                        
                        <div className="space-y-3">
                           <div>
                              <label className="block text-xs font-semibold text-blue-700 mb-1">1. ลิงก์ไฟล์แก้ไข (Google Drive)</label>
                              <input 
                                type="url" 
                                placeholder="https://drive.google.com/..." 
                                className="w-full border border-blue-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                                value={revisionLink}
                                onChange={e => setRevisionLink(e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-semibold text-blue-700 mb-1">2. ลิงก์บันทึกข้อความชี้แจง (ถ้ามี)</label>
                              <input 
                                type="url" 
                                placeholder="https://drive.google.com/..." 
                                className="w-full border border-blue-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                                value={revisionNoteLink}
                                onChange={e => setRevisionNoteLink(e.target.value)}
                              />
                           </div>
                           <button onClick={handleResearcherRevise} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-transform active:scale-95">
                              ยืนยันส่งแก้ไข
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
          )}

          {/* Internal Reviews (Admin Only) */}
          {hasPermission(user.role, Permission.FINALIZE_DECISION) && proposal.reviews.length > 0 && (
             <div className="bg-slate-100 rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">ความคิดเห็นกรรมการ ({proposal.reviews.length}/{proposal.reviewers.length})</h3>
                <div className="space-y-4">
                  {proposal.reviews.map((r, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                       <div className="flex justify-between mb-2">
                          <span className="font-medium text-slate-700">{r.reviewerName}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.vote === Vote.APPROVE ? 'bg-green-100 text-green-700' : r.vote === Vote.FIX ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {r.vote}
                          </span>
                       </div>
                       <p className="text-slate-600 text-sm mb-2">{r.comment}</p>
                       <div className="flex flex-wrap gap-2">
                         {r.fileLink && (
                            <a href={r.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                               <Link2 size={12} /> เอกสารแนบจากกรรมการ
                            </a>
                         )}
                         {r.reviewProcessLink && (
                            <a href={r.reviewProcessLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline bg-purple-50 px-2 py-1 rounded">
                               <FileText size={12} /> รายละเอียดกระบวนการ
                            </a>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {/* --- POST APPROVAL SECTION (PROGRESS REPORTS) --- */}
          {proposal.status === ProposalStatus.APPROVED && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                   <h3 className="font-bold text-green-800 flex items-center gap-2">
                      <Clock size={20} /> ติดตามความก้าวหน้าโครงการ (Post-approval Monitoring)
                   </h3>
                   {hasPermission(user.role, Permission.ACKNOWLEDGE_PROGRESS_REPORT) && (
                      <div className="text-xs text-green-700 bg-white px-3 py-1 rounded-full border border-green-200">
                         ครบกำหนดรายงานถัดไป: {proposal.nextReportDueDate || 'ไม่ระบุ'}
                      </div>
                   )}
                </div>
                
                <div className="p-6">
                   {/* History List */}
                   {proposal.progressReports && proposal.progressReports.length > 0 ? (
                      <div className="space-y-4 mb-6">
                         {proposal.progressReports.map((report) => (
                            <div key={report.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
                               <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                     <span className="font-semibold text-slate-700">{report.type}</span>
                                     <span className="text-xs text-slate-400">ส่งเมื่อ {report.submittedDate}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">{report.description || '-'}</p>
                                  <a href={report.fileLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                     <ExternalLink size={12} /> ดูไฟล์รายงาน
                                  </a>
                               </div>
                               <div className="flex flex-col items-end justify-center min-w-[150px]">
                                  {report.acknowledgedDate ? (
                                     <div className="text-right">
                                        <span className="inline-flex items-center text-green-600 text-sm font-medium gap-1">
                                           <CheckCircle size={14} /> รับทราบแล้ว
                                        </span>
                                        <div className="text-xs text-slate-400">โดย {report.acknowledgedBy}</div>
                                        <div className="text-xs text-slate-400">{report.acknowledgedDate}</div>
                                     </div>
                                  ) : (
                                     hasPermission(user.role, Permission.ACKNOWLEDGE_PROGRESS_REPORT) ? (
                                        <button 
                                          onClick={() => handleAdminAcknowledgeReport(report.id)}
                                          className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                                        >
                                           กดรับทราบรายงาน
                                        </button>
                                     ) : (
                                        <span className="text-orange-500 text-xs bg-orange-50 px-2 py-1 rounded">รอเจ้าหน้าที่ตรวจสอบ</span>
                                     )
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-lg mb-6">
                         ยังไม่มีรายงานความก้าวหน้า
                      </div>
                   )}

                   {/* Researcher Submission Form */}
                   {hasPermission(user.role, Permission.SUBMIT_PROGRESS_REPORT) && (
                      <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                         <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Send size={16} /> ส่งรายงานใหม่
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                               <label className="block text-xs font-medium text-slate-500 mb-1">ประเภทรายงาน</label>
                               <select 
                                 className="w-full text-sm border p-2 rounded"
                                 value={reportType}
                                 onChange={(e) => setReportType(e.target.value as ReportType)}
                               >
                                  {Object.values(ReportType).map(t => <option key={t} value={t}>{t}</option>)}
                               </select>
                            </div>
                            <div>
                               <label className="block text-xs font-medium text-slate-500 mb-1">ลิงก์ไฟล์ (Google Drive)</label>
                               <input 
                                 type="text" 
                                 className="w-full text-sm border p-2 rounded"
                                 placeholder="https://drive.google.com/..."
                                 value={reportLink}
                                 onChange={e => setReportLink(e.target.value)}
                               />
                            </div>
                         </div>
                         <div className="mb-3">
                            <label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียดเพิ่มเติม</label>
                            <textarea 
                              className="w-full text-sm border p-2 rounded" 
                              rows={2}
                              value={reportDesc}
                              onChange={e => setReportDesc(e.target.value)}
                            ></textarea>
                         </div>
                         <div className="flex justify-end">
                            <button 
                              onClick={handleSubmitProgressReport}
                              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-medium"
                            >
                               ยืนยันส่งรายงาน
                            </button>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          
          {/* ADVISOR ACTION */}
          {hasPermission(user.role, Permission.APPROVE_AS_ADVISOR) && proposal.status === ProposalStatus.PENDING_ADVISOR && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold mb-4">การดำเนินการ (ที่ปรึกษา)</h3>
              <p className="text-sm text-slate-500 mb-4">ตรวจสอบเอกสารเบื้องต้นก่อนส่งต่อ</p>
              <button onClick={handleAdvisorApprove} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                 อนุมัติให้นักศึกษา
              </button>
            </div>
          )}

          {/* ADMIN: ASSIGN REVIEWERS */}
          {hasPermission(user.role, Permission.ASSIGN_REVIEWERS) && proposal.status === ProposalStatus.PENDING_ADMIN_CHECK && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold mb-4">มอบหมายกรรมการ</h3>
               <p className="text-xs text-slate-500 mb-2">
                 ประเภท: <span className="font-semibold">{proposal.type}</span> <br/>
                 แนะนำ: {proposal.type === ReviewType.FULL_BOARD ? '5 ท่าน' : proposal.type === ReviewType.EXPEDITED ? '2-3 ท่าน' : '1-2 ท่าน'}
               </p>
               <div className="max-h-48 overflow-y-auto border rounded-lg mb-4">
                  {reviewers.map(r => (
                    <label key={r.id} className="flex items-center p-3 hover:bg-slate-50 border-b last:border-0 cursor-pointer">
                       <input type="checkbox" className="mr-3" 
                          checked={selectedReviewers.includes(r.id)}
                          onChange={(e) => {
                             if(e.target.checked) setSelectedReviewers([...selectedReviewers, r.id]);
                             else setSelectedReviewers(selectedReviewers.filter(id => id !== r.id));
                          }}
                       />
                       <div>
                         <div className="text-sm font-medium">{r.name}</div>
                         <div className="text-xs text-slate-400">{r.campus}</div>
                       </div>
                    </label>
                  ))}
               </div>
               <button onClick={handleAdminAssign} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2">
                  <UserPlus size={18} /> ยืนยันมอบหมาย
               </button>
               <button className="w-full mt-2 border border-red-300 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm">
                  ส่งคืนแก้ไข (เอกสารไม่ครบ)
               </button>
            </div>
          )}

          {/* REVIEWER: VOTE */}
          {hasPermission(user.role, Permission.VOTE_AS_REVIEWER) && proposal.status === ProposalStatus.IN_REVIEW && proposal.reviewers.includes(user.id) && !proposal.reviews.find(r => r.reviewerId === user.id) && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4">ผลการพิจารณา</h3>
                <div className="space-y-3 mb-4">
                   {[Vote.APPROVE, Vote.FIX, Vote.REJECT].map(v => (
                     <label key={v} className="flex items-center space-x-2">
                        <input type="radio" name="vote" value={v} checked={vote === v} onChange={() => setVote(v)} />
                        <span>{v === Vote.APPROVE ? 'สมควรอนุมัติ' : v === Vote.FIX ? 'ให้แก้ไข' : 'ไม่อนุมัติ'}</span>
                     </label>
                   ))}
                </div>
                <textarea 
                  className="w-full border p-2 rounded-lg mb-4 text-sm" 
                  rows={4} 
                  placeholder="ข้อเสนอแนะเพิ่มเติม..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                ></textarea>
                
                {/* Optional Link Input for Reviewer - File Attachment */}
                <div className="relative mb-2">
                   <Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                   <input 
                      type="url" 
                      placeholder="ลิงก์ไฟล์แนบประกอบการพิจารณา (ไม่บังคับ)" 
                      className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm"
                      value={reviewerLink}
                      onChange={e => setReviewerLink(e.target.value)}
                   />
                </div>

                {/* Optional Link Input for Reviewer - Process Details */}
                <div className="relative mb-4">
                   <FileText className="absolute left-3 top-2.5 text-slate-400" size={16} />
                   <input 
                      type="url" 
                      placeholder="ลิงก์รายละเอียดกระบวนการพิจารณา (Review Process Details Link)" 
                      className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm"
                      value={reviewProcessLink}
                      onChange={e => setReviewProcessLink(e.target.value)}
                   />
                </div>

                <button onClick={handleReviewerSubmit} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                   ยืนยันผลการพิจารณา
                </button>
             </div>
          )}

          {/* ADMIN: CONSOLIDATE & FINALIZE */}
          {hasPermission(user.role, Permission.FINALIZE_DECISION) && proposal.status === ProposalStatus.PENDING_DECISION && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-200 ring-2 ring-purple-50">
                <h3 className="font-bold mb-2 text-purple-700">สรุปผลการพิจารณา</h3>
                <p className="text-xs text-slate-500 mb-4">Reviewer ทั้งหมดส่งผลครบแล้ว. กรุณาสรุปเพื่อแจ้งผู้วิจัย (Conflict? ยึดผลที่แย่ที่สุด)</p>
                
                <div className="space-y-3 mb-4">
                   <select className="w-full p-2 border rounded" value={adminDecision} onChange={(e) => setAdminDecision(e.target.value as Vote)}>
                      <option value={Vote.APPROVE}>อนุมัติ (ออกใบรับรอง)</option>
                      <option value={Vote.FIX}>ให้แก้ไข (ส่งคืนผู้วิจัย)</option>
                      <option value={Vote.REJECT}>ไม่อนุมัติ</option>
                   </select>
                </div>
                
                <textarea 
                  className="w-full border p-2 rounded-lg mb-4 text-sm" 
                  rows={6} 
                  placeholder="ข้อความสรุปถึงผู้วิจัย (รวบรวมจากกรรมการ)..."
                  value={adminFeedback}
                  onChange={e => setAdminFeedback(e.target.value)}
                ></textarea>

                <button onClick={handleAdminFinalize} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
                   บันทึกและแจ้งผล
                </button>
             </div>
          )}

          {/* POST APPROVAL INFO (SIDEBAR) */}
          {proposal.status === ProposalStatus.APPROVED && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200">
               <h3 className="font-bold mb-3 text-green-700">สถานะโครงการ</h3>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-green-50 pb-2">
                     <span className="text-slate-500">เลขที่ใบรับรอง</span>
                     <span className="font-medium text-slate-800">{proposal.approvalDetail?.certificateNumber || proposal.certNumber}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-green-50 pb-2">
                     <span className="text-slate-500">วันที่รับรอง</span>
                     <span className="font-medium text-slate-800">{proposal.approvalDetail?.issuanceDate || proposal.approvalDate}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-green-50 pb-2">
                     <span className="text-slate-500">วันหมดอายุ</span>
                     <span className="font-medium text-slate-800">{proposal.approvalDetail?.expiryDate || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                     <span className="text-slate-500">ส่งรายงานถัดไป</span>
                     <span className="font-bold text-green-600">{proposal.nextReportDueDate || 'รอเจ้าหน้าที่กำหนด'}</span>
                  </div>
                  {hasPermission(user.role, Permission.MANAGE_USERS) && (
                     <div className="bg-yellow-50 p-2 text-xs text-yellow-800 rounded mt-2">
                        Admin Note: ตรวจสอบวันครบกำหนดตามความเสี่ยงโครงการ (6 เดือน / 1 ปี)
                     </div>
                  )}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProposalDetail;