import React, { useState } from 'react';
import { db } from '../services/mockDatabase';
import { Role, CAMPUSES, FACULTIES, SCHOOLS, hasPermission, Permission } from '../types';
import { Trash2, UserPlus, Search, Shield, X, Check, Mail, MapPin, Lock, Filter } from 'lucide-react';

const UserManagement: React.FC = () => {
  const currentUser = db.currentUser;
  const [users, setUsers] = useState(db.users);
  
  // Filters
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterCampus, setFilterCampus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add User Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: Role.REVIEWER,
    campus: CAMPUSES[0],
    faculty: FACULTIES[0],
    password: 'password123'
  });

  // Guard Clause: Only allow users with MANAGE_USERS permission
  if (!currentUser || !hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
              <Lock size={48} className="mb-4 text-slate-300" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          </div>
      );
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`ยืนยันการลบผู้ใช้งาน "${name}"?`)) {
      db.deleteUser(id);
      setUsers([...db.users]); // Trigger re-render
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    db.register({
      id: '', // Will be generated
      ...newUser
    });
    alert(`เพิ่มผู้ใช้งาน ${newUser.name} เรียบร้อยแล้ว`);
    setUsers([...db.users]);
    setIsAdding(false);
    setNewUser({ ...newUser, name: '', email: '' });
  };

  // Filtering Logic
  const filteredUsers = users.filter(user => {
    const matchRole = filterRole === 'ALL' || user.role === filterRole;
    const matchCampus = filterCampus === 'ALL' || user.campus === filterCampus;
    const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchRole && matchCampus && matchSearch;
  });

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case Role.REVIEWER: return 'bg-blue-100 text-blue-700 border-blue-200';
      case Role.ADVISOR: return 'bg-orange-100 text-orange-700 border-orange-200';
      case Role.RESEARCHER: return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน</h2>
          <p className="text-slate-500">เพิ่ม ลบ และแก้ไขสิทธิ์การเข้าใช้งานระบบ</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'} px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium`}
        >
          {isAdding ? <X size={20}/> : <UserPlus size={20}/>}
          {isAdding ? 'ยกเลิก' : 'เพิ่มผู้ใช้งาน'}
        </button>
      </div>

      {/* Add User Form Panel */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
               <UserPlus size={16} />
            </div>
            เพิ่มสมาชิกใหม่
          </h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
              <input required type="text" className="w-full border p-2.5 rounded-lg" 
                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="เช่น ดร.สมชาย ใจดี" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
              <input required type="email" className="w-full border p-2.5 rounded-lg" 
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="email@tnsu.ac.th" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">บทบาท (Role)</label>
              <select className="w-full border p-2.5 rounded-lg" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}>
                <option value={Role.REVIEWER}>Reviewer (กรรมการ)</option>
                <option value={Role.ADVISOR}>Advisor (ที่ปรึกษา)</option>
                <option value={Role.ADMIN}>Admin (ผู้ดูแลระบบ)</option>
                <option value={Role.RESEARCHER}>Researcher (นักวิจัย/เจ้าหน้าที่)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วิทยาเขต</label>
                <select className="w-full border p-2.5 rounded-lg text-sm" value={newUser.campus} onChange={e => setNewUser({...newUser, campus: e.target.value})}>
                   {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                   {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">คณะ</label>
                 <select className="w-full border p-2.5 rounded-lg text-sm" value={newUser.faculty} onChange={e => setNewUser({...newUser, faculty: e.target.value})}>
                   {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
               <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                 <Check size={18} /> บันทึกข้อมูล
               </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
         
         {/* Role Filters */}
         <div className="flex gap-2 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 no-scrollbar">
           {['ALL', Role.REVIEWER, Role.ADVISOR, Role.RESEARCHER, Role.ADMIN].map((role) => (
             <button
               key={role}
               onClick={() => setFilterRole(role)}
               className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                 filterRole === role 
                   ? 'bg-slate-800 text-white' 
                   : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
               }`}
             >
               {role === 'ALL' ? 'ทั้งหมด' : role}
             </button>
           ))}
         </div>

         {/* Search & Campus Filter */}
         <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <select 
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white md:w-48"
              value={filterCampus}
              onChange={e => setFilterCampus(e.target.value)}
            >
               <option value="ALL">ทุกวิทยาเขต/โรงเรียน</option>
               <optgroup label="วิทยาเขต">
                  {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
               </optgroup>
               <optgroup label="โรงเรียนกีฬา">
                  {SCHOOLS.map(c => <option key={c} value={c}>{c}</option>)}
               </optgroup>
            </select>
            
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ หรืออีเมล..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
         </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">ผู้ใช้งาน</th>
                <th className="px-6 py-4 text-left">บทบาท</th>
                <th className="px-6 py-4 text-left">สังกัด</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                     <div className="flex flex-col items-center justify-center">
                        <Filter size={32} className="text-slate-300 mb-2"/>
                        <p>ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไข</p>
                     </div>
                   </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 text-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1">
                             <Mail size={12} /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-bold uppercase ${getRoleBadge(user.role)}`}>
                        {user.role === Role.ADMIN && <Shield size={10} className="mr-1" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                       <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400" />
                          {user.campus || '-'}
                       </div>
                       <div className="text-xs text-slate-400 ml-5">{user.faculty}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {user.role !== Role.ADMIN && (
                         <button 
                           onClick={() => handleDelete(user.id, user.name)}
                           className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                           title="ลบผู้ใช้งาน"
                         >
                           <Trash2 size={18} />
                         </button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
           <span>แสดง {filteredUsers.length} รายการ</span>
           {(searchTerm || filterRole !== 'ALL' || filterCampus !== 'ALL') && (
              <span className="text-orange-600">(กำลังกรองข้อมูล)</span>
           )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;