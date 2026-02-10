

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../services/database';
import { ProposalStatus, FACULTIES, Proposal, Role, AuditLog, SurveyResponse } from '../types';
import { Loader2, ShieldAlert, History, AlertTriangle, User, MessageSquare } from 'lucide-react';

const Reports: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = db.currentUser;

  useEffect(() => {
    const fetchData = async () => {
       setLoading(true);
       try {
           // Fetch all for admin report, no pagination limit (use a large number for report overview)
           const { data } = await db.getProposals([Role.ADMIN], 'admin_placeholder', null, 500); 
           setProposals(data);

           // Fetch Audit Logs and Surveys if admin
           if (currentUser?.roles.includes(Role.ADMIN)) {
              const logs = await db.getAuditLogs();
              setAuditLogs(logs);

              const allSurveys = await db.getAllSurveys();
              setSurveys(allSurveys);
           }
       } catch (e) {
           console.error(e);
       } finally {
           setLoading(false);
       }
    };
    fetchData();
  }, [currentUser]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  // Data for Charts
  const statusData = [
    { name: 'รอพิจารณา', value: proposals.filter(p => p.status === ProposalStatus.IN_REVIEW).length },
    { name: 'แก้ไข', value: proposals.filter(p => p.status === ProposalStatus.REVISION_REQ).length },
    { name: 'อนุมัติ', value: proposals.filter(p => p.status === ProposalStatus.APPROVED).length },
    { name: 'ไม่อนุมัติ', value: proposals.filter(p => p.status === ProposalStatus.REJECTED).length },
  ];

  const facultyData = FACULTIES.map(f => ({
    name: f.split('คณะ')[1] || f, // Shorten name
    value: proposals.filter(p => p.faculty === f).length
  }));

  const COLORS = ['#FBBF24', '#F97316', '#10B981', '#EF4444'];

  // Survey Calculations
  const calcAverage = () => {
     if (surveys.length === 0) return { sys: 0, process: 0, overall: 0 };
     
     let sumSys = 0; // Q1-4
     let sumProc = 0; // Q5-8
     let totalCount = surveys.length;

     surveys.forEach(s => {
        // System scores (indices 0-3)
        for(let i=0; i<4; i++) sumSys += (s.scores[i] || 0);
        // Process scores (indices 4-7)
        for(let i=4; i<8; i++) sumProc += (s.scores[i] || 0);
     });

     const avgSys = sumSys / (totalCount * 4);
     const avgProc = sumProc / (totalCount * 4);
     return {
        sys: parseFloat(avgSys.toFixed(2)),
        process: parseFloat(avgProc.toFixed(2)),
        overall: parseFloat(((avgSys + avgProc) / 2).toFixed(2))
     };
  };

  const surveyStats = calcAverage();
  const urgentSuggestions = surveys.filter(s => s.urgentSuggestion && s.urgentSuggestion.trim() !== '');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">รายงานสถิติ (TNSU-REC)</h2>
        <button className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm">
           Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-semibold mb-6">สรุปสถานะโครงการ</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={statusData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   fill="#8884d8"
                   paddingAngle={5}
                   dataKey="value"
                   label
                 >
                   {statusData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Faculty Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-semibold mb-6">โครงการแยกตามคณะ</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={facultyData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" fontSize={12} />
                 <YAxis allowDecimals={false} />
                 <Tooltip />
                 <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {currentUser?.roles.includes(Role.ADMIN) && (
         <>
         {/* Survey Reports Section */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                <span>ผลการประเมินความพึงพอใจ (จากผู้ใช้ {surveys.length} คน)</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Update Real-time</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-8">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-3xl font-bold text-blue-700">{surveyStats.sys}/5</div>
                    <div className="text-sm text-blue-600 font-medium mt-1">ด้านระบบสารสนเทศ</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-3xl font-bold text-green-700">{surveyStats.process}/5</div>
                    <div className="text-sm text-green-600 font-medium mt-1">ด้านกระบวนการ</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><User size={48} /></div>
                    <div className="text-3xl font-bold text-purple-700">{surveyStats.overall}/5</div>
                    <div className="text-sm text-purple-600 font-medium mt-1">ภาพรวมความพึงพอใจ</div>
                </div>
            </div>

            {/* Urgent Suggestions Table */}
            <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> ข้อเสนอแนะที่ต้องการปรับปรุงเร่งด่วน ({urgentSuggestions.length})
            </h4>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-red-50 text-red-800 font-semibold">
                        <tr>
                            <th className="px-4 py-2 text-left w-32">วันที่</th>
                            <th className="px-4 py-2 text-left w-40">ผู้ใช้งาน</th>
                            <th className="px-4 py-2 text-left">รายละเอียดปัญหา/ข้อเสนอแนะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {urgentSuggestions.length === 0 ? (
                            <tr><td colSpan={3} className="p-4 text-center text-slate-400">ไม่มีข้อเสนอแนะเร่งด่วน</td></tr>
                        ) : (
                            urgentSuggestions.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{new Date(s.submittedAt).toLocaleDateString('th-TH')}</td>
                                    <td className="px-4 py-2">
                                        <div className="font-medium text-slate-800">{s.userName}</div>
                                        <div className="text-xs text-slate-400">{s.role}</div>
                                    </td>
                                    <td className="px-4 py-2 text-red-700 bg-red-50/20">{s.urgentSuggestion}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
         </div>

         {/* Audit Logs Section */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <ShieldAlert size={20} className="text-blue-600"/> บันทึกกิจกรรมระบบ (Audit Logs)
                </h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
               <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-500 font-medium">
                     <tr>
                        <th className="px-6 py-3 text-left">เวลา</th>
                        <th className="px-6 py-3 text-left">ผู้ดำเนินการ</th>
                        <th className="px-6 py-3 text-left">กิจกรรม</th>
                        <th className="px-6 py-3 text-left">รายละเอียด</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {auditLogs.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">ยังไม่มีประวัติกิจกรรม</td></tr>
                     ) : (
                        auditLogs.map(log => (
                           <tr key={log.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString('th-TH')}</td>
                              <td className="px-6 py-3">
                                 <div className="font-medium text-slate-800">{log.actorName}</div>
                                 <div className="text-xs text-slate-400">{log.actorRole}</div>
                              </td>
                              <td className="px-6 py-3 font-mono text-blue-600 text-xs">{log.action}</td>
                              <td className="px-6 py-3 text-slate-600">{log.details}</td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
         </>
      )}
    </div>
  );
};

export default Reports;
