
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Proposal, ProposalStatus, Role, Vote, Review, User, ReviewType, ReportType, Permission, hasPermission } from '../types';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertTriangle, FileText, UserPlus, Send, MessageSquare, Clock, Calendar, ShieldCheck, Link2, History, AlertCircle, FileCheck, Loader2, Printer, Info, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface ProposalDetailProps {
  id: string;
  onNavigate: (page: string, params?: any) => void;
}

const ProposalDetail: React.FC<ProposalDetailProps> = ({ id, onNavigate }) => {
  const user = db.currentUser;
  
  const [proposal, setProposal] = useState<Proposal | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [reviewersList, setReviewersList] = useState<User[]>([]);

  // Admin Assign State
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [adminPreFeedback, setAdminPreFeedback] = useState('');
  
  // Reviewer Vote State
  const [vote, setVote] = useState<Vote>(Vote.APPROVE);
  const [comment, setComment] = useState('');
  const [reviewerLink, setReviewerLink] = useState('');
  const [reviewProcessLink, setReviewProcessLink] = useState('');

  // Admin Final Decision State
  const [adminDecision, setAdminDecision] = useState<Vote>(Vote.APPROVE);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [adminFileLink, setAdminFileLink] = useState('');
  const [adminCertLink, setAdminCertLink] = useState('');

  // Researcher Revision State
  const [revisionLink, setRevisionLink] = useState('');
  const [revisionNoteLink, setRevisionNoteLink] = useState('');
  const [confirmRevise, setConfirmRevise] = useState(false);

  // Progress Report State
  const [reportType, setReportType] = useState<ReportType>(ReportType.PROGRESS_6_MONTH);
  const [reportLink, setReportLink] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  
  // UI State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const p = await db.getProposalById(id);
            setProposal(p);
            
            // If user is Admin, fetch reviewers list for assignment
            if (user?.role === Role.ADMIN) {
                const rList = await db.getUsersByRole(Role.REVIEWER);
                setReviewersList(rList);
            }
        } catch (e) {
            console.error("Failed to fetch proposal", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [id, user?.role]);

  if (!user) return <div>Access Denied</div>;
  if (loading) return <div className="flex h-64 items-center justify-center text-blue-600"><Loader2 className="animate-spin mr-2"/> Loading Proposal...</div>;
  if (!proposal) return <div>Not Found</div>;

  const reloadProposal = async () => {
      const p = await db.getProposalById(id);
      setProposal(p);
      // Reset local states
      setConfirmRevise(false);
      setRevisionLink('');
      setRevisionNoteLink('');
  };

  // Determine what feedback to show based on status
  const isRejectedByAdmin = proposal.status === ProposalStatus.ADMIN_REJECTED;
  const isRevisionReq = proposal.status === ProposalStatus.REVISION_REQ;
  
  const feedbackToShow = isRejectedByAdmin ? proposal.adminFeedback : proposal.consolidatedFeedback;
  const feedbackFileToShow = proposal.consolidatedFileLink;

  // --- Actions ---

  const handleAdvisorApprove = async () => {
    await db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_ADMIN_CHECK });
    alert('อนุมัติให้นักศึกษาแล้ว');
    reloadProposal();
  };

  const handleAdminAssign = async () => {
    if (selectedReviewers.length === 0) return alert('เลือกกรรมการอย่างน้อย 1 ท่าน');
    await db.assignReviewers(proposal.id, selectedReviewers, proposal.titleTh);
    alert('มอบหมายกรรมการเรียบร้อย');
    reloadProposal();
  };

  const handleAdminReturnDocs = async () => {
    if (!adminPreFeedback.trim()) return alert('กรุณาระบุเหตุผลที่ส่งคืนแก้ไข (ข้อเสนอแนะ)');
    await db.updateProposal(proposal.id, {
        status: ProposalStatus.ADMIN_REJECTED,
        adminFeedback: adminPreFeedback
    });
    setAdminPreFeedback('');
    alert('ส่งคืนโครงการให้ผู้วิจัยแก้ไขเรียบร้อยแล้ว');
    reloadProposal();
  };

  const handleReviewerSubmit = async () => {
    const newReview: Review = {
      reviewerId: user.id,
      reviewerName: user.name,
      vote,
      comment,
      fileLink: reviewerLink,
      reviewProcessLink: reviewProcessLink,
      submittedAt: new Date().toISOString()
    };

    await db.submitReview(proposal.id, newReview, proposal.reviews || [], proposal.titleTh);
    
    // Check for auto-status update logic locally or assume backend logic
    const freshP = await db.getProposalById(proposal.id);
    if (freshP && freshP.reviews.length === freshP.reviewers.length) {
       await db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_DECISION });
    }

    alert('บันทึกผลการพิจารณาแล้ว');
    reloadProposal();
  };

  const handleAdminFinalize = async () => {
    const updates: Partial<Proposal> = {
       consolidatedFeedback: adminFeedback,
       consolidatedFileLink: adminFileLink
    };

    if (adminDecision === Vote.FIX) {
       updates.status = ProposalStatus.REVISION_REQ;
       alert('บันทึกผล "ให้แก้ไข" เรียบร้อยแล้ว');
    } else if (adminDecision === Vote.REJECT) {
       updates.status = ProposalStatus.REJECTED;
       alert('บันทึกผล "ไม่อนุมัติ" เรียบร้อยแล้ว');
    } else {
       if (adminCertLink) {
          updates.status = ProposalStatus.APPROVED;
          updates.certLink = adminCertLink;
          updates.nextReportDueDate = new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0];
          alert('อนุมัติและออกใบรับรองเรียบร้อยแล้ว');
       } else {
          updates.status = ProposalStatus.WAITING_CERT;
          alert('บันทึกผลอนุมัติเรียบร้อย (สถานะ: รอออกใบรับรอง)');
       }
    }
    
    await db.updateProposal(proposal.id, updates);
    reloadProposal();
  };

  const handleAdminIssueCert = async () => {
     // If cert link provided, save it. Otherwise just approve (assume system generation)
     const updates: any = {
        status: ProposalStatus.APPROVED,
        nextReportDueDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
     };
     if (adminCertLink) updates.certLink = adminCertLink;

     await db.updateProposal(proposal.id, updates);
     setAdminCertLink('');
     alert('ออกใบรับรองเรียบร้อยแล้ว');
     reloadProposal();
  };

  const handleResearcherRevise = async () => {
    if (!revisionLink) return alert('กรุณาใส่ลิงก์ไฟล์แก้ไข');
    if (!confirmRevise) return alert('กรุณายืนยันการตรวจสอบความถูกต้องของข้อมูล');
    
    if (!window.confirm('ยืนยันการส่งข้อมูลการแก้ไข?')) return;

    await db.submitRevision(
        proposal.id, 
        revisionLink, 
        revisionNoteLink, 
        proposal.revisionHistory || [], 
        proposal.revisionCount || 0,
        proposal.titleTh,
        feedbackToShow // Use the specific feedback (admin or committee) being addressed
    );
    alert('ส่งแก้ไขเรียบร้อย สถานะกลับสู่ "รอเจ้าหน้าที่ตรวจสอบ"');
    reloadProposal();
  };

  const handleSubmitProgressReport = async () => {
     if (!reportLink) return alert('กรุณาใส่ลิงก์ไฟล์รายงาน');
     await db.submitProgressReport(
        proposal.id, 
        {
            type: reportType,
            fileLink: reportLink,
            description: reportDesc
        },
        proposal.progressReports || [],
        proposal.titleTh
     );
     setReportLink('');
     setReportDesc('');
     alert('ส่งรายงานเรียบร้อย เจ้าหน้าที่จะทำการตรวจสอบ');
     reloadProposal();
  };

  const handleAdminAcknowledgeReport = async (reportId: string) => {
     await db.acknowledgeProgressReport(proposal.id, reportId, user.name, proposal.progressReports);
     reloadProposal();
  };

  const renderStatusBadge = () => {
    let color = 'bg-gray-100 text-gray-700';
    if (proposal.status === ProposalStatus.APPROVED) color = 'bg-green-100 text-green-700';
    if (proposal.status === ProposalStatus.REJECTED) color = 'bg-red-100 text-red-700';
    if (proposal.status === ProposalStatus.REVISION_REQ) color = 'bg-orange-100 text-orange-700';
    if (proposal.status === ProposalStatus.ADMIN_REJECTED) color = 'bg-red-50 text-red-600 border border-red-200';
    if (proposal.status === ProposalStatus.WAITING_CERT) color = 'bg-purple-100 text-purple-700';
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
        
        {proposal.status === ProposalStatus.APPROVED && (
           <div className="flex flex-col items-end gap-2">
             <div className="flex gap-2">
                {proposal.certLink && (
                    <a href={proposal.certLink} target="_blank" rel="noreferrer" className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-200 shadow-sm transition-transform active:scale-95 text-sm">
                        <ExternalLink size={16} /> ไฟล์แนบ (Google Drive)
                    </a>
                )}
                <button 
                    onClick={() => onNavigate('certificate', { id: proposal.id })}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition-transform active:scale-95"
                >
                    <Printer size={18} /> พิมพ์ใบรับรอง (E-Cert)
                </button>
             </div>
             <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12}/> วันที่รับรอง: {proposal.approvalDetail?.issuanceDate || proposal.approvalDate}
             </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Required Banner for Researcher */}
          {hasPermission(user.role, Permission.SUBMIT_REVISION) && (isRejectedByAdmin || isRevisionReq) && (
             <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-1" size={24} />
                <div>
                   <h3 className="font-bold text-red-800">โปรดดำเนินการแก้ไข (Action Required)</h3>
                   <p className="text-sm text-red-700 mt-1">
                      {isRejectedByAdmin 
                        ? 'เจ้าหน้าที่ได้ตรวจสอบเอกสารแล้วพบว่าไม่ครบถ้วนหรือต้องแก้ไข กรุณาดูรายละเอียดด้านล่างและส่งเอกสารใหม่'
                        : 'คณะกรรมการพิจารณาแล้วมีมติ "ให้แก้ไข" กรุณาปรับปรุงข้อมูลตามข้อเสนอแนะและส่งกลับเข้าระบบ'}
                   </p>
                </div>
             </div>
          )}

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

             {/* Admin/Reviewer view of Pending Revisions */}
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
                                <span className="text-slate-500 text-xs">
                                   เมื่อ {new Date(rev.submittedDate).toLocaleString('th-TH', { 
                                     year: 'numeric', 
                                     month: 'short', 
                                     day: 'numeric',
                                     hour: '2-digit',
                                     minute: '2-digit'
                                   })}
                                </span>
                             </div>
                             <div className="flex gap-2">
                                <a href={rev.fileLink} target="_blank" className="text-blue-600 hover:underline text-xs bg-white px-2 py-1 rounded border">ไฟล์แนบ</a>
                                {rev.noteLink && <a href={rev.noteLink} target="_blank" className="text-slate-600 hover:underline text-xs bg-white px-2 py-1 rounded border">บันทึก</a>}
                             </div>
                          </div>
                       ))}
                    </div>
                </div>
             )}
          </div>

          {/* New: Review Progress for Admin */}
          {user.role === Role.ADMIN && proposal.reviewers && proposal.reviewers.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden mb-6">
               <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                  <h3 className="font-bold text-blue-800 flex items-center gap-2">
                     <Users size={20} /> ติดตามสถานะการพิจารณา (Review Progress)
                  </h3>
                  <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                     {proposal.reviews?.length || 0} / {proposal.reviewers.length} คน
                  </span>
               </div>
               <div className="divide-y divide-slate-100">
                  {proposal.reviewers.map((reviewerId, index) => {
                     const reviewerInfo = reviewersList.find(u => u.id === reviewerId);
                     const reviewData = proposal.reviews?.find(r => r.reviewerId === reviewerId);

                     return (
                        <div key={reviewerId} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${reviewData ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                 {index + 1}
                              </div>
                              <div>
                                 <div className="font-medium text-slate-800">
                                    {reviewerInfo ? reviewerInfo.name : 'Unknown Reviewer'}
                                 </div>
                                 <div className="text-xs text-slate-500">
                                    {reviewerInfo?.faculty || 'Reviewer'}
                                 </div>
                              </div>
                           </div>
                           <div>
                              {reviewData ? (
                                 <div className="text-right">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                                       reviewData.vote === Vote.APPROVE ? 'bg-green-100 text-green-700' : 
                                       reviewData.vote === Vote.FIX ? 'bg-orange-100 text-orange-700' : 
                                       'bg-red-100 text-red-700'
                                    }`}>
                                       {reviewData.vote === Vote.APPROVE ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                                       {reviewData.vote}
                                    </span>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                       {new Date(reviewData.submittedAt).toLocaleDateString('th-TH')}
                                    </div>
                                 </div>
                              ) : (
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-500">
                                    <Clock size={12} /> รอพิจารณา
                                 </span>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
             </div>
          )}

          {/* Feedback & Revision Submission Section - IMPROVED UI */}
          {(hasPermission(user.role, Permission.FINALIZE_DECISION) || hasPermission(user.role, Permission.SUBMIT_REVISION)) && (feedbackToShow || feedbackFileToShow) && (
            <div className={`bg-white border rounded-xl shadow-md overflow-hidden transition-all duration-300 ${isRejectedByAdmin ? 'border-red-200 ring-4 ring-red-50/50' : 'border-orange-200 ring-4 ring-orange-50/50'} mb-6`}>
               <div 
                  className={`flex justify-between items-center p-4 cursor-pointer ${isRejectedByAdmin ? 'bg-red-50 hover:bg-red-100' : 'bg-orange-50 hover:bg-orange-100'} transition-colors`}
                  onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
               >
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isRejectedByAdmin ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                          <AlertTriangle size={24} />
                      </div>
                      <div>
                          <h3 className={`font-bold text-lg ${isRejectedByAdmin ? 'text-red-900' : 'text-orange-900'}`}>
                              {isRejectedByAdmin ? 'สิ่งที่ต้องแก้ไข (จากเจ้าหน้าที่)' : 'มติคณะกรรมการ: ให้แก้ไข (Revision Required)'}
                          </h3>
                          <p className={`text-sm ${isRejectedByAdmin ? 'text-red-700' : 'text-orange-700'}`}>
                              {isRejectedByAdmin ? 'ข้อเสนอแนะจากเจ้าหน้าที่ (Admin Feedback)' : 'ข้อสรุปจากคณะกรรมการ (Committee Consensus)'}
                          </p>
                      </div>
                  </div>
                  {isFeedbackOpen ? <ChevronUp className={isRejectedByAdmin ? 'text-red-500' : 'text-orange-500'} /> : <ChevronDown className={isRejectedByAdmin ? 'text-red-500' : 'text-orange-500'} />}
               </div>
               
               {isFeedbackOpen && (
                  <div className="p-6 bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                      {feedbackToShow && (
                          <div className="mb-6">
                              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><MessageSquare size={14}/> รายละเอียดข้อเสนอแนะ</h4>
                              <div className={`p-5 rounded-xl border text-slate-800 whitespace-pre-wrap font-sans text-base leading-relaxed shadow-inner ${isRejectedByAdmin ? 'bg-red-50/30 border-red-100' : 'bg-orange-50/30 border-orange-100'}`}>
                                  {feedbackToShow}
                              </div>
                          </div>
                      )}
                      {feedbackFileToShow && (
                          <div className="mb-6">
                              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={14}/> เอกสารประกอบ</h4>
                              <a href={feedbackFileToShow} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group w-full md:w-fit">
                                  <div className="bg-blue-100 p-3 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      <FileText size={24} />
                                  </div>
                                  <div>
                                      <div className="font-semibold text-slate-800 group-hover:text-blue-700">ดาวน์โหลดเอกสารข้อเสนอแนะฉบับเต็ม</div>
                                      <div className="text-xs text-slate-500">คลิกเพื่อเปิดไฟล์ PDF/Word</div>
                                  </div>
                                  <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-500 ml-2" />
                              </a>
                          </div>
                      )}

                      {/* Revision Submission Form for Researcher */}
                      {hasPermission(user.role, Permission.SUBMIT_REVISION) && (isRevisionReq || isRejectedByAdmin) && (
                         <div className="mt-8 pt-8 border-t border-slate-100">
                            <h4 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                               <Send size={24} className="text-blue-600" /> ส่งแบบขอแก้ไข (Submit Revision)
                            </h4>
                            
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6 flex items-start gap-3 border border-blue-100">
                               <Info size={20} className="mt-0.5 flex-shrink-0 text-blue-600" />
                               <div>
                                  <p className="font-bold mb-1">คำแนะนำการส่งแก้ไข:</p> 
                                  <p>กรุณาจัดการไฟล์แก้ไขใน Google Drive (อาจสร้าง Folder ใหม่ เช่น "Revision 1") ตรวจสอบสิทธิ์ให้เป็น <u>Everyone (Anyone with the link)</u> แล้วนำลิงก์มาวางด้านล่าง</p>
                               </div>
                            </div>

                            <div className="space-y-5 bg-slate-50/50 p-6 rounded-xl border border-slate-200">
                               <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                                     1. ลิงก์ไฟล์แก้ไข (Google Drive) <span className="text-red-500">*</span>
                                  </label>
                                  <div className="relative">
                                     <ExternalLink className="absolute left-3 top-3 text-slate-400" size={18} />
                                     <input 
                                        type="url" 
                                        placeholder="https://drive.google.com/..." 
                                        className="w-full border border-slate-300 pl-10 pr-4 py-3 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={revisionLink} 
                                        onChange={e => setRevisionLink(e.target.value)} 
                                     />
                                  </div>
                               </div>
                               <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                                     2. ลิงก์บันทึกข้อความชี้แจง (ถ้ามี)
                                  </label>
                                  <div className="relative">
                                     <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                                     <input 
                                        type="url" 
                                        placeholder="https://drive.google.com/..." 
                                        className="w-full border border-slate-300 pl-10 pr-4 py-3 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={revisionNoteLink} 
                                        onChange={e => setRevisionNoteLink(e.target.value)} 
                                     />
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">เอกสารตารางชี้แจงการแก้ไข (Memo) เพื่อให้กรรมการตรวจสอบได้ง่ายขึ้น</p>
                               </div>

                               <div className="flex items-center gap-3 py-2 bg-white p-3 rounded-lg border border-slate-200">
                                 <input 
                                   type="checkbox" 
                                   id="confirmRevise" 
                                   checked={confirmRevise} 
                                   onChange={e => setConfirmRevise(e.target.checked)}
                                   className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                 />
                                 <label htmlFor="confirmRevise" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                   ข้าพเจ้าได้ดำเนินการแก้ไขเอกสารตามข้อเสนอแนะครบถ้วนแล้ว
                                 </label>
                               </div>

                               <button 
                                  onClick={handleResearcherRevise} 
                                  disabled={!confirmRevise}
                                  className={`w-full py-3.5 rounded-lg font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 
                                    ${confirmRevise 
                                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg' 
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                               >
                                  <Send size={20} /> ยืนยันส่งข้อมูลการแก้ไข
                               </button>
                            </div>
                         </div>
                      )}
                  </div>
               )}
            </div>
          )}

          {hasPermission(user.role, Permission.FINALIZE_DECISION) && proposal.reviews && proposal.reviews.length > 0 && (
             <div className="bg-slate-100 rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">ความคิดเห็นกรรมการ ({proposal.reviews.length}/{proposal.reviewers.length})</h3>
                <div className="space-y-4">
                  {proposal.reviews.map((r, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                       <div className="flex justify-between mb-2">
                          <span className="font-medium text-slate-700">{r.reviewerName}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.vote === Vote.APPROVE ? 'bg-green-100 text-green-700' : r.vote === Vote.FIX ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{r.vote}</span>
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

          {/* Post Approval */}
          {proposal.status === ProposalStatus.APPROVED && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                   <h3 className="font-bold text-green-800 flex items-center gap-2">
                      <Clock size={20} /> ติดตามความก้าวหน้าโครงการ
                   </h3>
                   {hasPermission(user.role, Permission.ACKNOWLEDGE_PROGRESS_REPORT) && (
                      <div className="text-xs text-green-700 bg-white px-3 py-1 rounded-full border border-green-200">
                         ครบกำหนดรายงานถัดไป: {proposal.nextReportDueDate || 'ไม่ระบุ'}
                      </div>
                   )}
                </div>
                <div className="p-6">
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
                                  <a href={report.fileLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> ดูไฟล์รายงาน</a>
                                </div>
                               <div className="flex flex-col items-end justify-center min-w-[150px]">
                                  {report.acknowledgedDate ? (
                                     <div className="text-right">
                                        <span className="inline-flex items-center text-green-600 text-sm font-medium gap-1"><CheckCircle size={14} /> รับทราบแล้ว</span>
                                        <div className="text-xs text-slate-400">โดย {report.acknowledgedBy}</div>
                                        <div className="text-xs text-slate-400">{report.acknowledgedDate}</div>
                                     </div>
                                  ) : (
                                     hasPermission(user.role, Permission.ACKNOWLEDGE_PROGRESS_REPORT) ? (
                                        <button onClick={() => handleAdminAcknowledgeReport(report.id)} className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 transition-colors">กดรับทราบรายงาน</button>
                                     ) : (
                                        <span className="text-orange-500 text-xs bg-orange-50 px-2 py-1 rounded">รอเจ้าหน้าที่ตรวจสอบ</span>
                                     )
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-lg mb-6">ยังไม่มีรายงานความก้าวหน้า</div>
                   )}
                   {hasPermission(user.role, Permission.SUBMIT_PROGRESS_REPORT) && (
                      <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                         <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Send size={16} /> ส่งรายงานใหม่</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">ประเภท</label><select className="w-full text-sm border p-2 rounded" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>{Object.values(ReportType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            <div>
                               <label className="block text-xs font-medium text-slate-500 mb-1">ลิงก์ไฟล์รายงาน (PDF)</label>
                               <input 
                                  type="url" 
                                  className="w-full text-sm border p-2 rounded" 
                                  placeholder="https://drive.google.com/..." 
                                  value={reportLink} 
                                  onChange={e => setReportLink(e.target.value)} 
                               />
                            </div>
                         </div>
                         <div className="mb-3"><label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียดเพิ่มเติม</label><textarea className="w-full text-sm border p-2 rounded" rows={2} value={reportDesc} onChange={e => setReportDesc(e.target.value)}></textarea></div>
                         <div className="flex justify-end"><button onClick={handleSubmitProgressReport} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-medium">ยืนยันส่งรายงาน</button></div>
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          {hasPermission(user.role, Permission.APPROVE_AS_ADVISOR) && proposal.status === ProposalStatus.PENDING_ADVISOR && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold mb-4">การดำเนินการ (ที่ปรึกษา)</h3>
              <button onClick={handleAdvisorApprove} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">อนุมัติให้นักศึกษา</button>
            </div>
          )}
          {hasPermission(user.role, Permission.ASSIGN_REVIEWERS) && proposal.status === ProposalStatus.PENDING_ADMIN_CHECK && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold mb-4">มอบหมายกรรมการ / ตรวจสอบ</h3>
               <p className="text-xs text-slate-500 mb-2">ประเภท: <span className="font-semibold">{proposal.type}</span></p>
               <div className="max-h-48 overflow-y-auto border rounded-lg mb-4">
                  {reviewersList.map(r => (
                    <label key={r.id} className="flex items-center p-3 hover:bg-slate-50 border-b last:border-0 cursor-pointer">
                       <input type="checkbox" className="mr-3" checked={selectedReviewers.includes(r.id)}
                          onChange={(e) => {
                             if(e.target.checked) setSelectedReviewers([...selectedReviewers, r.id]);
                             else setSelectedReviewers(selectedReviewers.filter(id => id !== r.id));
                          }}
                       />
                       <div><div className="text-sm font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.campus}</div></div>
                    </label>
                  ))}
               </div>
               <button onClick={handleAdminAssign} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 mb-4"><UserPlus size={18} /> ยืนยันมอบหมาย</button>
               <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2 text-slate-700">ส่งคืนแก้ไข (เอกสารไม่ครบ)</p>
                  <textarea className="w-full border p-2 rounded text-sm mb-2 focus:ring-2 focus:ring-red-200 outline-none border-slate-200" placeholder="ระบุสิ่งที่ต้องแก้ไข..." rows={2} value={adminPreFeedback} onChange={e => setAdminPreFeedback(e.target.value)}></textarea>
                  <button onClick={handleAdminReturnDocs} className="w-full border border-red-300 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm flex items-center justify-center gap-2"><XCircle size={16} /> ส่งคืนแก้ไข</button>
               </div>
            </div>
          )}
          {hasPermission(user.role, Permission.VOTE_AS_REVIEWER) && proposal.status === ProposalStatus.IN_REVIEW && proposal.reviewers.includes(user.id) && !proposal.reviews?.find(r => r.reviewerId === user.id) && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4">ผลการพิจารณา</h3>
                <div className="space-y-3 mb-4">
                   {[Vote.APPROVE, Vote.FIX, Vote.REJECT].map(v => (
                     <label key={v} className="flex items-center space-x-2"><input type="radio" name="vote" value={v} checked={vote === v} onChange={() => setVote(v)} /><span>{v === Vote.APPROVE ? 'สมควรอนุมัติ' : v === Vote.FIX ? 'ให้แก้ไข' : 'ไม่อนุมัติ'}</span></label>
                   ))}
                </div>
                <textarea className="w-full border p-2 rounded-lg mb-4 text-sm" rows={4} placeholder="ข้อเสนอแนะเพิ่มเติม..." value={comment} onChange={e => setComment(e.target.value)}></textarea>
                <div className="relative mb-2"><Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="url" placeholder="ลิงก์ไฟล์แนบประกอบ (ไม่บังคับ)" className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm" value={reviewerLink} onChange={e => setReviewerLink(e.target.value)} /></div>
                <div className="relative mb-4"><FileText className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="url" placeholder="ลิงก์รายละเอียดกระบวนการ (ถ้ามี)" className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm" value={reviewProcessLink} onChange={e => setReviewProcessLink(e.target.value)} /></div>
                <button onClick={handleReviewerSubmit} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">ยืนยันผลการพิจารณา</button>
             </div>
          )}
          {hasPermission(user.role, Permission.FINALIZE_DECISION) && proposal.status === ProposalStatus.PENDING_DECISION && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-200 ring-2 ring-purple-50">
                <h3 className="font-bold mb-2 text-purple-700">สรุปผลการพิจารณา</h3>
                <div className="space-y-3 mb-4">
                   <select className="w-full p-2 border rounded" value={adminDecision} onChange={(e) => setAdminDecision(e.target.value as Vote)}>
                      <option value={Vote.APPROVE}>อนุมัติ (ดำเนินการออกใบรับรอง)</option>
                      <option value={Vote.FIX}>ให้แก้ไข (ส่งคืนผู้วิจัย)</option>
                      <option value={Vote.REJECT}>ไม่อนุมัติ</option>
                   </select>
                </div>
                <textarea className="w-full border p-2 rounded-lg mb-3 text-sm" rows={4} placeholder="ข้อความสรุปถึงผู้วิจัย (Feedback Text)..." value={adminFeedback} onChange={e => setAdminFeedback(e.target.value)}></textarea>
                <div className="mb-4"><label className="block text-xs font-semibold text-purple-800 mb-1">ลิงก์ไฟล์ข้อเสนอแนะ (รวมจากกรรมการ)</label><div className="relative"><Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="url" className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm" value={adminFileLink} onChange={e => setAdminFileLink(e.target.value)} /></div></div>
                {adminDecision === Vote.APPROVE && (
                   <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-100"><label className="block text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1"><ShieldCheck size={14} /> ลิงก์ใบรับรอง (Certificate Link)</label><div className="relative"><Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="url" className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm" placeholder="ใส่ลิงก์ Google Drive (ถ้ามี) หรือกดบันทึกเพื่อออก E-Cert" value={adminCertLink} onChange={e => setAdminCertLink(e.target.value)} /></div></div>
                )}
                <button onClick={handleAdminFinalize} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium">บันทึกและแจ้งผล</button>
             </div>
          )}
          {hasPermission(user.role, Permission.ISSUE_CERTIFICATE) && proposal.status === ProposalStatus.WAITING_CERT && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-200 ring-2 ring-purple-50">
                <h3 className="font-bold mb-2 text-purple-700 flex items-center gap-2"><ShieldCheck size={20} /> ออกใบรับรอง</h3>
                
                <div className="flex gap-2 mb-4">
                    <button onClick={() => onNavigate('certificate', { id: proposal.id })} className="flex-1 bg-white border border-purple-200 text-purple-700 py-2 rounded hover:bg-purple-50 flex justify-center items-center gap-2 text-sm">
                        <Printer size={16} /> Preview E-Cert
                    </button>
                </div>

                <div className="mb-4 relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-slate-500">หรือ แนบลิงก์ไฟล์ภายนอก</span>
                    </div>
                </div>

                <div className="mb-4"><label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ใบรับรอง (Google Drive)</label><div className="relative"><Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="url" className="w-full border pl-10 pr-3 py-2 rounded-lg text-sm" value={adminCertLink} onChange={e => setAdminCertLink(e.target.value)} /></div></div>
                
                <button onClick={handleAdminIssueCert} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium flex justify-center items-center gap-2"><FileCheck size={18} /> ยืนยันออกใบรับรอง</button>
             </div>
          )}
          {proposal.status === ProposalStatus.APPROVED && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200">
               <h3 className="font-bold mb-3 text-green-700">สถานะโครงการ</h3>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-green-50 pb-2"><span className="text-slate-500">เลขที่ใบรับรอง</span><span className="font-medium text-slate-800">{proposal.approvalDetail?.certificateNumber || proposal.certNumber}</span></div>
                  <div className="flex justify-between items-center border-b border-green-50 pb-2"><span className="text-slate-500">วันที่รับรอง</span><span className="font-medium text-slate-800">{proposal.approvalDetail?.issuanceDate || proposal.approvalDate}</span></div>
                  <div className="flex justify-between items-center border-b border-green-50 pb-2"><span className="text-slate-500">หมดอายุ</span><span className="font-medium text-slate-800">{proposal.approvalDetail?.expiryDate || 'N/A'}</span></div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalDetail;
