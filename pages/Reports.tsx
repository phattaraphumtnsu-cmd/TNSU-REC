
import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../services/database';
import { ProposalStatus, FACULTIES, Proposal, Role, AuditLog, SurveyResponse } from '../types';
import { Loader2, ShieldAlert, AlertTriangle, User, BarChart3, Calendar, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const Reports: React.FC = () => {
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Date Filter State
  const [timeRange, setTimeRange] = useState<number>(12); // Default 12 months
  
  const currentUser = db.currentUser;
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
       setLoading(true);
       try {
           // Fetch all for admin report
           const { data } = await db.getProposals([Role.ADMIN], 'admin_placeholder', null, 1000); 
           setAllProposals(data);

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

  // Filtering Logic
  useEffect(() => {
      if (allProposals.length > 0) {
          const now = new Date();
          const pastDate = new Date();
          pastDate.setMonth(now.getMonth() - timeRange);

          const filtered = allProposals.filter(p => {
              const subDate = new Date(p.submissionDate);
              return subDate >= pastDate;
          });
          setFilteredProposals(filtered);
      }
  }, [allProposals, timeRange]);

  const handleExportPDF = async () => {
      if (!reportRef.current) return;
      setExporting(true);
      
      try {
          // Use html2canvas to capture the report div
          const canvas = await html2canvas(reportRef.current, {
              scale: 2, // Higher scale for better quality
              useCORS: true, // Handle images from external domains
              logging: false,
              backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
              orientation: 'p',
              unit: 'mm',
              format: 'a4'
          });

          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = 0;

          // Add first page
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          // Add subsequent pages if content is long
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(`TNSU-REC_Report_${timeRange}M_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (error) {
          console.error("Export PDF failed", error);
          alert("เกิดข้อผิดพลาดในการสร้าง PDF");
      } finally {
          setExporting(false);
      }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  // Data for Charts (Based on Filtered Data)
  const statusData = [
    { name: 'รอพิจารณา', value: filteredProposals.filter(p => p.status === ProposalStatus.IN_REVIEW).length },
    { name: 'แก้ไข', value: filteredProposals.filter(p => p.status === ProposalStatus.REVISION_REQ).length },
    { name: 'อนุมัติ', value: filteredProposals.filter(p => p.status === ProposalStatus.APPROVED).length },
    { name: 'ไม่อนุมัติ', value: filteredProposals.filter(p => p.status === ProposalStatus.REJECTED).length },
  ];

  const facultyData = FACULTIES.map(f => ({
    name: f.split('คณะ')[1] || f,
    value: filteredProposals.filter(p => p.faculty === f).length
  }));

  const COLORS = ['#FBBF24', '#F97316', '#10B981', '#EF4444'];

  // Survey Calculations (No need to filter by date for aggregate satisfaction usually, but can be added if needed)
  const calcAverage = () => {
     if (surveys.length === 0) return { sys: 0, process: 0, overall: 0, chartData: [] };
     
     let sumSys = 0; // Q1-4
     let sumProc = 0; // Q5-8
     let totalCount = surveys.length;
     
     const questionSums = Array(8).fill(0);

     surveys.forEach(s => {
        for(let i=0; i<4; i++) {
            const sc = (s.scores[i] || 0);
            sumSys += sc;
            questionSums[i] += sc;
        }
        for(let i=4; i<8; i++) {
            const sc = (s.scores[i] || 0);
            sumProc += sc;
            questionSums[i] += sc;
        }
     });

     const avgSys = sumSys / (totalCount * 4);
     const avgProc = sumProc / (totalCount * 4);
     
     const chartData = questionSums.map((sum, index) => ({
         name: `Q${index + 1}`,
         score: parseFloat((sum / totalCount).toFixed(2)),
         full: index < 4 ? 'ด้านระบบ' : 'ด้านกระบวนการ'
     }));

     return {
        sys: parseFloat(avgSys.toFixed(2)),
        process: parseFloat(avgProc.toFixed(2)),
        overall: parseFloat(((avgSys + avgProc) / 2).toFixed(2)),
        chartData
     };
  };

  const surveyStats = calcAverage();
  const urgentSuggestions = surveys.filter(s => s.urgentSuggestion && s.urgentSuggestion.trim() !== '');

  // Calculate Summary Stats for Report Header
  const totalFiltered = filteredProposals.length;
  const approvedCount = filteredProposals.filter(p => p.status === ProposalStatus.APPROVED).length;
  const pendingCount = filteredProposals.filter(p => [ProposalStatus.IN_REVIEW, ProposalStatus.PENDING_ADVISOR, ProposalStatus.PENDING_ADMIN_CHECK].includes(p.status)).length;

  return (
    <div className="space-y-8 pb-10">
      
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">ระบบรายงานสถิติ</h2>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 mr-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Calendar size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">ช่วงเวลา:</span>
                <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-blue-600 outline-none cursor-pointer"
                >
                    <option value={1}>1 เดือนล่าสุด</option>
                    <option value={3}>3 เดือนล่าสุด</option>
                    <option value={6}>6 เดือนล่าสุด</option>
                    <option value={8}>8 เดือนล่าสุด</option>
                    <option value={12}>1 ปีล่าสุด (12 เดือน)</option>
                </select>
            </div>

            <button 
                onClick={handleExportPDF} 
                disabled={exporting}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
                {exporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
                Export PDF
            </button>
        </div>
      </div>

      {/* REPORT CONTENT AREA (Captured by html2canvas) */}
      <div ref={reportRef} className="space-y-8 p-4 bg-slate-50">
        
        {/* Report Header for PDF */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
             <div className="w-16 h-16 mx-auto mb-2">
                <img src="https://lh3.googleusercontent.com/d/1cRjmEPgytoyDLRYvoegnN3OaqrayaF-c" alt="Logo" className="w-full h-full object-contain" />
             </div>
             <h1 className="text-2xl font-bold text-slate-900">รายงานสรุปผลการดำเนินงานจริยธรรมการวิจัย</h1>
             <h2 className="text-lg text-slate-600">มหาวิทยาลัยการกีฬาแห่งชาติ</h2>
             <div className="flex justify-center gap-4 mt-4 text-sm text-slate-500">
                 <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                    ข้อมูลย้อนหลัง: {timeRange} เดือน
                 </span>
                 <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                 </span>
             </div>

             <div className="grid grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
                 <div className="p-4 bg-slate-50 rounded-lg border">
                     <div className="text-3xl font-bold text-slate-800">{totalFiltered}</div>
                     <div className="text-xs text-slate-500">โครงการทั้งหมด</div>
                 </div>
                 <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                     <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
                     <div className="text-xs text-green-700">อนุมัติแล้ว</div>
                 </div>
                 <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                     <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
                     <div className="text-xs text-yellow-700">รอพิจารณา</div>
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Status Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 size={18}/> สรุปสถานะโครงการ
            </h3>
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
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 size={18}/> โครงการแยกตามคณะ
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facultyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} label={{ position: 'top' }} />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>

        {currentUser?.roles.includes(Role.ADMIN) && (
            <>
            {/* Survey Reports Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between border-b pb-4">
                    <span>ผลการประเมินความพึงพอใจ (Satisfaction Survey)</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-8">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-3xl font-bold text-blue-700">{surveyStats.sys}/5</div>
                        <div className="text-sm text-blue-600 font-medium mt-1">ด้านระบบสารสนเทศ (Q1-4)</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-3xl font-bold text-green-700">{surveyStats.process}/5</div>
                        <div className="text-sm text-green-600 font-medium mt-1">ด้านกระบวนการ (Q5-8)</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-3xl font-bold text-purple-700">{surveyStats.overall}/5</div>
                        <div className="text-sm text-purple-600 font-medium mt-1">ภาพรวมความพึงพอใจ</div>
                    </div>
                </div>

                {/* Satisfaction Chart */}
                <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <BarChart3 size={18} /> กราฟแสดงคะแนนเฉลี่ยรายข้อ (Q1 - Q8)
                    </h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={surveyStats.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 5]} />
                                <Tooltip formatter={(value) => [`${value} คะแนน`, 'เฉลี่ย']} />
                                <Legend />
                                <Bar dataKey="score" name="คะแนนเฉลี่ย" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                    {surveyStats.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 4 ? '#3b82f6' : '#22c55e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Urgent Suggestions Table */}
                <div className="mt-8 page-break-inside-avoid">
                    <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} /> ข้อเสนอแนะที่ต้องการปรับปรุงเร่งด่วน ({urgentSuggestions.length})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-red-50 text-red-800 font-semibold">
                                <tr>
                                    <th className="px-4 py-2 text-left w-32">วันที่</th>
                                    <th className="px-4 py-2 text-left w-40">ผู้ใช้งาน</th>
                                    <th className="px-4 py-2 text-left">รายละเอียด</th>
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
            </div>

            {/* Audit Logs Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8 page-break-inside-avoid">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ShieldAlert size={20} className="text-blue-600"/> บันทึกกิจกรรมระบบล่าสุด (Audit Logs)
                    </h3>
                </div>
                <div>
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
                        {auditLogs.slice(0, 10).map(log => ( // Limit logs for PDF to avoid too many pages
                            <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString('th-TH')}</td>
                                <td className="px-6 py-3">
                                    <div className="font-medium text-slate-800">{log.actorName}</div>
                                </td>
                                <td className="px-6 py-3 font-mono text-blue-600 text-xs">{log.action}</td>
                                <td className="px-6 py-3 text-slate-600 truncate max-w-xs">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {auditLogs.length > 10 && <div className="p-2 text-center text-xs text-slate-400 italic">...แสดง 10 รายการล่าสุดจากทั้งหมด {auditLogs.length} รายการ...</div>}
                </div>
            </div>
            </>
        )}
      </div>
    </div>
  );
};

export default Reports;
