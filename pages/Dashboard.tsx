
import React, { useState, useEffect } from 'react';
import { db } from '../services/database'; // Real DB
import { ProposalStatus, Role, Proposal } from '../types';
import { Edit2, Eye, Plus, AlertTriangle, FileCheck, XCircle, Clock, Filter, FilePlus, Search, X, Loader2, Calendar, CheckCircle } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const user = db.currentUser;
  
  // Data State
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringProposals, setExpiringProposals] = useState<Proposal[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (user) {
        setLoading(true);
        try {
          let data = await db.getProposals(user.role, user.id);
          
          if (user.role === Role.RESEARCHER) {
             data = data.filter(p => p.researcherId === user.id);
          }

          // Sort by updated date desc
          data.sort((a,b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
          setProposals(data);

          // Admin: Run background check for expiry
          if (user.role === Role.ADMIN) {
             await db.checkExpiringCertificates();
             
             // Local check for UI display
             const today = new Date();
             const exp = data.filter(p => {
                if (p.status !== ProposalStatus.APPROVED || !p.approvalDetail?.expiryDate) return false;
                const expDate = new Date(p.approvalDetail.expiryDate);
                const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays > 0 && diffDays <= 60; // Show warning for 60 days
             });
             setExpiringProposals(exp);
          }

        } catch (error) {
          console.error("Failed to fetch proposals", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchData();
  }, [user]);

  if (!user) return null;

  if (loading) {
     return <div className="flex justify-center items-center h-64 text-slate-400"><Loader2 className="animate-spin mr-2"/> กำลังโหลดข้อมูล...</div>;
  }

  // Stats Logic
  const stats = {
    pending: proposals.filter(p => [ProposalStatus.IN_REVIEW, ProposalStatus.PENDING_ADVISOR, ProposalStatus.PENDING_ADMIN_CHECK, ProposalStatus.PENDING_DECISION].includes(p.status)).length,
    revision: proposals.filter(p => [ProposalStatus.REVISION_REQ, ProposalStatus.ADMIN_REJECTED].includes(p.status)).length,
    approved: proposals.filter(p => [ProposalStatus.APPROVED, ProposalStatus.WAITING_CERT].includes(p.status)).length,
    rejected: proposals.filter(p => p.status === ProposalStatus.REJECTED).length,
  };

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.APPROVED:
      case ProposalStatus.WAITING_CERT: return 'bg-green-100 text-green-700 border-green-200';
      case ProposalStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      case ProposalStatus.REVISION_REQ:
      case ProposalStatus.ADMIN_REJECTED: return 'bg-orange-100 text-orange-700 border-orange-200';
      case ProposalStatus.SUSPENDED: return 'bg-gray-100 text-gray-700 border-gray-400 border-dashed';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  // Filter Logic
  const filteredProposals = proposals.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (p.code?.toLowerCase().includes(searchLower) || false) ||
      p.titleTh.toLowerCase().includes(searchLower) ||
      p.titleEn.toLowerCase().includes(searchLower) ||
      p.researcherName.toLowerCase().includes(searchLower);

    const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
    const matchDate = !filterDate || p.submissionDate === filterDate;

    return matchSearch && matchStatus && matchDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterDate('');
  };

  const StatCard = ({ label, count, color, icon: Icon }: any) => (
    <div className={`p-6 rounded-xl border ${color} bg-white shadow-sm flex items-center justify-between transition-transform hover:scale-105`}>
       <div>
         <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
         <h3 className="text-3xl font-bold text-slate-800">{count}</h3>
       </div>
       <div className={`p-3 rounded-full ${color.replace('border', 'bg').split(' ')[0]} bg-opacity-20`}>
         <Icon size={24} />
       </div>
    </div>
  );

  // --- DEDICATED RESEARCHER VIEW ---
  if (user.role === Role.RESEARCHER) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">โครงการวิจัยของฉัน (My Proposals)</h2>
            <p className="text-slate-500">ติดตามสถานะและจัดการโครงการวิจัยของคุณ</p>
          </div>
          <button 
            onClick={() => onNavigate('submit')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            ยื่นคำขอใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="รอพิจารณา" count={stats.pending} color="border-yellow-200 text-yellow-600" icon={Clock} />
          <StatCard label="ต้องแก้ไข" count={stats.revision} color="border-orange-200 text-orange-600" icon={AlertTriangle} />
          <StatCard label="อนุมัติแล้ว" count={stats.approved} color="border-green-200 text-green-600" icon={FileCheck} />
          <StatCard label="ไม่อนุมัติ" count={stats.rejected} color="border-red-200 text-red-600" icon={XCircle} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileCheck size={18} className="text-blue-500"/> รายการที่ยื่นขอ (Submitted Proposals)
            </h3>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อโครงการ..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">รหัส / ชื่อโครงการ</th>
                  <th className="px-6 py-4 text-left">วันที่ยื่น</th>
                  <th className="px-6 py-4 text-left">อัพเดทล่าสุด</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                         <FilePlus size={32} className="text-slate-300" />
                      </div>
                      <p>ไม่พบข้อมูลโครงการ</p>
                      {proposals.length === 0 && <button onClick={() => onNavigate('submit')} className="text-blue-600 hover:underline mt-2 text-sm">เริ่มยื่นคำขอใหม่</button>}
                    </td>
                  </tr>
                ) : (
                  filteredProposals.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-blue-600 mb-1 bg-blue-50 w-fit px-1.5 py-0.5 rounded">{p.code || 'รอรหัส (Pending)'}</span>
                          <span className="font-medium text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{p.titleTh}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{p.titleEn}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {p.submissionDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {p.updatedDate}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(p.status)} shadow-sm`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onNavigate('proposal', { id: p.id })}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
                          title="ดูรายละเอียด / แก้ไข"
                        >
                           <Eye size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- GENERAL VIEW (ADMIN / REVIEWER / ADVISOR) ---
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">แดชบอร์ด ({user.role})</h2>
          <p className="text-slate-500">ภาพรวมการดำเนินงานจริยธรรมการวิจัย</p>
        </div>
      </div>

      {/* Expiry Warning for Admin */}
      {user.role === Role.ADMIN && expiringProposals.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse">
             <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2">
                <AlertTriangle size={20} /> แจ้งเตือน: มี {expiringProposals.length} โครงการที่ใบรับรองใกล้หมดอายุ (ภายใน 60 วัน)
             </h3>
             <div className="flex gap-2 overflow-x-auto pb-2">
                {expiringProposals.map(p => (
                   <button key={p.id} onClick={() => onNavigate('proposal', { id: p.id })} className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-red-200 text-sm hover:bg-red-50 text-red-700 whitespace-nowrap">
                      <Calendar size={12} /> {p.code} ({p.approvalDetail?.expiryDate})
                   </button>
                ))}
             </div>
          </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="รอพิจารณา" count={stats.pending} color="border-yellow-200 text-yellow-600" icon={Clock} />
        <StatCard label="ต้องแก้ไข" count={stats.revision} color="border-orange-200 text-orange-600" icon={AlertTriangle} />
        <StatCard label="อนุมัติแล้ว" count={stats.approved} color="border-green-200 text-green-600" icon={FileCheck} />
        <StatCard label="ไม่อนุมัติ" count={stats.rejected} color="border-red-200 text-red-600" icon={XCircle} />
      </div>

      {/* Main Table with Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700 whitespace-nowrap">รายการโครงการ</h3>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{filteredProposals.length}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
             {/* Search */}
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ, รหัส, ผู้วิจัย..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>

             {/* Status Filter */}
             <select 
               className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
               value={filterStatus}
               onChange={e => setFilterStatus(e.target.value)}
             >
                <option value="ALL">ทุกสถานะ</option>
                {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
             </select>

             {/* Date Filter */}
             <div className="relative">
                <input 
                  type="date"
                  className="border border-slate-200 rounded-lg pl-3 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white w-full md:w-auto"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                />
             </div>

             {/* Clear Filter */}
             {(searchTerm || filterStatus !== 'ALL' || filterDate) && (
               <button 
                 onClick={clearFilters}
                 className="flex items-center justify-center gap-1 text-slate-500 hover:text-red-500 px-3 py-2 text-sm transition-colors border border-dashed border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-200"
               >
                 <X size={16} /> ล้างตัวกรอง
               </button>
             )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">รหัส/ชื่อโครงการ</th>
                <th className="px-6 py-4 text-left">วันที่ยื่น</th>
                <th className="px-6 py-4 text-left">ผู้วิจัย</th>
                <th className="px-6 py-4 text-center">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                       <Filter size={32} className="text-slate-300 mb-2" />
                       <p>ไม่พบข้อมูลตามเงื่อนไขที่ระบุ</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProposals.map((p) => {
                  const isReviewer = user.role === Role.REVIEWER;
                  const myReview = isReviewer ? p.reviews?.find(r => r.reviewerId === user.id) : null;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-blue-600 mb-1">{p.code || 'รอรหัส'}</span>
                          <span className="font-medium text-slate-800 line-clamp-1">{p.titleTh}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{p.titleEn}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {p.submissionDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{p.researcherName}</div>
                        <div className="text-xs text-slate-400">{p.faculty}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                          
                          {/* Reviewer Specific Status Indicator */}
                          {isReviewer && (
                             myReview ? (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                 <CheckCircle size={10} /> ประเมินแล้ว ({myReview.vote})
                               </span>
                             ) : (
                                p.status === ProposalStatus.IN_REVIEW && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                                     <Clock size={10} /> รอท่านประเมิน
                                  </span>
                                )
                             )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onNavigate('proposal', { id: p.id })}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-2"
                          title={user.role === Role.ADMIN || (user.role === Role.REVIEWER && p.status === ProposalStatus.IN_REVIEW) ? "ตรวจ/แก้ไข" : "ดูรายละเอียด"}
                        >
                           {user.role === Role.ADMIN || (user.role === Role.REVIEWER && p.status === ProposalStatus.IN_REVIEW) ? <Edit2 size={18} /> : <Eye size={18} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
