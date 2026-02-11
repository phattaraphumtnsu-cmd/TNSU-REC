
import React, { useState, useEffect } from 'react';
import { Proposal, ProposalStatus, User, Vote, Role, ReviewerStatus } from '../../types';
import { db } from '../../services/database';
import { Users, UserPlus, X, Loader2, Shield, RotateCcw, Gavel, Link2, RefreshCw, CheckCircle, Award, ExternalLink, AlertCircle, Clock } from 'lucide-react';

interface AdminSectionProps {
  proposal: Proposal;
  user: User;
  onUpdate: () => void;
}

const AdminSection: React.FC<AdminSectionProps> = ({ proposal, user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  // Assignment State
  const [reviewersList, setReviewersList] = useState<User[]>([]);
  const [reviewerWorkload, setReviewerWorkload] = useState<Record<string, number>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [preFeedback, setPreFeedback] = useState('');

  // Decision State
  const [decision, setDecision] = useState<Vote>(Vote.APPROVE);
  const [feedback, setFeedback] = useState('');
  const [fileLink, setFileLink] = useState('');

  // Cert State
  const [certData, setCertData] = useState({ number: '', issueDate: '', expiryDate: '', link: '' });

  useEffect(() => {
    if (proposal.status === ProposalStatus.PENDING_ADMIN_CHECK) {
        Promise.all([
            db.getUsersByRole(Role.REVIEWER),
            db.getReviewerWorkload()
        ]).then(([users, workload]) => {
            setReviewersList(users);
            setReviewerWorkload(workload);
        });
    }
    
    if (proposal.status === ProposalStatus.WAITING_CERT) {
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        setCertData({
            number: proposal.approvalDetail?.certificateNumber || proposal.certNumber || '',
            issueDate: today.toISOString().split('T')[0],
            expiryDate: nextYear.toISOString().split('T')[0],
            link: proposal.certLink || ''
        });
    }
  }, [proposal.status]);

  // --- Handlers ---
  const handleAssign = async () => {
    if (selectedReviewers.length === 0) return alert('เลือกกรรมการอย่างน้อย 1 ท่าน');
    setLoading(true);
    try {
        await db.assignReviewers(proposal.id, selectedReviewers, proposal.titleTh);
        alert('มอบหมายกรรมการเรียบร้อย');
        setShowAssignModal(false);
        onUpdate();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleReturn = async () => {
    if (!preFeedback.trim()) return alert('กรุณาระบุเหตุผล');
    setLoading(true);
    try {
        await db.updateProposal(proposal.id, {
            status: ProposalStatus.ADMIN_REJECTED,
            adminFeedback: preFeedback
        });
        alert('ส่งคืนโครงการให้ผู้วิจัยแก้ไขเรียบร้อยแล้ว');
        setPreFeedback('');
        onUpdate();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
        const updates: Partial<Proposal> = {
            consolidatedFeedback: feedback,
            consolidatedFileLink: fileLink
        };
        if (decision === Vote.FIX) updates.status = ProposalStatus.REVISION_REQ;
        else if (decision === Vote.REJECT) updates.status = ProposalStatus.REJECTED;
        else updates.status = ProposalStatus.WAITING_CERT;
        
        await db.updateProposal(proposal.id, updates);
        alert('บันทึกผลการพิจารณาแล้ว');
        onUpdate();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleIssueCert = async () => {
     setLoading(true);
     try {
        await db.updateProposal(proposal.id, {
            status: ProposalStatus.APPROVED,
            approvalDetail: {
                certificateNumber: certData.number, 
                issuanceDate: certData.issueDate,
                expiryDate: certData.expiryDate
            },
            certNumber: certData.number,
            certLink: certData.link,
            approvalDate: certData.issueDate,
            nextReportDueDate: new Date(new Date(certData.issueDate).setMonth(new Date(certData.issueDate).getMonth() + 6)).toISOString().split('T')[0]
        });
        alert('ออกใบรับรองเรียบร้อย');
        onUpdate();
     } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleResetStatus = async () => {
      if(!window.confirm("ยืนยันรีเซ็ตสถานะเป็น 'รอเจ้าหน้าที่ตรวจสอบ'?")) return;
      setLoading(true);
      try {
          await db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_ADMIN_CHECK });
          onUpdate();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };
  
  const handleRenewApproval = async () => {
      if(!window.confirm("ยืนยันการต่ออายุใบรับรอง +1 ปี?")) return;
      setLoading(true);
      try {
          const currentExpiry = new Date(proposal.approvalDetail?.expiryDate || new Date());
          const newExpiry = new Date(currentExpiry);
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          
          await db.updateProposal(proposal.id, {
              status: ProposalStatus.APPROVED,
              approvalDetail: { ...proposal.approvalDetail, expiryDate: newExpiry.toISOString().split('T')[0] }
          });
          onUpdate();
      } catch(e: any) { alert(e.message); } finally { setLoading(false); }
  };

  // --- Renderers ---

  // 1. Assignment Widget
  if (proposal.status === ProposalStatus.PENDING_ADMIN_CHECK) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                <h3 className="font-bold text-blue-800">จัดการโครงการ (Admin)</h3>
            </div>
            <div className="p-4 space-y-4">
                <button onClick={() => setShowAssignModal(true)} className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3 rounded-lg font-medium hover:bg-blue-100 flex items-center justify-center gap-2">
                    <UserPlus size={18} /> เลือกกรรมการ ({selectedReviewers.length})
                </button>
                {selectedReviewers.length > 0 && (
                     <div className="text-sm bg-slate-50 p-2 rounded border border-slate-100">
                        {reviewersList.filter(r => selectedReviewers.includes(r.id)).map(r => r.name).join(', ')}
                     </div>
                )}
                <button onClick={handleAssign} disabled={loading || selectedReviewers.length === 0} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2">
                    {loading && <Loader2 size={16} className="animate-spin" />} ยืนยันมอบหมาย
                </button>
                <div className="border-t pt-4">
                    <textarea className="w-full border p-2 rounded text-sm" placeholder="ระบุสิ่งที่ต้องแก้ไข..." value={preFeedback} onChange={e => setPreFeedback(e.target.value)} />
                    <button onClick={handleReturn} disabled={loading || !preFeedback} className="w-full mt-2 bg-white border border-red-200 text-red-600 py-2 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 flex justify-center gap-2">
                         {loading && <Loader2 size={16} className="animate-spin" />} ส่งคืนแก้ไข
                    </button>
                </div>
            </div>

            {/* Modal for Selecting Reviewers */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between">
                            <h3 className="font-bold">เลือกกรรมการ</h3>
                            <button onClick={() => setShowAssignModal(false)}><X/></button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                           <input type="text" placeholder="ค้นหา..." className="w-full border p-2 rounded mb-4" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} />
                           {reviewersList.filter(r => r.name.includes(assignSearch)).map(r => (
                               <div key={r.id} onClick={() => {
                                   if(selectedReviewers.includes(r.id)) setSelectedReviewers(prev => prev.filter(id => id !== r.id));
                                   else setSelectedReviewers(prev => [...prev, r.id]);
                               }} className={`p-3 border-b flex justify-between cursor-pointer ${selectedReviewers.includes(r.id) ? 'bg-blue-50' : ''}`}>
                                   <div>
                                       <div>{r.name}</div>
                                       <div className="text-xs text-slate-500">{r.faculty}</div>
                                   </div>
                                   <div className="text-xs bg-slate-100 px-2 py-1 rounded">Load: {reviewerWorkload[r.id] || 0}</div>
                               </div>
                           ))}
                        </div>
                        <div className="p-4 border-t">
                            <button onClick={() => setShowAssignModal(false)} className="w-full bg-blue-600 text-white py-2 rounded">เสร็จสิ้น</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // 2. Decision Widget
  if (proposal.status === ProposalStatus.PENDING_DECISION) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
             <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                <Gavel className="text-purple-600" size={20} />
                <h3 className="font-bold text-purple-800">สรุปผลการพิจารณา</h3>
             </div>
             <div className="p-4 space-y-4">
                 {[Vote.APPROVE, Vote.FIX, Vote.REJECT].map(v => (
                    <label key={v} className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${decision === v ? 'bg-purple-50 border-purple-500' : ''}`}>
                        <input type="radio" checked={decision === v} onChange={() => setDecision(v as Vote)} />
                        <span className="text-sm font-medium">{v}</span>
                    </label>
                 ))}
                 <textarea className="w-full border p-2 rounded text-sm" rows={3} placeholder="ข้อสรุป..." value={feedback} onChange={e => setFeedback(e.target.value)} />
                 <input type="url" className="w-full border p-2 rounded text-sm" placeholder="ลิงก์ไฟล์ข้อสรุป (ถ้ามี)" value={fileLink} onChange={e => setFileLink(e.target.value)} />
                 <button onClick={handleFinalize} disabled={loading} className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 flex justify-center gap-2">
                    {loading && <Loader2 size={16} className="animate-spin" />} บันทึกผล
                 </button>
             </div>
        </div>
      );
  }

  // 3. Renewal Widget
  if (proposal.status === ProposalStatus.RENEWAL_REQUESTED) {
      return (
         <div className="bg-white rounded-xl shadow-sm border border-cyan-200 overflow-hidden">
            <div className="bg-cyan-50 px-4 py-3 border-b border-cyan-100 flex items-center gap-2">
                <RefreshCw className="text-cyan-600" size={20} />
                <h3 className="font-bold text-cyan-800">คำร้องขอต่ออายุ</h3>
            </div>
            <div className="p-4">
                <button onClick={handleRenewApproval} disabled={loading} className="w-full bg-cyan-600 text-white py-2 rounded hover:bg-cyan-700 flex justify-center gap-2">
                   {loading && <Loader2 size={16} className="animate-spin" />} อนุมัติต่ออายุ (+1 ปี)
                </button>
            </div>
         </div>
      );
  }

  // System Tools (Always visible for Admin)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
         <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
            <Shield size={16} className="text-slate-600"/>
            <h3 className="font-bold text-slate-700 text-sm">เครื่องมือดูแลระบบ</h3>
         </div>
         <div className="p-4">
            <button onClick={handleResetStatus} disabled={loading} className="w-full bg-white border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-red-600 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin"/> : <RotateCcw size={16} />} รีเซ็ตสถานะเป็น "รอตรวจสอบ"
            </button>
         </div>

         {/* Waiting Cert Section (Rendered inside AdminSection for Waiting Cert status) */}
         {proposal.status === ProposalStatus.WAITING_CERT && (
             <div className="p-4 border-t bg-teal-50">
                 <h4 className="font-bold text-teal-800 mb-2 flex items-center gap-2"><Award size={18}/> ออกใบรับรอง</h4>
                 <div className="space-y-2">
                     <input type="text" placeholder="เลขที่ใบรับรอง (Auto if empty)" className="w-full border p-2 rounded text-sm" value={certData.number} onChange={e => setCertData({...certData, number: e.target.value})} />
                     <input type="url" placeholder="URL ไฟล์ใบรับรอง" className="w-full border p-2 rounded text-sm" value={certData.link} onChange={e => setCertData({...certData, link: e.target.value})} />
                     <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="border p-2 rounded text-sm" value={certData.issueDate} onChange={e => setCertData({...certData, issueDate: e.target.value})} />
                        <input type="date" className="border p-2 rounded text-sm" value={certData.expiryDate} onChange={e => setCertData({...certData, expiryDate: e.target.value})} />
                     </div>
                     <button onClick={handleIssueCert} disabled={loading} className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700 flex justify-center gap-2">
                        {loading && <Loader2 size={16} className="animate-spin" />} บันทึกข้อมูลใบรับรอง
                     </button>
                 </div>
             </div>
         )}
         
         {/* Review Progress (For Admin View) */}
         {proposal.reviewers && proposal.reviewers.length > 0 && (
             <div className="p-4 border-t">
                 <h4 className="font-bold text-slate-700 mb-2">สถานะกรรมการ ({proposal.reviews?.length || 0}/{proposal.reviewers.length})</h4>
                 <div className="space-y-2">
                     {proposal.reviewers.map(rid => {
                         const review = proposal.reviews?.find(r => r.reviewerId === rid);
                         const status = proposal.reviewerStates?.[rid] || 'PENDING';
                         return (
                             <div key={rid} className="text-xs flex justify-between items-center bg-slate-50 p-2 rounded">
                                 <span>{rid.substring(0,8)}...</span>
                                 <span className={`px-1.5 py-0.5 rounded ${status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                     {status} {review ? `(${review.vote})` : ''}
                                 </span>
                             </div>
                         );
                     })}
                 </div>
             </div>
         )}
    </div>
  );
};

export default AdminSection;
