
import React, { useState } from 'react';
import { Proposal, ProposalStatus, Role, User, Permission, hasPermission } from '../../types';
import { db } from '../../services/database';
import { ArrowLeft, ExternalLink, Calendar, Award, RefreshCw, Loader2, Trash2, Phone, AlertCircle, FileText, History, Clock, Link2, Shield } from 'lucide-react';

interface ProposalInfoProps {
  proposal: Proposal;
  user: User;
  onNavigate: (page: string) => void;
  onUpdate: () => void;
}

const ProposalInfo: React.FC<ProposalInfoProps> = ({ proposal, user, onNavigate, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    const reason = prompt("กรุณาระบุเหตุผลที่ต้องการถอนโครงการ (Withdrawal Reason):");
    if (reason === null) return; 
    if (!reason.trim()) return alert("กรุณาระบุเหตุผล");
    
    if (window.confirm("คำเตือน: การถอนโครงการจะไม่สามารถย้อนกลับได้ คุณต้องการดำเนินการต่อหรือไม่?")) {
        setLoading(true);
        try {
            await db.withdrawProposal(proposal.id, reason);
            alert("ถอนโครงการเรียบร้อยแล้ว สถานะเปลี่ยนเป็น 'ถอนโครงการ' (Withdrawn)");
            onUpdate();
        } catch(e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    }
  };

  const handleRenew = async () => {
    if (window.confirm("ยืนยันการขอยื่นต่ออายุใบรับรอง (Renewal)?")) {
        setLoading(true);
        try {
            await db.requestRenewal(proposal.id);
            alert("ส่งคำขอต่ออายุเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบ");
            onUpdate();
        } catch(e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    }
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

  return (
    <div className="space-y-6">
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
                {hasPermission(user.roles, Permission.REQUEST_RENEWAL) && user.id === proposal.researcherId && (
                     <button 
                        onClick={handleRenew} 
                        disabled={loading}
                        className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-50 shadow-sm transition-transform active:scale-95 text-sm font-medium disabled:opacity-50"
                     >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                        ขอต่ออายุใบรับรอง (Renew)
                     </button>
                )}

                {proposal.certLink ? (
                    <a href={proposal.certLink} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition-transform active:scale-95 text-sm">
                        <Award size={18} /> ดาวน์โหลดใบรับรอง
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

      {/* Detail Body */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="flex justify-between items-start mb-4 border-b pb-2">
            <h3 className="font-semibold text-lg text-slate-800">รายละเอียดโครงการ</h3>
            <div className="flex gap-2">
                {hasPermission(user.roles, Permission.WITHDRAW_PROPOSAL) && 
                    user.id === proposal.researcherId && 
                    ![ProposalStatus.APPROVED, ProposalStatus.REJECTED, ProposalStatus.WITHDRAWN].includes(proposal.status) && (
                    <button 
                        onClick={handleWithdraw} 
                        disabled={loading}
                        className="text-xs text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />} ถอนโครงการ (Withdraw)
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
            
            {(user.roles.includes(Role.ADMIN) || user.roles.includes(Role.REVIEWER)) && proposal.researcherPhone && (
                <div className="col-span-2 mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                    <Phone size={18} className="text-blue-600" />
                    <div>
                        <span className="text-xs text-blue-700 block font-bold">ช่องทางติดต่อผู้วิจัย (Contact Researcher)</span>
                        <span className="text-sm font-medium text-slate-800">{proposal.researcherPhone}</span>
                    </div>
                </div>
            )}

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
            
            {proposal.revisionLink && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mt-1">
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

         {proposal.revisionHistory && proposal.revisionHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                   <History size={16} /> ประวัติการแก้ไข (Revision History)
                </h4>
                <div className="space-y-3">
                   {proposal.revisionHistory.map((rev, idx) => (
                      <div key={idx} className="text-sm bg-slate-50 p-3 rounded border border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                         <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">ครั้งที่ {rev.revisionCount}</span>
                                {rev.adminFeedbackSnapshot && (
                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200" title={rev.adminFeedbackSnapshot}>
                                        แก้ไขตามข้อเสนอแนะ
                                    </span>
                                )}
                            </div>
                            <span className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                               <Clock size={10} /> 
                               ส่งเมื่อ: {new Date(rev.submittedDate).toLocaleString('th-TH', { 
                                 year: 'numeric', month: 'short', day: 'numeric',
                                 hour: '2-digit', minute: '2-digit'
                               })}
                            </span>
                         </div>
                         <div className="flex gap-2 mt-2 sm:mt-0">
                            <a href={rev.fileLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs bg-white px-2 py-1.5 rounded border hover:bg-blue-50 transition-colors">
                                <FileText size={12}/> ไฟล์แนบ
                            </a>
                            {rev.noteLink && (
                                <a href={rev.noteLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-600 hover:underline text-xs bg-white px-2 py-1.5 rounded border hover:bg-slate-50 transition-colors">
                                    <Link2 size={12}/> บันทึกชี้แจง
                                </a>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
            </div>
         )}
      </div>

      {/* Blind Review for Researcher */}
      {user.roles.includes(Role.RESEARCHER) && !user.roles.includes(Role.ADMIN) && proposal.reviews && proposal.reviews.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-6">
            <h3 className="font-semibold text-slate-800 mb-4">ความเห็นจากคณะกรรมการ ({proposal.reviews.length} ท่าน)</h3>
            <div className="space-y-4">
              {proposal.reviews.map((r, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-slate-700">กรรมการท่านที่ {idx + 1}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{r.vote}</span>
                    </div>
                    <p className="text-slate-600 text-sm mb-2">{r.comment}</p>
                    {r.fileLink && (
                        <a href={r.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                            <Link2 size={12} /> เอกสารแนบจากกรรมการ
                        </a>
                    )}
                </div>
              ))}
            </div>
          </div>
      )}
    </div>
  );
};

export default ProposalInfo;
