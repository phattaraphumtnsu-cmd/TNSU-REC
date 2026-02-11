
import React, { useState } from 'react';
import { Proposal, ProposalStatus, Permission, hasPermission, User } from '../../types';
import { db } from '../../services/database';
import { AlertTriangle, ChevronDown, ChevronUp, MessageSquare, FileText, ExternalLink, Send, Info, Loader2 } from 'lucide-react';

interface RevisionSectionProps {
  proposal: Proposal;
  user: User;
  onUpdate: () => void;
}

const RevisionSection: React.FC<RevisionSectionProps> = ({ proposal, user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [revisionLink, setRevisionLink] = useState('');
  const [noteLink, setNoteLink] = useState('');
  const [confirm, setConfirm] = useState(false);

  const isRejectedByAdmin = proposal.status === ProposalStatus.ADMIN_REJECTED;
  const isRevisionReq = proposal.status === ProposalStatus.REVISION_REQ;
  
  // Show if status requires revision AND user has permission
  if (!isRejectedByAdmin && !isRevisionReq) return null;
  if (!hasPermission(user.roles, Permission.SUBMIT_REVISION)) return null; // Or show read-only feedback?

  const feedback = isRejectedByAdmin ? proposal.adminFeedback : proposal.consolidatedFeedback;
  const feedbackFile = proposal.consolidatedFileLink;

  const handleSubmit = async () => {
    if (!revisionLink) return alert('กรุณาใส่ลิงก์ไฟล์แก้ไข');
    if (!confirm) return alert('กรุณายืนยัน');
    if (!window.confirm('ยืนยันการส่งข้อมูลการแก้ไข?')) return;

    setLoading(true);
    try {
        await db.submitRevision(
            proposal.id, revisionLink, noteLink, 
            proposal.revisionHistory || [], proposal.revisionCount || 0,
            proposal.titleTh, feedback
        );
        alert('ส่งแก้ไขเรียบร้อย');
        onUpdate();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className={`bg-white border rounded-xl shadow-md overflow-hidden transition-all duration-300 ${isRejectedByAdmin ? 'border-red-200 ring-4 ring-red-50/50' : 'border-orange-200 ring-4 ring-orange-50/50'} mb-6`}>
       <div 
          className={`flex justify-between items-center p-4 cursor-pointer ${isRejectedByAdmin ? 'bg-red-50 hover:bg-red-100' : 'bg-orange-50 hover:bg-orange-100'} transition-colors`}
          onClick={() => setIsOpen(!isOpen)}
       >
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isRejectedByAdmin ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                  <AlertTriangle size={24} />
              </div>
              <div>
                  <h3 className={`font-bold text-lg ${isRejectedByAdmin ? 'text-red-900' : 'text-orange-900'}`}>
                      {isRejectedByAdmin ? 'สิ่งที่ต้องแก้ไข (จากเจ้าหน้าที่/ที่ปรึกษา)' : 'มติคณะกรรมการ: ให้แก้ไข'}
                  </h3>
                  <p className={`text-sm ${isRejectedByAdmin ? 'text-red-700' : 'text-orange-700'}`}>
                      {isRejectedByAdmin ? 'ข้อเสนอแนะจากเจ้าหน้าที่' : 'ข้อสรุปจากคณะกรรมการ'}
                  </p>
              </div>
          </div>
          {isOpen ? <ChevronUp className={isRejectedByAdmin ? 'text-red-500' : 'text-orange-500'} /> : <ChevronDown className={isRejectedByAdmin ? 'text-red-500' : 'text-orange-500'} />}
       </div>
       
       {isOpen && (
          <div className="p-6 bg-white animate-in slide-in-from-top-2">
              {feedback && (
                  <div className="mb-6">
                      <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1"><MessageSquare size={14}/> รายละเอียด</h4>
                      <div className="p-5 rounded-xl border bg-slate-50 whitespace-pre-wrap">{feedback}</div>
                  </div>
              )}
              {feedbackFile && (
                  <div className="mb-6">
                      <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1"><FileText size={14}/> เอกสารประกอบ</h4>
                      <a href={feedbackFile} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white p-4 rounded-xl border hover:shadow-md transition-all">
                          <FileText size={24} className="text-blue-600"/>
                          <div>
                              <div className="font-semibold text-slate-800">ดาวน์โหลดเอกสารข้อเสนอแนะ</div>
                          </div>
                      </a>
                  </div>
              )}

              <div className="mt-8 pt-8 border-t border-slate-100">
                 <h4 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Send size={24} className="text-blue-600" /> ส่งแบบขอแก้ไข
                 </h4>
                 
                 <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6 flex items-start gap-3 border border-blue-100">
                    <Info size={20} className="mt-0.5 flex-shrink-0 text-blue-600" />
                    <p>กรุณาจัดการไฟล์แก้ไขใน Google Drive ตรวจสอบสิทธิ์เป็น Everyone แล้วนำลิงก์มาวาง</p>
                 </div>

                 <div className="space-y-5 bg-slate-50/50 p-6 rounded-xl border border-slate-200">
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">1. ลิงก์ไฟล์แก้ไข (Google Drive) *</label>
                       <input type="url" placeholder="https://..." className="w-full border p-3 rounded-lg" value={revisionLink} onChange={e => setRevisionLink(e.target.value)} />
                    </div>
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">2. ลิงก์บันทึกข้อความชี้แจง (ถ้ามี)</label>
                       <input type="url" placeholder="https://..." className="w-full border p-3 rounded-lg" value={noteLink} onChange={e => setNoteLink(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 py-2">
                      <input type="checkbox" id="confirm" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="w-5 h-5"/>
                      <label htmlFor="confirm" className="text-sm font-medium">ข้าพเจ้าแก้ไขเอกสารครบถ้วนแล้ว</label>
                    </div>
                    <button onClick={handleSubmit} disabled={!confirm || loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center gap-2">
                       {loading && <Loader2 size={20} className="animate-spin" />} ยืนยันส่งข้อมูล
                    </button>
                 </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default RevisionSection;
