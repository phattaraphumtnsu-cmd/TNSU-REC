
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Proposal, ProposalStatus, Role, Vote, Review, User, ReviewType, ReportType, Permission, hasPermission, ReviewerStatus } from '../types';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertTriangle, FileText, UserPlus, Send, MessageSquare, Clock, Calendar, ShieldCheck, Link2, History, AlertCircle, FileCheck, Loader2, Printer, Info, ChevronDown, ChevronUp, Users, PenTool, X, Award, UserCheck, Gavel, Search, Briefcase, RotateCcw, Shield, Trash2, RefreshCw, Phone } from 'lucide-react';

interface ProposalDetailProps {
  id: string;
  onNavigate: (page: string, params?: any) => void;
}

const ProposalDetail: React.FC<ProposalDetailProps> = ({ id, onNavigate }) => {
  const user = db.currentUser;
  
  const [proposal, setProposal] = useState<Proposal | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // Reviewer selection states
  const [reviewersList, setReviewersList] = useState<User[]>([]);
  const [reviewerWorkload, setReviewerWorkload] = useState<Record<string, number>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');

  // Action Loading State
  const [actionLoading, setActionLoading] = useState(false);

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
  
  // Admin Certificate State
  const [certData, setCertData] = useState({
      number: '',
      issueDate: '',
      expiryDate: '',
      link: ''
  });

  // Researcher Revision State
  const [revisionLink, setRevisionLink] = useState('');
  const [revisionNoteLink, setRevisionNoteLink] = useState('');
  const [confirmRevise, setConfirmRevise] = useState(false);

  // Advisor Reject State
  const [advisorRejectReason, setAdvisorRejectReason] = useState('');
  const [showAdvisorReject, setShowAdvisorReject] = useState(false);

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
            if (user?.roles.includes(Role.ADMIN)) {
                // Fetch list and workload
                const [rList, workload] = await Promise.all([
                    db.getUsersByRole(Role.REVIEWER),
                    db.getReviewerWorkload()
                ]);
                setReviewersList(rList);
                setReviewerWorkload(workload);
            }
            
            // Init cert data if waiting
            if (p && p.status === ProposalStatus.WAITING_CERT) {
                const today = new Date();
                const nextYear = new Date(today);
                nextYear.setFullYear(today.getFullYear() + 1);
                
                setCertData({
                    number: p.approvalDetail?.certificateNumber || p.certNumber || '',
                    issueDate: today.toISOString().split('T')[0],
                    expiryDate: nextYear.toISOString().split('T')[0],
                    link: p.certLink || ''
                });
            }

        } catch (e) {
            console.error("Failed to fetch proposal", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [id, user?.roles]);

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
      setShowAdvisorReject(false);
      setAdvisorRejectReason('');
  };

  // Determine what feedback to show based on status
  const isRejectedByAdmin = proposal.status === ProposalStatus.ADMIN_REJECTED;
  const isRevisionReq = proposal.status === ProposalStatus.REVISION_REQ;
  
  const feedbackToShow = isRejectedByAdmin ? proposal.adminFeedback : proposal.consolidatedFeedback;
  const feedbackFileToShow = proposal.consolidatedFileLink;

  // --- Actions ---

  const handleAdvisorApprove = async () => {
    if(!window.confirm("ยืนยันการอนุมัติโครงการเพื่อส่งต่อให้เจ้าหน้าที่ (Admin)?")) return;
    setActionLoading(true);
    try {
        await db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_ADMIN_CHECK });
        alert('อนุมัติให้นักศึกษาแล้ว สถานะเปลี่ยนเป็น "รอเจ้าหน้าที่ตรวจสอบ"');
        await reloadProposal();
    } catch(e: any) {
        console.error(e);
        alert('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleAdvisorReject = async () => {
      if(!advisorRejectReason.trim()) return alert('กรุณาระบุเหตุผล');
      if(!window.confirm("ยืนยันการส่งคืนโครงการให้นักศึกษาแก้ไข?")) return;
      setActionLoading(true);
      try {
        await db.advisorRejectProposal(proposal.id, advisorRejectReason);
        alert('ส่งคืนโครงการให้แก้ไขเรียบร้อยแล้ว');
        await reloadProposal();
      } catch(e: any) {
        console.error(e);
        alert('เกิดข้อผิดพลาด: ' + e.message);
      } finally {
        setActionLoading(false);
      }
  }

  const handleAdminAssign = async () => {
    if (selectedReviewers.length === 0) return alert('เลือกกรรมการอย่างน้อย 1 ท่าน');
    setActionLoading(true);
    try {
        await db.assignReviewers(proposal.id, selectedReviewers, proposal.titleTh);
        alert('มอบหมายกรรมการเรียบร้อย (ระบบรอการตอบรับจากกรรมการ)');
        setShowAssignModal(false);
        reloadProposal();
    } catch (e: any) {
        alert('Error: ' + e.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleAdminResetStatus = async () => {
      if(!window.confirm("คำเตือน: การรีเซ็ตสถานะจะเปลี่ยนสถานะกลับเป็น 'รอเจ้าหน้าที่ตรวจสอบ' (Pending Admin Check)\n\nใช้ในกรณีที่เกิดข้อผิดพลาดในการเปลี่ยนสถานะ หรือต้องการเริ่มกระบวนการตรวจสอบใหม่ ยืนยันหรือไม่?")) return;
      
      setActionLoading(true);
      try {
          await db.updateProposal(proposal.id, {
              status: ProposalStatus.PENDING_ADMIN_CHECK,
          });
          alert('รีเซ็ตสถานะโครงการเรียบร้อยแล้ว');
          await reloadProposal();
      } catch (e: any) {
          alert('Error: ' + e.message);
      } finally {
          setActionLoading(false);
      }
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

  const handleReviewerAccept = async (accepted: boolean) => {
      setActionLoading(true);
      try {
          const status = accepted ? ReviewerStatus.ACCEPTED : ReviewerStatus.DECLINED;
          await db.updateReviewerStatus(proposal.id, user.id, status, proposal.reviewerStates || {});
          
          if (!accepted) {
              alert('ท่านได้ปฏิเสธการพิจารณาโครงการนี้ (ระบบจะแจ้ง Admin ทราบ)');
          } else {
              alert('ท่านได้ตอบรับการพิจารณาแล้ว');
          }
          await reloadProposal();
      } catch (e: any) {
          alert('Error: ' + e.message);
      } finally {
          setActionLoading(false);
      }
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

    let alertMsg = '';

    if (adminDecision === Vote.FIX) {
       updates.status = ProposalStatus.REVISION_REQ;
       alertMsg = 'บันทึกผล "ให้แก้ไข" เรียบร้อยแล้ว ระบบจะแจ้งผู้วิจัย';
    } else if (adminDecision === Vote.REJECT) {
       updates.status = ProposalStatus.REJECTED;
       alertMsg = 'บันทึกผล "ไม่อนุมัติ" เรียบร้อยแล้ว';
    } else {
       // APPROVE case: Move to WAITING_CERT first to allow time for signing
       updates.status = ProposalStatus.WAITING_CERT;
       alertMsg = 'บันทึกผลอนุมัติเรียบร้อย (สถานะ: รอออกใบรับรอง) - กรุณาดำเนินการออกใบรับรองในขั้นตอนถัดไป';
    }
    
    await db.updateProposal(proposal.id, updates);
    alert(alertMsg);
    reloadProposal();
  };

  const handleAdminIssueCert = async () => {
     if (!certData.link) {
         if(!window.confirm("คุณไม่ได้ระบุลิงก์ใบรับรอง ยืนยันที่จะบันทึกโดยไม่มีลิงก์หรือไม่?")) return;
     }

     // Admin confirms cert issuance with edited details
     const updates: any = {
        status: ProposalStatus.APPROVED,
        approvalDetail: {
            certificateNumber: certData.number, // Uses the edited number or auto-generated one if empty (handled by DB if undefined)
            issuanceDate: certData.issueDate,
            expiryDate: certData.expiryDate
        },
        certNumber: certData.number,
        certLink: certData.link,
        approvalDate: certData.issueDate,
        nextReportDueDate: new Date(new Date(certData.issueDate).setMonth(new Date(certData.issueDate).getMonth() + 6)).toISOString().split('T')[0]
     };

     await db.updateProposal(proposal.id, updates);
     alert('บันทึกข้อมูลใบรับรองและเปลี่ยนสถานะเป็น "อนุมัติ/ได้รับใบรับรอง" เรียบร้อยแล้ว');
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

  const handleResearcherWithdraw = async () => {
      const reason = prompt("กรุณาระบุเหตุผลที่ต้องการถอนโครงการ:");
      if (reason === null) return; 
      
      if (window.confirm("คำเตือน: การถอนโครงการจะไม่สามารถย้อนกลับได้ คุณต้องการดำเนินการต่อหรือไม่?")) {
          setActionLoading(true);
          try {
              await db.withdrawProposal(proposal.id, reason);
              alert("ถอนโครงการเรียบร้อยแล้ว");
              reloadProposal();
          } catch(e: any) {
              alert("Error: " + e.message);
          } finally {
              setActionLoading(false);
          }
      }
  };

  const handleResearcherRenew = async () => {
      if (window.confirm("ยืนยันการขอยื่นต่ออายุใบรับรอง (Renewal)?")) {
          setActionLoading(true);
          try {
              await db.requestRenewal(proposal.id);
              alert("ส่งคำขอต่ออายุเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบ");
              reloadProposal();
          } catch(e: any) {
              alert("Error: " + e.message);
          } finally {
              setActionLoading(false);
          }
      }
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
    if (proposal.status === ProposalStatus.WAITING_CERT) color = 'bg-teal-100 text-teal-800 border border-teal-200';
    if (proposal.status === ProposalStatus.IN_REVIEW) color = 'bg-blue-100 text-blue-700';
    if (proposal.status === ProposalStatus.PENDING_ADVISOR) color = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (proposal.status === ProposalStatus.WITHDRAWN) color = 'bg-gray-200 text-gray-600 border border-gray-300';
    if (proposal.status === ProposalStatus.RENEWAL_REQUESTED) color = 'bg-cyan-100 text-cyan-800 border border-cyan-200';
    
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{proposal.status}</span>;
  };

  // Filter and Sort Reviewers based on workload
  const filteredReviewers = reviewersList
      .filter(r => r.name.toLowerCase().includes(assignSearch.toLowerCase()) || r.email.toLowerCase().includes(assignSearch.toLowerCase()))
      .sort((a, b) => {
          // Sort by workload (ascending) then name
          const wa = reviewerWorkload[a.id] || 0;
          const wb = reviewerWorkload[b.id] || 0;
          if (wa !== wb) return wa - wb;
          return a.name.localeCompare(b.name);
      });

  const getMyReviewerStatus = (): ReviewerStatus => {
      if (!proposal.reviewerStates) return ReviewerStatus.PENDING; // Fallback
      return proposal.reviewerStates[user.id] || ReviewerStatus.PENDING;
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={20} className="mr-2" /> กลับไปแดชบอร์ด
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{proposal.code || 'รอรหัส'}</span>
             {renderStatusBadge()}
           </div>
           <h1 className="text-xl font-bold text-slate-900">{proposal.titleTh}</h1>
           <p className="text-slate-500">{proposal.titleEn}</p>
        </div>
        
        {proposal.status === ProposalStatus.APPROVED && (
           <div className="flex flex-col items-end gap-2">
             <div className="flex gap-2">
                {proposal.certLink ? (
                    <a href={proposal.certLink} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition-transform active:scale-95 text-sm">
                        <Award size={18} /> ดาวน์โหลดใบรับรอง (E-Certificate)
                    </a>
                ) : (
                    <span className="text-sm text-slate-400 italic bg-slate-100 px-3 py-1 rounded">ไม่พบลิงก์ใบรับรอง</span>
                )}
             </div>
             <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12}/> วันที่รับรอง: {proposal.approvalDetail?.issuanceDate || proposal.approvalDate}
             </div>
           </div>
        )}
      </div>

      {/* --- ADVISOR APPROVAL SECTION --- */}
      {user.id === proposal.advisorId && proposal.status === ProposalStatus.PENDING_ADVISOR && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2 mb-4">
                <UserCheck size={24} /> ส่วนสำหรับอาจารย์ที่ปรึกษา (Advisor Review)
            </h3>
            <p className="text-sm text-orange-800 mb-6 bg-white p-4 rounded-lg border border-orange-100">
                <strong>คำแนะนำ:</strong> กรุณาตรวจสอบเอกสารและรายละเอียดโครงการของนักศึกษาด้านล่าง
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-700">
                    <li>หากข้อมูลถูกต้องครบถ้วน: กดปุ่ม <span className="text-green-600 font-bold">"อนุมัติ (Approve)"</span> เพื่อส่งต่อให้เจ้าหน้าที่ (Admin) ดำเนินการต่อ</li>
                    <li>หากต้องแก้ไข: กดปุ่ม <span className="text-red-600 font-bold">"ส่งคืนแก้ไข (Return)"</span> และระบุข้อเสนอแนะเพื่อให้นักศึกษาปรับปรุง</li>
                </ul>
            </p>

            <div className="flex flex-col md:flex-row gap-4">
                <button
                    onClick={handleAdvisorApprove}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    อนุมัติโครงการ (Approve)
                </button>
                
                <div className="flex-1">
                    <button
                        onClick={() => setShowAdvisorReject(!showAdvisorReject)}
                        disabled={actionLoading}
                        className={`w-full py-3 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${showAdvisorReject ? 'bg-red-50 text-red-700 border-2 border-red-200' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}
                    >
                        <XCircle size={20} /> ส่งคืนเพื่อแก้ไข (Return)
                    </button>
                </div>
            </div>
            
            {showAdvisorReject && (
                <div className="mt-4 bg-white p-4 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">ระบุเหตุผล/สิ่งที่ต้องแก้ไข (เพื่อแจ้งให้นักศึกษาทราบ)</label>
                    <textarea
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        rows={3}
                        placeholder="เช่น เอกสารแนบไม่ครบถ้วน, ชื่อเรื่องภาษาอังกฤษสะกดผิด, ข้อมูลในแบบฟอร์มไม่ตรงกับโครงร่าง..."
                        value={advisorRejectReason}
                        onChange={(e) => setAdvisorRejectReason(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                        <button 
                            onClick={handleAdvisorReject}
                            disabled={actionLoading}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-700 font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {actionLoading && <Loader2 className="animate-spin" size={16} />}
                            ยืนยันการส่งคืน
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Certificate Issuance Section for Admin (Waiting Cert) */}
          {hasPermission(user.roles, Permission.ISSUE_CERTIFICATE) && proposal.status === ProposalStatus.WAITING_CERT && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 shadow-sm animate-in slide-in-from-top-2">
                <h3 className="text-lg font-bold text-teal-800 flex items-center gap-2 mb-4">
                    <Award size={24} /> จัดการออกใบรับรอง (Issue Certificate)
                </h3>
                <div className="bg-white p-4 rounded-lg border border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                         <label className="block text-sm font-semibold text-slate-700 mb-1">เลขที่ใบรับรอง (Certificate No.)</label>
                         <input 
                            type="text" 
                            className="w-full border border-slate-300 p-2.5 rounded-lg bg-slate-50"
                            placeholder="ระบบจะสร้างให้อัตโนมัติหากเว้นว่าง (เช่น SCI 001/2569)"
                            value={certData.number}
                            onChange={(e) => setCertData({...certData, number: e.target.value})}
                         />
                         <p className="text-xs text-slate-500 mt-1">* หากเว้นว่าง ระบบจะรันเลขให้อัตโนมัติตามลำดับ</p>
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-sm font-semibold text-slate-700 mb-1">ลิงก์ไฟล์ใบรับรอง (Certificate URL)</label>
                         <div className="relative">
                            <ExternalLink className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type="url" 
                                className="w-full border border-slate-300 pl-10 pr-3 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="https://drive.google.com/..."
                                value={certData.link}
                                onChange={(e) => setCertData({...certData, link: e.target.value})}
                            />
                         </div>
                         <p className="text-xs text-slate-500 mt-1">* กรุณาวางลิงก์ Google Drive หรือลิงก์ไฟล์ PDF ของใบรับรองที่ลงนามแล้ว</p>
                     </div>
                     <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">วันที่ออกใบรับรอง (Issuance Date)</label>
                         <input 
                            type="date" 
                            className="w-full border border-slate-300 p-2.5 rounded-lg bg-white"
                            value={certData.issueDate}
                            onChange={(e) => setCertData({...certData, issueDate: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">วันหมดอายุ (Expiry Date)</label>
                         <input 
                            type="date" 
                            className="w-full border border-slate-300 p-2.5 rounded-lg bg-white"
                            value={certData.expiryDate}
                            onChange={(e) => setCertData({...certData, expiryDate: e.target.value})}
                         />
                     </div>
                     <div className="md:col-span-2 flex justify-end mt-2">
                         <button 
                            onClick={handleAdminIssueCert}
                            className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 shadow-sm transition-all active:scale-95 flex items-center gap-2"
                         >
                            <CheckCircle size={18} /> บันทึกข้อมูลใบรับรอง
                         </button>
                     </div>
                </div>
            </div>
          )}

          {/* Action Required Banner for Researcher */}
          {hasPermission(user.roles, Permission.SUBMIT_REVISION) && (isRejectedByAdmin || isRevisionReq) && (
             <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-1" size={24} />
                <div>
                   <h3 className="font-bold text-red-800">โปรดดำเนินการแก้ไข (Action Required)</h3>
                   <p className="text-sm text-red-700 mt-1">
                      {isRejectedByAdmin 
                        ? 'เจ้าหน้าที่/ที่ปรึกษา ได้ตรวจสอบเอกสารแล้วพบว่าไม่ครบถ้วนหรือต้องแก้ไข กรุณาดูรายละเอียดด้านล่างและส่งเอกสารใหม่'
                        : 'คณะกรรมการพิจารณาแล้วมีมติ "ให้แก้ไข" กรุณาปรับปรุงข้อมูลตามข้อเสนอแนะและส่งกลับเข้าระบบ'}
                   </p>
                </div>
             </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <div className="flex justify-between items-start mb-4 border-b pb-2">
                <h3 className="font-semibold text-lg text-slate-800">รายละเอียดโครงการ</h3>
                <div className="flex gap-2">
                    {/* Researcher Actions: Withdraw & Renew */}
                    {hasPermission(user.roles, Permission.WITHDRAW_PROPOSAL) && 
                        user.id === proposal.researcherId && 
                        proposal.status !== ProposalStatus.APPROVED && 
                        proposal.status !== ProposalStatus.REJECTED && 
                        proposal.status !== ProposalStatus.WITHDRAWN && (
                        <button onClick={handleResearcherWithdraw} className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                            <Trash2 size={12} /> ถอนโครงการ
                        </button>
                    )}
                    
                    {hasPermission(user.roles, Permission.REQUEST_RENEWAL) && 
                        proposal.status === ProposalStatus.APPROVED && (
                        <button onClick={handleResearcherRenew} className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                            <RefreshCw size={12} /> ขอต่ออายุใบรับรอง
                        </button>
                    )}
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 block">ผู้วิจัย:</span> {proposal.researcherName}</div>
                <div><span className="text-slate-500 block">สังกัด:</span> {proposal.faculty} ({proposal.campus})</div>
                <div><span className="text-slate-500 block">ประเภท:</span> {proposal.type}</div>
                <div><span className="text-slate-500 block">วันที่ยื่น:</span> {proposal.submissionDate}</div>
                {proposal.advisorName && <div><span className="text-slate-500 block">ที่ปรึกษา:</span> {proposal.advisorName}</div>}
                
                {/* Contact Info for Admin/Reviewer */}
                {(user.roles.includes(Role.ADMIN) || user.roles.includes(Role.REVIEWER)) && proposal.researcherPhone && (
                    <div className="col-span-2 mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                        <Phone size={18} className="text-blue-600" />
                        <div>
                            <span className="text-xs text-blue-700 block font-bold">ช่องทางติดต่อผู้วิจัย (Contact Researcher)</span>
                            <span className="text-sm font-medium text-slate-800">{proposal.researcherPhone}</span>
                        </div>
                    </div>
                )}

                {/* NEW FIELDS */}
                <div className="col-span-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block font-medium mb-1">วัตถุประสงค์:</span> 
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2 rounded">{proposal.objective || '-'}</p>
                </div>
                <div><span className="text-slate-500 block">จำนวนกลุ่มตัวอย่าง:</span> {proposal.sampleCount ? `${proposal.sampleCount} คน` : '-'}</div>
                <div><span className="text-slate-500 block">ระยะเวลาดำเนินการ:</span> {proposal.duration ? `${proposal.duration} เดือน` : '-'}</div>
             </div>
             
             <div className="mt-6 flex flex-col gap-2">
                <a href={proposal.fileLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <ExternalLink size={16} /> ลิงก์เอกสารโครงการ (Google Drive ของผู้วิจัย)
                </a>
                
                {/* FIX: Moved Revision Link Here (Permanent Visibility) */}
                {proposal.revisionLink && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mt-1 animate-pulse">
                        <p className="text-xs text-orange-800 font-bold mb-1 flex items-center gap-1">
                            <AlertCircle size={12}/> เอกสารฉบับแก้ไข (Revised Files):
                        </p>
                        <a href={proposal.revisionLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-orange-700 hover:underline text-sm font-medium">
                            <ExternalLink size={14} /> เปิดดูไฟล์แก้ไขล่าสุด (ครั้งที่ {proposal.revisionCount})
                        </a>
                        {proposal.revisionNoteLink && (
                            <a href={proposal.revisionNoteLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-600 hover:underline text-xs mt-1 ml-5">
                                <FileText size={12} /> บันทึกข้อความชี้แจง
                            </a>
                        )}
                    </div>
                )}
                
                {/* Admin Consolidated Link (Displayed prominently if exists) */}
                {proposal.consolidatedFileLink && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <p className="text-xs text-purple-800 font-bold mb-1">เอกสารฉบับรวบรวม (โดย Admin):</p>
                        <a href={proposal.consolidatedFileLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-purple-700 hover:underline text-sm font-medium">
                            <Shield size={14} /> ลิงก์เอกสารสำหรับกรรมการ
                        </a>
                    </div>
                )}

                {proposal.paymentSlipLink && (
                   <a href={proposal.paymentSlipLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-3 rounded-lg border border-blue-100">
                     <FileText size={16} /> หลักฐานการชำระเงิน
                   </a>
                )}
             </div>

             {/* Admin/Reviewer view of Pending Revisions (Removed as it is now duplicated above, but kept simple if status allows specific actions) */}
             {(hasPermission(user.roles, Permission.ASSIGN_REVIEWERS)) && 
               proposal.status === ProposalStatus.PENDING_ADMIN_CHECK && proposal.revisionLink && (
                <div className="mt-4 text-xs text-slate-500 text-center">
                   * ขณะนี้สถานะคือ "รอเจ้าหน้าที่ตรวจสอบ" ไฟล์แก้ไขด้านบนคือไฟล์ล่าสุดที่ส่งมา
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

          {/* New: Review Progress for Admin (IMPROVED to show comments and links) */}
          {user.roles.includes(Role.ADMIN) && proposal.reviewers && proposal.reviewers.length > 0 && (
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
                     const acceptanceStatus = proposal.reviewerStates?.[reviewerId] || ReviewerStatus.PENDING;

                     return (
                        <div key={reviewerId} className="px-6 py-4 flex flex-col gap-3 hover:bg-slate-50">
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${reviewData ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                     {index + 1}
                                  </div>
                                  <div>
                                     <div className="font-medium text-slate-800">
                                        {reviewerInfo ? reviewerInfo.name : 'Unknown Reviewer'}
                                     </div>
                                     <div className="text-xs text-slate-500 flex items-center gap-2">
                                        {reviewerInfo?.faculty || 'Reviewer'}
                                        {/* Acceptance Status Badge */}
                                        {acceptanceStatus === ReviewerStatus.PENDING && <span className="bg-yellow-100 text-yellow-800 px-1.5 rounded-[4px] text-[10px]">รอตอบรับ</span>}
                                        {acceptanceStatus === ReviewerStatus.ACCEPTED && <span className="bg-green-100 text-green-800 px-1.5 rounded-[4px] text-[10px]">ตอบรับแล้ว</span>}
                                        {acceptanceStatus === ReviewerStatus.DECLINED && <span className="bg-red-100 text-red-800 px-1.5 rounded-[4px] text-[10px]">ปฏิเสธ</span>}
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
                           
                           {/* Review Content Detail (Admin View) */}
                           {reviewData && (
                                <div className="ml-11 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                    {reviewData.comment && (
                                        <div className="text-sm text-slate-600">
                                            <span className="font-semibold text-slate-700 mr-1">ความเห็น:</span> 
                                            {reviewData.comment}
                                        </div>
                                    )}
                                    {reviewData.fileLink && (
                                        <a href={reviewData.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline bg-white px-2 py-1 rounded border border-blue-100 w-fit">
                                            <Link2 size={12} /> เอกสารแนบจากกรรมการ (Reviewer Attachment)
                                        </a>
                                    )}
                                </div>
                           )}
                        </div>
                     );
                  })}
               </div>
             </div>
          )}

          {/* Feedback & Revision Submission Section - IMPROVED UI */}
          {(hasPermission(user.roles, Permission.FINALIZE_DECISION) || hasPermission(user.roles, Permission.SUBMIT_REVISION)) && (feedbackToShow || feedbackFileToShow) && (
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
                              {isRejectedByAdmin ? 'สิ่งที่ต้องแก้ไข (จากเจ้าหน้าที่/ที่ปรึกษา)' : 'มติคณะกรรมการ: ให้แก้ไข (Revision Required)'}
                          </h3>
                          <p className={`text-sm ${isRejectedByAdmin ? 'text-red-700' : 'text-orange-700'}`}>
                              {isRejectedByAdmin ? 'ข้อเสนอแนะจากเจ้าหน้าที่ (Admin/Advisor Feedback)' : 'ข้อสรุปจากคณะกรรมการ (Committee Consensus)'}
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
                      {hasPermission(user.roles, Permission.SUBMIT_REVISION) && (isRevisionReq || isRejectedByAdmin) && (
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

          {/* Post Approval */}
          {proposal.status === ProposalStatus.APPROVED && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                   <h3 className="font-bold text-green-800 flex items-center gap-2">
                      <Clock size={20} /> ติดตามความก้าวหน้าโครงการ
                   </h3>
                   {hasPermission(user.roles, Permission.ACKNOWLEDGE_PROGRESS_REPORT) && (
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
                                     hasPermission(user.roles, Permission.ACKNOWLEDGE_PROGRESS_REPORT) ? (
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
                   {hasPermission(user.roles, Permission.SUBMIT_PROGRESS_REPORT) && (
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
          {/* Blind Review: Only show names if Admin. If Researcher/Advisor, hide names. */}
          {user.roles.includes(Role.RESEARCHER) && !user.roles.includes(Role.ADMIN) && proposal.reviews && proposal.reviews.length > 0 && (
             <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-6">
                <h3 className="font-semibold text-slate-800 mb-4">ความเห็นจากคณะกรรมการ ({proposal.reviews.length} ท่าน)</h3>
                <div className="space-y-4">
                  {proposal.reviews.map((r, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                       <div className="flex justify-between mb-2">
                          {/* Blind Review: Hide Name */}
                          <span className="font-medium text-slate-700">กรรมการท่านที่ {idx + 1}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.vote === Vote.APPROVE ? 'bg-green-100 text-green-700' : r.vote === Vote.FIX ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{r.vote}</span>
                       </div>
                       <p className="text-slate-600 text-sm mb-2">{r.comment}</p>
                       <div className="flex flex-wrap gap-2">
                         {r.fileLink && (
                            <a href={r.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                               <Link2 size={12} /> เอกสารแนบจากกรรมการ
                            </a>
                         )}
                         {/* Review Process Link usually generic, safe to show? Yes. */}
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>

        {/* Right: Actions Sidebar */}
        <div className="space-y-6">
            {/* Admin Management Widget */}
            {hasPermission(user.roles, Permission.ASSIGN_REVIEWERS) && proposal.status === ProposalStatus.PENDING_ADMIN_CHECK && (
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                        <Users className="text-blue-600" size={20} />
                        <h3 className="font-bold text-blue-800">จัดการโครงการ (Admin)</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">มอบหมายกรรมการ</label>
                            
                            <button 
                                onClick={() => setShowAssignModal(true)}
                                className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} />
                                เลือกกรรมการ ({selectedReviewers.length})
                            </button>
                            
                            {selectedReviewers.length > 0 && (
                                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                                    {reviewersList.filter(r => selectedReviewers.includes(r.id)).map(r => (
                                        <div key={r.id} className="text-sm bg-slate-50 p-2 rounded flex justify-between items-center border border-slate-100">
                                            <span>{r.name}</span>
                                            <button 
                                                onClick={() => setSelectedReviewers(prev => prev.filter(id => id !== r.id))}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-slate-500 mt-2">เลือกกรรมการอย่างน้อย 1 ท่าน</p>
                        </div>
                        <button 
                            onClick={handleAdminAssign}
                            disabled={selectedReviewers.length === 0}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ยืนยันมอบหมาย
                        </button>

                        <div className="border-t border-slate-100 pt-4 mt-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">หรือ ส่งคืนแก้ไข (Return)</label>
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="ระบุสิ่งที่ต้องแก้ไข..."
                                rows={2}
                                value={adminPreFeedback}
                                onChange={e => setAdminPreFeedback(e.target.value)}
                            />
                            <button 
                                onClick={handleAdminReturnDocs}
                                disabled={!adminPreFeedback}
                                className="w-full mt-2 bg-white border border-red-200 text-red-600 py-2 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                                ส่งคืนให้ผู้วิจัยแก้ไข
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Decision Widget */}
            {hasPermission(user.roles, Permission.FINALIZE_DECISION) && proposal.status === ProposalStatus.PENDING_DECISION && (
                <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
                    <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                        <Gavel className="text-purple-600" size={20} />
                        <h3 className="font-bold text-purple-800">สรุปผลการพิจารณา</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">มติคณะกรรมการ</label>
                            <div className="flex flex-col gap-2">
                                {[Vote.APPROVE, Vote.FIX, Vote.REJECT].map(v => (
                                    <label key={v} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${adminDecision === v ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="adminVote"
                                            checked={adminDecision === v}
                                            onChange={() => setAdminDecision(v as Vote)}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm font-medium">{v}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">ข้อสรุป/ข้อเสนอแนะรวม</label>
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                rows={4}
                                placeholder="สรุปรายละเอียด..."
                                value={adminFeedback}
                                onChange={e => setAdminFeedback(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">ลิงก์ไฟล์ข้อสรุป (จาก Admin)</label>
                            <div className="relative">
                                <Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="url"
                                    className="w-full border border-slate-300 rounded-lg pl-9 p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="https://... (สำหรับกรรมการ/ผู้วิจัย)"
                                    value={adminFileLink}
                                    onChange={e => setAdminFileLink(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">ไฟล์นี้จะแสดงให้กรรมการและผู้วิจัยเห็น</p>
                        </div>

                        <button 
                            onClick={handleAdminFinalize}
                            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm"
                        >
                            บันทึกผลการพิจารณา
                        </button>
                    </div>
                </div>
            )}

            {/* Reviewer Action Widget */}
            {hasPermission(user.roles, Permission.VOTE_AS_REVIEWER) && proposal.status === ProposalStatus.IN_REVIEW && proposal.reviewers.includes(user.id) && (
                <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
                        <PenTool className="text-indigo-600" size={20} />
                        <h3 className="font-bold text-indigo-800">ส่วนของกรรมการ</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* 1. Acceptance Section */}
                        {getMyReviewerStatus() === ReviewerStatus.PENDING && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center space-y-3">
                                <p className="text-sm font-semibold text-yellow-800">ท่านได้รับมอบหมายให้พิจารณาโครงการนี้</p>
                                <p className="text-xs text-yellow-700">กรุณาตอบรับการพิจารณาเพื่อเริ่มดำเนินการ</p>
                                <div className="flex gap-2 justify-center">
                                    <button 
                                        onClick={() => handleReviewerAccept(true)}
                                        disabled={actionLoading}
                                        className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                    >
                                        ตอบรับ (Accept)
                                    </button>
                                    <button 
                                        onClick={() => handleReviewerAccept(false)}
                                        disabled={actionLoading}
                                        className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded text-sm hover:bg-red-50 disabled:opacity-50"
                                    >
                                        ปฏิเสธ (Decline)
                                    </button>
                                </div>
                            </div>
                        )}

                        {getMyReviewerStatus() === ReviewerStatus.DECLINED && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                                <XCircle className="mx-auto text-red-500 mb-2" size={32} />
                                <p className="text-sm font-bold text-red-800">ท่านได้ปฏิเสธการพิจารณา</p>
                                <p className="text-xs text-red-600">หากต้องการเปลี่ยนแปลง กรุณาติดต่อ Admin</p>
                            </div>
                        )}

                        {/* 2. Review Form (Only if Accepted) */}
                        {getMyReviewerStatus() === ReviewerStatus.ACCEPTED && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 border border-blue-100">
                                    ท่านได้ตอบรับแล้ว กรุณาพิจารณาเอกสารและระบุความเห็น
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">ผลการพิจารณา</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[Vote.APPROVE, Vote.FIX, Vote.REJECT].map(v => (
                                            <label key={v} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${vote === v ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-slate-50'}`}>
                                                <input type="radio" name="reviewerVote" checked={vote === v} onChange={() => setVote(v as Vote)} className="text-indigo-600"/>
                                                <span className="text-sm">{v}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">ข้อคิดเห็น/ข้อเสนอแนะ</label>
                                    <textarea 
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        rows={4}
                                        placeholder="ระบุรายละเอียด..."
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">เอกสารข้อเสนอแนะเพิ่มเติม (ถ้ามี)</label>
                                    <div className="relative">
                                        <Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input 
                                            type="url"
                                            className="w-full border border-slate-300 rounded-lg pl-9 p-2 text-sm"
                                            placeholder="https://drive.google.com/..."
                                            value={reviewerLink}
                                            onChange={e => setReviewerLink(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">ลิงก์ Google Drive หรือไฟล์ PDF ที่มีข้อคิดเห็น (เพื่อให้ Admin รวบรวมส่งผู้วิจัย)</p>
                                </div>

                                <button 
                                    onClick={handleReviewerSubmit}
                                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    ส่งผลการพิจารณา
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Admin Troubleshooting Tools */}
            {user.roles.includes(Role.ADMIN) && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                     <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                        <Shield size={16} className="text-slate-600"/>
                        <h3 className="font-bold text-slate-700 text-sm">เครื่องมือดูแลระบบ (System Tools)</h3>
                     </div>
                     <div className="p-4">
                        <button 
                            onClick={handleAdminResetStatus}
                            className="w-full bg-white border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-red-600 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} /> รีเซ็ตสถานะเป็น "รอตรวจสอบ"
                        </button>
                        <p className="text-xs text-slate-400 mt-2 text-center">
                            ใช้กรณีเกิดข้อผิดพลาดในการเปลี่ยนสถานะ (ข้อมูลโครงการจะไม่หาย)
                        </p>
                     </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Assign Reviewer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">เลือกกรรมการพิจารณา (Assign Reviewers)</h3>
                        <p className="text-sm text-slate-500">เลือกกรรมการที่เหมาะสมตามภาระงานปัจจุบัน</p>
                    </div>
                    <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-4 border-b bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อ หรืออีเมล..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={assignSearch}
                            onChange={(e) => setAssignSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                            <tr>
                                <th className="px-6 py-3">ชื่อ-นามสกุล</th>
                                <th className="px-6 py-3 w-40 text-center">ภาระงาน (Active)</th>
                                <th className="px-6 py-3 w-20 text-center">เลือก</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredReviewers.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">ไม่พบรายชื่อกรรมการ</td></tr>
                            ) : (
                                filteredReviewers.map(r => {
                                    const workload = reviewerWorkload[r.id] || 0;
                                    const isSelected = selectedReviewers.includes(r.id);
                                    const isPreviouslyAssigned = proposal.reviewers?.includes(r.id);
                                    
                                    // Status color based on workload
                                    let statusColor = 'bg-green-100 text-green-700';
                                    if (workload >= 3) statusColor = 'bg-orange-100 text-orange-700';
                                    if (workload >= 6) statusColor = 'bg-red-100 text-red-700';

                                    return (
                                        <tr 
                                            key={r.id} 
                                            className={`hover:bg-blue-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                                            onClick={() => {
                                                if (isSelected) setSelectedReviewers(prev => prev.filter(id => id !== r.id));
                                                else setSelectedReviewers(prev => [...prev, r.id]);
                                            }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800 flex items-center gap-2">
                                                    {r.name}
                                                    {isPreviouslyAssigned && (
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                                            กรรมการเดิม (Current)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">{r.faculty}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                                    <Briefcase size={12} className="mr-1" /> {workload} งาน
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                                    {isSelected && <CheckCircle size={14} className="text-white" />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between items-center">
                    <div className="text-sm font-medium text-slate-600">
                        เลือกแล้ว: <span className="text-blue-600 font-bold">{selectedReviewers.length}</span> ท่าน
                    </div>
                    <button 
                        onClick={() => setShowAssignModal(false)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-transform active:scale-95"
                    >
                        ยืนยันการเลือก
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProposalDetail;
