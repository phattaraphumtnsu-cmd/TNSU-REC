
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Role, CAMPUSES, FACULTIES, SCHOOLS, hasPermission, Permission, User } from '../types';
import { Trash2, UserPlus, Search, Shield, X, Check, Mail, MapPin, Lock, Filter, Loader2, AlertTriangle, Ban, Key } from 'lucide-react';

const UserManagement: React.FC = () => {
  const currentUser = db.currentUser;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    password: ''
  });

  // Role Change Modal State
  const [roleConfirm, setRoleConfirm] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    newRole: Role | null;
  }>({ isOpen: false, userId: '', userName: '', newRole: null });

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const data = await db.getUsers();
          setUsers(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
        fetchUsers();
    }
  }, [currentUser]);

  if (!currentUser || !hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
              <Lock size={48} className="mb-4 text-slate-300" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          </div>
      );
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`ยืนยันการระงับการใช้งานผู้ใช้ "${name}"?\n(ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ แต่ข้อมูลในระบบจะยังคงอยู่)`)) {
      await db.deleteUser(id);
      fetchUsers(); 
    }
  };

  const handleRoleChangeRequest = (userId: string, userName: string, newRole: Role) => {
      setRoleConfirm({
          isOpen: true,
          userId,
          userName,
          newRole
      });
  };

  const confirmRoleChange = async () => {
    if (roleConfirm.userId && roleConfirm.newRole) {
       await db.updateUser(roleConfirm.userId, { role: roleConfirm.newRole });
       await fetchUsers();
       setRoleConfirm({ isOpen: false, userId: '', userName: '', newRole: null });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const finalPassword = newUser.password || 'password123';
        
        await db.register({
            ...newUser
        }, finalPassword);
        
        alert(`เพิ่มผู้ใช้งาน ${newUser.name} เรียบร้อยแล้ว\nรหัสผ่านเริ่มต้น: ${finalPassword}`);
        fetchUsers();
        setIsAdding(false);
        setNewUser({ ...newUser, name: '', email: '', password: '' });
    } catch(err: any) {
        const errMsg = err.message || '';
        const errCode = err.code || '';

        let msg = "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน";
        
        if (errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
            msg = "เกิดข้อผิดพลาด: อีเมลนี้มีผู้ใช้งานในระบบแล้ว (Email already in use)\nกรุณาตรวจสอบว่ามีบัญชีนี้อยู่แล้วหรือไม่ หรือใช้อีเมลอื่น";
            console.warn("Add user failed: Email already exists.");
        } else if (errCode === 'auth/weak-password' || errMsg.includes('weak-password')) {
            msg = "เกิดข้อผิดพลาด: รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
            console.warn("Add user failed: Weak password.");
        } else if (errCode === 'auth/invalid-email' || errMsg.includes('invalid-email')) {
            msg = "เกิดข้อผิดพลาด: รูปแบบอีเมลไม่ถูกต้อง";
            console.warn("Add user failed: Invalid email.");
        } else if (errCode === 'permission-denied' || errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions')) {
            msg = "สิทธิ์การใช้งานไม่เพียงพอ (Permission Denied): ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบสิทธิ์ Admin";
            console.error("Add user permission error:", err);
        } else {
            msg = `เกิดข้อผิดพลาดที่ไม่ระบุ: ${errMsg}`;
            console.error("Add user unexpected error:", err);
        }
        
        alert(msg);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchRole = filterRole === 'ALL' || user.role === filterRole;
    const matchCampus = filterCampus === 'ALL' || user.campus === filterCampus;
    const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchRole && matchCampus && matchSearch;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case Role.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case Role.REVIEWER: return 'bg-blue-100 text-blue-700 border-blue-200';
      case Role.ADVISOR: return 'bg-orange-100 text-orange-700 border-orange-200';
      case Role.RESEARCHER: return 'bg-green-100 text-green-700 border-green-200';
      case 'SUSPENDED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if(loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน</h2>
          <p className="text-slate-500">เพิ่ม ระงับ และแก้ไขสิทธิ์การเข้าใช้งานระบบ</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'} px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium`}
        >
          {isAdding ? <X size={20}/> : <UserPlus size={20}/>}
          {isAdding ? 'ยกเลิก' : 'เพิ่มผู้ใช้งาน'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={16} />เพิ่มสมาชิกใหม่</h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label><input required type="text" className="w-full border p-2.5 rounded-lg" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="เช่น ดร.สมชาย ใจดี" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label><input required type="email" className="w-full border p-2.5 rounded-lg" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="email@tnsu.ac.th" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">บทบาท (Role)</label><select className="w-full border p-2.5 rounded-lg" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}><option value={Role.REVIEWER}>Reviewer</option><option value={Role.ADVISOR}>Advisor</option><option value={Role.ADMIN}>Admin</option><option value={Role.RESEARCHER}>Researcher</option></select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">วิทยาเขต</label><select className="w-full border p-2.5 rounded-lg text-sm" value={newUser.campus} onChange={e => setNewUser({...newUser, campus: e.target.value})}>{CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}{SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">คณะ</label><select className="w-full border p-2.5 rounded-lg text-sm" value={newUser.faculty} onChange={e => setNewUser({...newUser, faculty: e.target.value})}>{FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
            </div>
            
            {/* Password Input Added Here */}
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านเริ่มต้น</label>
               <div className="relative">
                  <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                     type="text" 
                     className="w-full border p-2.5 pl-10 rounded-lg bg-blue-50/30 focus:bg-white transition-colors" 
                     value={newUser.password} 
                     onChange={e => setNewUser({...newUser, password: e.target.value})} 
                     placeholder="กำหนดรหัสผ่าน (เช่น password123)" 
                  />
               </div>
               <p className="text-xs text-slate-500 mt-1">แจ้งรหัสผ่านนี้ให้ผู้ใช้สำหรับเข้าสู่ระบบครั้งแรก</p>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
               <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
               <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"><Check size={18} /> บันทึกข้อมูล</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
         <div className="flex gap-2 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 no-scrollbar">
           {['ALL', Role.REVIEWER, Role.ADVISOR, Role.RESEARCHER, Role.ADMIN].map((role) => (
             <button key={role} onClick={() => setFilterRole(role)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterRole === role ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{role === 'ALL' ? 'ทั้งหมด' : role}</button>
           ))}
         </div>
         <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:w-48" value={filterCampus} onChange={e => setFilterCampus(e.target.value)}><option value="ALL">ทุกวิทยาเขต</option><optgroup label="วิทยาเขต">{CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup><optgroup label="โรงเรียนกีฬา">{SCHOOLS.map(c => <option key={c} value={c}>{c}</option>)}</optgroup></select>
            <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="text" placeholder="ค้นหาชื่อ หรืออีเมล..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <tr><th className="px-6 py-4 text-left">ผู้ใช้งาน</th><th className="px-6 py-4 text-left">บทบาท</th><th className="px-6 py-4 text-left">สังกัด</th><th className="px-6 py-4 text-right">จัดการ</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400"><div className="flex flex-col items-center justify-center"><Filter size={32} className="text-slate-300 mb-2"/><p>ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไข</p></div></td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4"><div className="flex items-center"><div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 text-sm">{user.name.charAt(0)}</div><div><div className="font-medium text-slate-900">{user.name}</div><div className="text-sm text-slate-500 flex items-center gap-1"><Mail size={12} /> {user.email}</div></div></div></td>
                    <td className="px-6 py-4"><select value={user.role} onChange={(e) => handleRoleChangeRequest(user.id, user.name, e.target.value as Role)} disabled={user.id === currentUser.id} className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold uppercase cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${getRoleBadge(user.role)}`}>{Object.values(Role).map(r => (<option key={r} value={r} className="bg-white text-slate-900">{r}</option>))}</select></td>
                    <td className="px-6 py-4"><div className="text-sm text-slate-900">{user.campus}</div><div className="text-xs text-slate-500">{user.faculty}</div></td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => handleDelete(user.id, user.name)} disabled={user.id === currentUser.id} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title="ระงับการใช้งาน">
                         <Ban size={18} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {roleConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center mb-4">
                 <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-3"><AlertTriangle size={24} /></div>
                 <h3 className="text-lg font-bold text-slate-800">ยืนยันการเปลี่ยนบทบาท</h3>
                 <p className="text-sm text-slate-600 mt-2">ต้องการเปลี่ยนบทบาทของ <strong>{roleConfirm.userName}</strong><br/>เป็น <span className="font-bold text-blue-600">{roleConfirm.newRole}</span> ใช่หรือไม่?</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setRoleConfirm({isOpen: false, userId: '', userName: '', newRole: null})} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                 <button onClick={confirmRoleChange} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ยืนยัน</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
