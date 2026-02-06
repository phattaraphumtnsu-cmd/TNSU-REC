import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../services/database';
import { ProposalStatus, FACULTIES, Proposal, Role } from '../types';
import { Loader2 } from 'lucide-react';

const Reports: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
       setLoading(true);
       try {
           // Fetch all proposals if admin, or logic could be restricted. 
           // For reports, we typically want global stats. Assuming admin role here or unrestricted read for report page.
           const data = await db.getProposals(Role.ADMIN, 'admin_placeholder'); 
           setProposals(data);
       } catch (e) {
           console.error(e);
       } finally {
           setLoading(false);
       }
    };
    fetchData();
  }, []);

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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-lg font-semibold mb-4">ผลการประเมินความพึงพอใจ</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
               <div className="text-2xl font-bold text-blue-700">4.5/5</div>
               <div className="text-sm text-blue-600">ด้านระบบสารสนเทศ</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
               <div className="text-2xl font-bold text-green-700">4.2/5</div>
               <div className="text-sm text-green-600">ด้านกระบวนการ</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
               <div className="text-2xl font-bold text-purple-700">4.4/5</div>
               <div className="text-sm text-purple-600">ภาพรวม</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Reports;