
import React, { useState } from 'react';
import { Proposal, ProposalStatus, Permission, hasPermission, User, ProgressReport, ReportType } from '../../types';
import { db } from '../../services/database';
import { Clock, CheckCircle, ExternalLink, Send, Loader2 } from 'lucide-react';

interface ProgressSectionProps {
  proposal: Proposal;
  user: User;
  onUpdate: () => void;
}

const ProgressSection: React.FC<ProgressSectionProps> = ({ proposal, user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>(ReportType.PROGRESS_6_MONTH);
  const [link, setLink] = useState('');
  const [desc, setDesc] = useState('');

  if (proposal.status !== ProposalStatus.APPROVED) return null;

  const handleSubmit = async () => {
      if (!link) return alert('กรุณาใส่ลิงก์');
      setLoading(true);
      try {
          await db.submitProgressReport(proposal.id, { type: reportType, fileLink: link, description: desc }, proposal.progressReports || [], proposal.titleTh);
          setLink(''); setDesc('');
          alert('ส่งรายงานเรียบร้อย');
          onUpdate();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleAck = async (reportId: string) => {
      setLoading(true);
      try {
          await db.acknowledgeProgressReport(proposal.id, reportId, user.name, proposal.progressReports);
          onUpdate();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden mb-6">
        <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
           <h3 className="font-bold text-green-800 flex items-center gap-2">
              <Clock size={20} /> ติดตามความก้าวหน้าโครงการ
           </h3>
           {proposal.nextReportDueDate && (
               <div className="text-xs text-green-700 bg-white px-3 py-1 rounded-full border border-green-200">
                  ครบกำหนด: {proposal.nextReportDueDate}
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
                          <a href={report.fileLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> ดูไฟล์</a>
                        </div>
                       <div className="flex flex-col items-end justify-center min-w-[150px]">
                          {report.acknowledgedDate ? (
                             <div className="text-right">
                                <span className="inline-flex items-center text-green-600 text-sm font-medium gap-1"><CheckCircle size={14} /> รับทราบแล้ว</span>
                                <div className="text-xs text-slate-400">โดย {report.acknowledgedBy}</div>
                             </div>
                          ) : (
                             hasPermission(user.roles, Permission.ACKNOWLEDGE_PROGRESS_REPORT) ? (
                                <button onClick={() => handleAck(report.id)} disabled={loading} className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? '...' : 'กดรับทราบรายงาน'}
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
              <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-lg mb-6">ยังไม่มีรายงาน</div>
           )}

           {hasPermission(user.roles, Permission.SUBMIT_PROGRESS_REPORT) && (
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                 <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Send size={16} /> ส่งรายงานใหม่</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div><select className="w-full text-sm border p-2 rounded" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>{Object.values(ReportType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><input type="url" className="w-full text-sm border p-2 rounded" placeholder="Link PDF..." value={link} onChange={e => setLink(e.target.value)} /></div>
                 </div>
                 <textarea className="w-full text-sm border p-2 rounded mb-3" rows={2} placeholder="รายละเอียด..." value={desc} onChange={e => setDesc(e.target.value)}></textarea>
                 <div className="flex justify-end">
                    <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                        {loading && <Loader2 size={16} className="animate-spin" />} ส่งรายงาน
                    </button>
                 </div>
              </div>
           )}
        </div>
    </div>
  );
};

export default ProgressSection;
