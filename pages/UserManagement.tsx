
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Role, CAMPUSES, FACULTIES, SCHOOLS, hasPermission, Permission, User, UserType } from '../types';
import { Trash2, UserPlus, Search, Shield, X, Check, Mail, MapPin, Lock, Filter, Loader2, AlertTriangle, Ban, Key, RotateCcw, Edit, Phone, FileText, Download } from 'lucide-react';

const UserManagement: React.FC = () => {
  const currentUser = db.currentUser;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterCampus, setFilterCampus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add User Form State
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: Role.RESEARCHER, // Default primary
    roles: [Role.RESEARCHER], // Array for multi-role
    type: UserType.STUDENT, // Default type
    campus: CAMPUSES[0],
    faculty: FACULTIES[0],
    password: ''
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async (isLoadMore: boolean = false) => {
      setLoading(true);
      try {
          const currentLastDoc = isLoadMore ? lastDoc : null;
          const { users: newUsers, lastDoc: newLastDoc } = await db.getUsers(filterRole, 20, currentLastDoc);
          
          if (isLoadMore) {
              setUsers(prev => [...prev, ...newUsers]);
          } else {
              setUsers(newUsers);
          }
          
          setLastDoc(newLastDoc);
          setHasMore(!!newLastDoc && newUsers.length === 20);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.roles, Permission.MANAGE_USERS)) {
        fetchUsers();
    }
  }, [currentUser, filterRole]); // Re-fetch when filterRole changes

  if (!currentUser || !hasPermission(currentUser.roles, Permission.MANAGE_USERS)) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
              <Lock size={48} className="mb-4 text-slate-300" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          </div>
      );
  }

  // Helper to determine primary role (priority: ADMIN > REVIEWER > ADVISOR > RESEARCHER)
  const getPrimaryRole = (roles: Role[]): Role => {
    if (roles.includes(Role.ADMIN)) return Role.ADMIN;
    if (roles.includes(Role.REVIEWER)) return Role.REVIEWER;
    if (roles.includes(Role.ADVISOR)) return Role.ADVISOR;
    return Role.RESEARCHER;
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser.id) {
        alert("ไม่สามารถระงับการใช้งานบัญชีของตนเองได้");
        return;
    }
    if (window.confirm(`ยืนยันการระงับการใช้งานผู้ใช้ "${name}"?\n(ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ แต่ข้อมูลในระบบจะยังคงอยู่)`)) {
      await db.deleteUser(id);
      fetchUsers(); 
    }
  };

  const handleResetPassword = async (email: string) => {
      if(window.confirm(`ต้องการส่งอีเมลรีเซ็ตรหัสผ่านไปยัง ${email} ใช่หรือไม่?`)) {
          const success = await db.resetPassword(email);
          if(success) alert(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${email} เรียบร้อยแล้ว\n\n* กรุณาแจ้งผู้ใช้งานให้ตรวจสอบในโฟลเดอร์ "จดหมายขยะ" (Spam/Junk) ด้วย`);
          else alert('เกิดข้อผิดพลาดในการส่งอีเมล');
      }
  };

  const toggleNewUserRole = (role: Role) => {
      setNewUser(prev => {
          const exists = prev.roles.includes(role);
          // Prevent removing the last role
          if (exists && prev.roles.length <= 1) {
              return prev; 
          }
          
          const updated = exists ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
          
          // Calculate new primary role based on priority
          const newPrimaryRole = getPrimaryRole(updated);

          return { ...prev, roles: updated, role: newPrimaryRole };
      });
  };

  const toggleEditUserRole = (role: Role) => {
      if (!editingUser) return;
      
      // Safety Check: Prevent removing ADMIN role from self
      if (editingUser.id === currentUser.id && role === Role.ADMIN && editingUser.roles.includes(Role.ADMIN)) {
          alert("ไม่สามารถยกเลิกสิทธิ์ Admin ของบัญชีที่กำลังใช้งานอยู่ได้ เพื่อป้องกันการถูกล็อคออกจากระบบ");
          return;
      }

      setEditingUser(prev => {
          if (!prev) return null;
          const exists = prev.roles.includes(role);
          
          // Safety Check: Must have at least one role
          if (exists && prev.roles.length <= 1) {
              alert("ผู้ใช้งานต้องมีอย่างน้อย 1 บทบาท");
              return prev;
          }

          const updated = exists ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
          
          // Calculate new primary role based on priority
          const newPrimaryRole = getPrimaryRole(updated);
          
          return { ...prev, roles: updated, role: newPrimaryRole };
      });
  };

  // CSV Import State
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = ['name,email,phoneNumber,role,campus,faculty,password'];
    const example = ['ดร.ตัวอย่าง ใจดี,example@tnsu.ac.th,0812345678,RESEARCHER,วิทยาเขตเชียงใหม่,คณะศึกษาศาสตร์,password123'];
    const csvContent = headers.concat(example).join("\n");
    
    // Add BOM (\uFEFF) so Excel opens it as UTF-8 correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "user_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
        try {
            // Remove BOM if present
            const text = (event.target?.result as string).replace(/^\uFEFF/, '');
            const lines = text.split(/\r\n|\n/); // Handle both CRLF and LF
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Basic validation of headers
            if (!headers.includes('email') || !headers.includes('name')) {
                throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (ต้องมีคอลัมน์ name และ email เป็นอย่างน้อย)');
            }

            let successCount = 0;
            let failCount = 0;
            const errors: string[] = [];

            // Process each line (skip header)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = line.split(',').map(v => v.trim());
                const userData: any = {};
                
                headers.forEach((header, index) => {
                    userData[header] = values[index];
                });

                // Validate required fields
                if (!userData.email || !userData.name) {
                    failCount++;
                    errors.push(`แถวที่ ${i + 1}: ข้อมูลไม่ครบถ้วน`);
                    continue;
                }

                try {
                    // Parse roles (support multiple separated by | or ;)
                    let roles: Role[] = [Role.RESEARCHER];
                    if (userData.role) {
                        // Split by | or ;
                        const rawRoles = userData.role.split(/[|;]/).map((r: string) => r.trim());
                        // Filter only valid roles
                        const validRoles = rawRoles.filter((r: string) => Object.values(Role).includes(r as Role)) as Role[];
                        
                        if (validRoles.length > 0) {
                            roles = validRoles;
                        }
                    }

                    // Determine primary role
                    const primaryRole = getPrimaryRole(roles);

                    // Default password if not provided
                    const password = userData.password || 'password123';

                    await db.register({
                        name: userData.name,
                        email: userData.email,
                        phoneNumber: userData.phoneNumber || '',
                        role: primaryRole,
                        roles: roles,
                        campus: userData.campus || CAMPUSES[0],
                        faculty: userData.faculty || FACULTIES[0]
                    }, password);
                    
                    successCount++;
                } catch (err: any) {
                    failCount++;
                    errors.push(`แถวที่ ${i + 1} (${userData.email}): ${err.message}`);
                }
            }

            let message = `นำเข้าข้อมูลเสร็จสิ้น\n- สำเร็จ: ${successCount} รายการ\n- ล้มเหลว: ${failCount} รายการ`;
            if (errors.length > 0) {
                message += `\n\nรายละเอียดข้อผิดพลาด:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...และอื่นๆ' : ''}`;
            }
            
            alert(message);
            fetchUsers();

        } catch (error: any) {
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    reader.readAsText(file);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if(newUser.roles.length === 0) {
        alert('กรุณาเลือกบทบาทอย่างน้อย 1 บทบาท');
        return;
    }

    setIsSubmitting(true);
    try {
        const finalPassword = newUser.password || 'password123';
        
        await db.register({
            ...newUser
        }, finalPassword);
        
        alert(`เพิ่มผู้ใช้งาน ${newUser.name} เรียบร้อยแล้ว\nรหัสผ่านเริ่มต้น: ${finalPassword}\n\n* ระบบได้ส่งอีเมลแจ้งเตือนแล้ว กรุณาแจ้งผู้ใช้ให้ตรวจสอบใน "จดหมายขยะ" (Spam/Junk) ด้วย`);
        fetchUsers();
        setIsAdding(false);
        setNewUser({ ...newUser, name: '', email: '', phoneNumber: '', password: '', roles: [Role.RESEARCHER], role: Role.RESEARCHER });
    } catch(err: any) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      if (editingUser.roles.length === 0) return alert('ต้องมีอย่างน้อย 1 บทบาท');

      setIsSubmitting(true);
      try {
          await db.updateUser(editingUser.id, {
              name: editingUser.name,
              phoneNumber: editingUser.phoneNumber,
              roles: editingUser.roles,
              role: getPrimaryRole(editingUser.roles), // Ensure primary role is consistent with priority
              type: editingUser.type, // Include type update
              campus: editingUser.campus,
              faculty: editingUser.faculty
          });
          alert('อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
          setEditingUser(null);
          fetchUsers();
      } catch (err: any) {
          alert('เกิดข้อผิดพลาดในการอัปเดต: ' + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const filteredUsers = users.filter(user => {
    const matchRole = filterRole === 'ALL' || user.roles.includes(filterRole as Role);
    const matchCampus = filterCampus === 'ALL' || user.campus === filterCampus;
    const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (user.phoneNumber && user.phoneNumber.includes(searchTerm));
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

  const rolePriority = { [Role.ADMIN]: 0, [Role.REVIEWER]: 1, [Role.ADVISOR]: 2, [Role.RESEARCHER]: 3 };

  if(loading && users.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน</h2>
          <p className="text-slate-500">เพิ่ม ระงับ และแก้ไขสิทธิ์การเข้าใช้งานระบบ</p>
        </div>
        <div className="flex gap-2">
            {/* Migration Tool (Hidden unless needed) */}
            <button 
                onClick={async () => {
                    if(confirm("ยืนยันการแปลงข้อมูลผู้ใช้ (Migrate Roles)?\nการดำเนินการนี้จะอัปเดตข้อมูลผู้ใช้ทั้งหมดให้รองรับระบบหลายบทบาท")) {
                        setLoading(true);
                        try {
                            const result = await db.migrateUserRoles();
                            alert(result);
                            fetchUsers();
                        } catch(e: any) {
                            alert("Error: " + e.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }}
                className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
                title="แปลงข้อมูล Role เก่า -> Roles ใหม่"
            >
                <RotateCcw size={20}/> Migrate Data
            </button>

            <input 
                type="file" 
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="bg-green-600 text-white hover:bg-green-700 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm disabled:opacity-50"
            >
                {importing ? <Loader2 size={20} className="animate-spin"/> : <FileText size={20}/>}
                นำเข้า CSV
            </button>
            <button 
                onClick={handleDownloadTemplate}
                className="bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm group relative"
                title="ดาวน์โหลดไฟล์ตัวอย่าง"
            >
                <Download size={18}/>
                <div className="absolute top-full right-0 mt-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    แนะนำให้ใช้ <b>Google Sheets</b> หรือ <b>Notepad</b> ในการแก้ไขไฟล์เพื่อป้องกันภาษาไทยเพี้ยน (หากใช้ Excel ต้องบันทึกเป็น CSV UTF-8)
                    <br/><br/>
                    *กรณีมีหลายบทบาท ให้คั่นด้วยเครื่องหมาย <b>|</b> หรือ <b>;</b> (เช่น RESEARCHER|ADVISOR)
                </div>
            </button>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className={`${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'} px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm`}
            >
              {isAdding ? <X size={20}/> : <UserPlus size={20}/>}
              {isAdding ? 'ยกเลิก' : 'เพิ่มผู้ใช้งาน'}
            </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={16} />เพิ่มสมาชิกใหม่</h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label><input required type="text" className="w-full border p-2.5 rounded-lg" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="เช่น ดร.สมชาย ใจดี" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label><input required type="email" className="w-full border p-2.5 rounded-lg" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="email@tnsu.ac.th" /></div>
            
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (จำเป็น)</label>
                <input required type="text" className="w-full border p-2.5 rounded-lg" value={newUser.phoneNumber} onChange={e => setNewUser({...newUser, phoneNumber: e.target.value})} placeholder="08X-XXXXXXX" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">บทบาท (เลือกได้มากกว่า 1)</label>
                <div className="flex gap-4 flex-wrap">
                    {Object.values(Role).map(r => (
                        <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${newUser.roles.includes(r) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200'}`}>
                            <input type="checkbox" checked={newUser.roles.includes(r)} onChange={() => toggleNewUserRole(r)} className="rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm font-medium">{r}</span>
                        </label>
                    ))}
                </div>
            </div>

            {newUser.roles.includes(Role.RESEARCHER) && (
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทผู้ใช้งาน (สำหรับผู้วิจัย)</label>
                   <select 
                     className="w-full p-2.5 border border-slate-300 rounded-lg"
                     value={newUser.type}
                     onChange={(e) => setNewUser({...newUser, type: e.target.value as UserType})}
                   >
                     <option value={UserType.STUDENT}>นักศึกษา</option>
                     <option value={UserType.STAFF}>อาจารย์/บุคลากร</option>
                     <option value={UserType.EXTERNAL}>บุคคลภายนอก</option>
                   </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">วิทยาเขต</label>
                  <select className="w-full border p-2.5 rounded-lg text-sm" value={newUser.campus} onChange={e => {
                      setNewUser({...newUser, campus: e.target.value});
                      if (e.target.value === 'บุคลากรภายนอก') {
                          setNewUser(prev => ({...prev, faculty: '', campus: e.target.value}));
                      } else {
                          setNewUser(prev => ({...prev, faculty: FACULTIES[0], campus: e.target.value}));
                      }
                  }}>
                      <optgroup label="ส่วนกลาง">
                           <option value="สำนักงานอธิการบดี">สำนักงานอธิการบดี</option>
                      </optgroup>
                      <optgroup label="วิทยาเขต">
                          {CAMPUSES.filter(c => c !== 'สำนักงานอธิการบดี' && c !== 'บุคลากรภายนอก').map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="โรงเรียนกีฬา">
                          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                      <optgroup label="อื่นๆ">
                           <option value="บุคลากรภายนอก">บุคลากรภายนอก</option>
                      </optgroup>
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                      {newUser.campus === 'บุคลากรภายนอก' ? 'ชื่อหน่วยงาน' : 'คณะ'}
                  </label>
                  {newUser.campus === 'บุคลากรภายนอก' ? (
                      <input 
                          type="text" 
                          required 
                          value={newUser.faculty} 
                          onChange={e => setNewUser({...newUser, faculty: e.target.value})} 
                          className="w-full border p-2.5 rounded-lg text-sm" 
                          placeholder="ระบุชื่อหน่วยงาน"
                      />
                  ) : (
                      <select className="w-full border p-2.5 rounded-lg text-sm" value={newUser.faculty} onChange={e => setNewUser({...newUser, faculty: e.target.value})}>
                          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                  )}
              </div>
            </div>
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
               <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
               >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} 
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
               </button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-slate-800">แก้ไขข้อมูลผู้ใช้งาน</h3>
                    <button onClick={() => setEditingUser(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                         <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล (Read Only)</label>
                         <input disabled type="text" className="w-full bg-slate-100 border p-2.5 rounded-lg text-slate-500" value={editingUser.email} />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                         <input required type="text" className="w-full border p-2.5 rounded-lg" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                         <input type="text" className="w-full border p-2.5 rounded-lg" value={editingUser.phoneNumber || ''} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} placeholder="08X-XXXXXXX" />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">บทบาท (เลือกได้มากกว่า 1)</label>
                        <div className="flex gap-4 flex-wrap">
                            {Object.values(Role).map(r => {
                                const isSelfAdmin = editingUser.id === currentUser.id && r === Role.ADMIN;
                                return (
                                <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border select-none transition-colors ${editingUser.roles.includes(r) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200'} ${isSelfAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={editingUser.roles.includes(r)} 
                                        onChange={() => !isSelfAdmin && toggleEditUserRole(r)} 
                                        disabled={isSelfAdmin}
                                        className={`rounded text-blue-600 focus:ring-blue-500 ${isSelfAdmin ? 'cursor-not-allowed' : ''}`}
                                    />
                                    <span className="text-sm font-medium">{r}</span>
                                    {isSelfAdmin && <Lock size={12} className="ml-1" />}
                                </label>
                            )})}
                        </div>
                    </div>

                    {editingUser.roles.includes(Role.RESEARCHER) && (
                        <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทผู้ใช้งาน (สำหรับผู้วิจัย)</label>
                           <select 
                             className="w-full p-2.5 border border-slate-300 rounded-lg"
                             value={editingUser.type || UserType.STUDENT}
                             onChange={(e) => setEditingUser({...editingUser, type: e.target.value as UserType})}
                           >
                             <option value={UserType.STUDENT}>นักศึกษา</option>
                             <option value={UserType.STAFF}>อาจารย์/บุคลากร</option>
                             <option value={UserType.EXTERNAL}>บุคคลภายนอก</option>
                           </select>
                        </div>
                    )}

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">วิทยาเขต</label>
                         <select className="w-full border p-2.5 rounded-lg" value={editingUser.campus} onChange={e => {
                             setEditingUser({...editingUser, campus: e.target.value});
                             if (e.target.value === 'บุคลากรภายนอก') {
                                 setEditingUser(prev => prev ? ({...prev, faculty: '', campus: e.target.value}) : null);
                             } else {
                                 setEditingUser(prev => prev ? ({...prev, faculty: FACULTIES[0], campus: e.target.value}) : null);
                             }
                         }}>
                            <optgroup label="ส่วนกลาง">
                                 <option value="สำนักงานอธิการบดี">สำนักงานอธิการบดี</option>
                            </optgroup>
                            <optgroup label="วิทยาเขต">
                                {CAMPUSES.filter(c => c !== 'สำนักงานอธิการบดี' && c !== 'บุคลากรภายนอก').map(c => <option key={c} value={c}>{c}</option>)}
                            </optgroup>
                            <optgroup label="โรงเรียนกีฬา">
                                {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                            <optgroup label="อื่นๆ">
                                 <option value="บุคลากรภายนอก">บุคลากรภายนอก</option>
                            </optgroup>
                         </select>
                    </div>
                    <div className="md:col-span-2">
                         <label className="block text-sm font-medium text-slate-700 mb-1">
                             {editingUser.campus === 'บุคลากรภายนอก' ? 'ชื่อหน่วยงาน' : 'คณะ'}
                         </label>
                         {editingUser.campus === 'บุคลากรภายนอก' ? (
                             <input 
                                 type="text" 
                                 required 
                                 value={editingUser.faculty} 
                                 onChange={e => setEditingUser({...editingUser, faculty: e.target.value})} 
                                 className="w-full border p-2.5 rounded-lg" 
                                 placeholder="ระบุชื่อหน่วยงาน"
                             />
                         ) : (
                             <select className="w-full border p-2.5 rounded-lg" value={editingUser.faculty} onChange={e => setEditingUser({...editingUser, faculty: e.target.value})}>
                                 {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                             </select>
                         )}
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3 pt-4 mt-2">
                         <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded-lg text-slate-600">ยกเลิก</button>
                         <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                         >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            บันทึกการเปลี่ยนแปลง
                         </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
         <div className="flex gap-2 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 no-scrollbar">
           {['ALL', Role.REVIEWER, Role.ADVISOR, Role.RESEARCHER, Role.ADMIN].map((role) => (
             <button key={role} onClick={() => setFilterRole(role)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterRole === role ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{role === 'ALL' ? 'ทั้งหมด' : role}</button>
           ))}
         </div>
         <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:w-48" value={filterCampus} onChange={e => setFilterCampus(e.target.value)}>
                <option value="ALL">ทุกวิทยาเขต</option>
                <optgroup label="ส่วนกลาง">
                     <option value="สำนักงานอธิการบดี">สำนักงานอธิการบดี</option>
                </optgroup>
                <optgroup label="วิทยาเขต">
                    {CAMPUSES.filter(c => c !== 'สำนักงานอธิการบดี' && c !== 'บุคลากรภายนอก').map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="โรงเรียนกีฬา">
                    {SCHOOLS.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="อื่นๆ">
                     <option value="บุคลากรภายนอก">บุคลากรภายนอก</option>
                </optgroup>
            </select>
            <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="text" placeholder="ค้นหาชื่อ หรือเบอร์โทร..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">ผู้ใช้งาน</th>
                <th className="px-6 py-4 text-left">เบอร์โทรศัพท์</th>
                <th className="px-6 py-4 text-left">บทบาท</th>
                <th className="px-6 py-4 text-left">สังกัด</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400"><div className="flex flex-col items-center justify-center"><Filter size={32} className="text-slate-300 mb-2"/><p>ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไข</p></div></td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 text-sm">{user.name.charAt(0)}</div>
                            <div>
                                <div className="font-medium text-slate-900">{user.name}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-1"><Mail size={12} /> {user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        {user.phoneNumber ? (
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                <Phone size={14} className="text-slate-400"/> {user.phoneNumber}
                            </div>
                        ) : (
                            <span className="text-slate-400 text-xs italic">- ไม่ระบุ -</span>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                            {user.roles
                                .sort((a, b) => {
                                    return (rolePriority[a] || 99) - (rolePriority[b] || 99);
                                })
                                .map(r => (
                                <span key={r} className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold uppercase ${getRoleBadge(r)}`}>{r}</span>
                            ))}
                        </div>
                    </td>
                    <td className="px-6 py-4"><div className="text-sm text-slate-900">{user.campus}</div><div className="text-xs text-slate-500">{user.faculty}</div></td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-1">
                           <button onClick={() => setEditingUser(user)} disabled={user.id === currentUser.id} className="p-2 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors" title="แก้ไขข้อมูล">
                             <Edit size={18} />
                           </button>
                           <button onClick={() => handleResetPassword(user.email)} disabled={user.id === currentUser.id} className="p-2 text-slate-400 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-colors" title="รีเซ็ตรหัสผ่าน (ส่งอีเมล)">
                             <RotateCcw size={18} />
                           </button>
                           <button onClick={() => handleDelete(user.id, user.name)} disabled={user.id === currentUser.id} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="ระงับการใช้งาน">
                             <Ban size={18} />
                           </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
            <div className="p-4 border-t border-slate-100 flex justify-center">
                <button 
                    onClick={() => fetchUsers(true)} 
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    โหลดเพิ่มเติม...
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
