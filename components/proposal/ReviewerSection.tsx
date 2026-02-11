
import React, { useState } from 'react';
import { Proposal, ProposalStatus, Vote, ReviewerStatus, Review, User } from '../../types';
import { db } from '../../services/database';
import { PenTool, Loader2, XCircle, Link2 } from 'lucide-react';

interface ReviewerSectionProps {
  proposal: Proposal;
  user: User;
  onUpdate: () => void;
}

const ReviewerSection: React.FC<ReviewerSectionProps> = ({ proposal, user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [vote, setVote] = useState<Vote>(Vote.APPROVE);
  const [comment, setComment] = useState('');
  const [fileLink, setFileLink] = useState('');

  // Checks
  if (proposal.status !== ProposalStatus.IN_REVIEW) return null;
  if (!proposal.reviewers.includes(user.id)) return null;

  const myStatus = proposal.reviewerStates?.[user.id] || ReviewerStatus.PENDING;

  const handleAccept = async (accepted: boolean) => {
      setLoading(true);
      try {
          const status = accepted ? ReviewerStatus.ACCEPTED : ReviewerStatus.DECLINED;
          await db.updateReviewerStatus(proposal.id, user.id, status, proposal.reviewerStates || {});
          alert(accepted ? 'ตอบรับเรียบร้อย' : 'ปฏิเสธเรียบร้อย');
          onUpdate();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
        const review: Review = {
            reviewerId: user.id, reviewerName: user.name, vote, comment, fileLink, submittedAt: new Date().toISOString()
        };
        await db.submitReview(proposal.id, review, proposal.reviews || [], proposal.titleTh);
        
        // Auto-check for completion
        const freshP = await db.getProposalById(proposal.id);
        if (freshP && freshP.reviews.length === freshP.reviewers.length) {
             await db.updateProposal(proposal.id, { status: ProposalStatus.PENDING_DECISION });
        }
        alert('บันทึกผลการพิจารณาแล้ว');
        onUpdate();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden mb-6">
        <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
            <PenTool className="text-indigo-600" size={20} />
            <h3 className="font-bold text-indigo-800">ส่วนของกรรมการ</h3>
        </div>
        <div className="p-4 space-y-4">
            {myStatus === ReviewerStatus.PENDING && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center space-y-3">
                    <p className="text-sm font-semibold text-yellow-800">ท่านได้รับมอบหมายให้พิจารณาโครงการนี้</p>
                    <div className="flex gap-2 justify-center">
                        <button onClick={() => handleAccept(true)} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center gap-1">
                            {loading ? <Loader2 size={14} className="animate-spin"/> : null} ตอบรับ
                        </button>
                        <button onClick={() => handleAccept(false)} disabled={loading} className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded text-sm hover:bg-red-50 flex items-center gap-1">
                            {loading ? <Loader2 size={14} className="animate-spin"/> : null} ปฏิเสธ
                        </button>
                    </div>
                </div>
            )}

            {myStatus === ReviewerStatus.DECLINED && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                    <XCircle className="mx-auto text-red-500 mb-2" size={32} />
                    <p className="text-sm font-bold text-red-800">ท่านได้ปฏิเสธการพิจารณา</p>
                </div>
            )}

            {myStatus === ReviewerStatus.ACCEPTED && (
                <div className="space-y-4 animate-in fade-in">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">ผลการพิจารณา</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[Vote.APPROVE, Vote.FIX, Vote.REJECT].map(v => (
                                <label key={v} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${vote === v ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-slate-50'}`}>
                                    <input type="radio" checked={vote === v} onChange={() => setVote(v as Vote)} className="text-indigo-600"/>
                                    <span className="text-sm">{v}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">ข้อคิดเห็น</label>
                        <textarea className="w-full border p-2 rounded text-sm" rows={4} value={comment} onChange={e => setComment(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">เอกสารเพิ่มเติม (Link)</label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input type="url" className="w-full border pl-9 p-2 text-sm rounded" placeholder="Google Drive Link" value={fileLink} onChange={e => setFileLink(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex justify-center gap-2">
                        {loading && <Loader2 size={16} className="animate-spin"/>} ส่งผลการพิจารณา
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default ReviewerSection;
