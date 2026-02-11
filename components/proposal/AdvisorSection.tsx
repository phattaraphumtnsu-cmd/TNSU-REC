
import React, { useState } from 'react';
import { Proposal, ProposalStatus } from '../../types';
import { db } from '../../services/database';
import { UserCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AdvisorSectionProps {
  proposal: Proposal;
  user: { id: string };
  onUpdate: () => void;
}

const AdvisorSection: React.FC<AdvisorSectionProps> = ({ proposal, user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (user.id !== proposal.advisorId || proposal.status !== ProposalStatus.PENDING_ADVISOR) return null;

  const handleApprove = async () => {
    if(!window.confirm("ยืนยันการอนุมัติโครงการเพื่อส่งต่อให้เจ้าหน้าที่ (Admin)?")) return;
    setLoading(true);
    try {
        await db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_ADMIN_CHECK });
        alert('อนุมัติให้นักศึกษาแล้ว สถานะเปลี่ยนเป็น "รอเจ้าหน้าที่ตรวจสอบ"');
        onUpdate();
    } catch(e: any) {
        alert('Error: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleReject = async () => {
      if(!rejectReason.trim()) return alert('กรุณาระบุเหตุผล');
      if(!window.confirm("ยืนยันการส่งคืนโครงการให้นักศึกษาแก้ไข?")) return;
      setLoading(true);
      try {
        await db.advisorRejectProposal(proposal.id, rejectReason);
        alert('ส่งคืนโครงการให้แก้ไขเรียบร้อยแล้ว');
        onUpdate();
      } catch(e: any) {
        alert('Error: ' + e.message);
      } finally {
        setLoading(false);
      }
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 mb-6">
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
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                อนุมัติโครงการ (Approve)
            </button>
            
            <div className="flex-1">
                <button
                    onClick={() => setShowReject(!showReject)}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${showReject ? 'bg-red-50 text-red-700 border-2 border-red-200' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}
                >
                    <XCircle size={20} /> ส่งคืนเพื่อแก้ไข (Return)
                </button>
            </div>
        </div>
        
        {showReject && (
            <div className="mt-4 bg-white p-4 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">ระบุเหตุผล/สิ่งที่ต้องแก้ไข (เพื่อแจ้งให้นักศึกษาทราบ)</label>
                <textarea
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    rows={3}
                    placeholder="เช่น เอกสารแนบไม่ครบถ้วน, ชื่อเรื่องภาษาอังกฤษสะกดผิด, ข้อมูลในแบบฟอร์มไม่ตรงกับโครงร่าง..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handleReject}
                        disabled={loading}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-700 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        ยืนยันการส่งคืน
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdvisorSection;
