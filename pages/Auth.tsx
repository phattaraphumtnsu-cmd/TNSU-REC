
import React, { useState } from 'react';
import { db } from '../services/database';
import { CAMPUSES, FACULTIES, Role, SCHOOLS, UserType, User } from '../types';
import { User as UserIcon, Lock, HelpCircle, ArrowLeft, Mail, Key, Loader2, Phone } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  onNavigateManual: () => void;
}

type AuthView = 'LOGIN' | 'REGISTER' | 'FORGOT_EMAIL' | 'FORGOT_NEW_PASS';

const Auth: React.FC<AuthProps> = ({ onLogin, onNavigateManual }) => {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [regRole, setRegRole] = useState<Role>(Role.RESEARCHER);
  const [regType, setRegType] = useState<UserType>(UserType.STUDENT);
  const [regCampus, setRegCampus] = useState(CAMPUSES[0]);
  const [regFaculty, setRegFaculty] = useState(FACULTIES[0]);

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await db.login(email, password);
      onLogin(user);
    } catch (err: any) {
      const errCode = err.code || '';
      const errMsg = err.message || '';

      // Handle expected auth errors without clogging console
      if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
         setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (errCode === 'auth/user-not-found') {
         setError('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ');
      } else if (errCode === 'auth/wrong-password') {
         setError('รหัสผ่านไม่ถูกต้อง');
      } else if (errCode === 'auth/invalid-email') {
         setError('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (errCode === 'auth/user-disabled') {
         setError('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
      } else if (errCode === 'auth/too-many-requests') {
         setError('มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่แล้วลองใหม่');
      } else if (errCode === 'auth/network-request-failed') {
         setError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาตรวจสอบอินเทอร์เน็ต');
      } else if (errMsg === 'ไม่พบข้อมูลผู้ใช้งานในระบบฐานข้อมูล') {
         setError('บัญชีนี้ไม่มีข้อมูลในระบบ (User Profile Missing)');
      } else {
         console.error("Login error object:", err); // Only log unexpected errors
         setError(errMsg || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPass !== regConfirmPass) {
      setError('รหัสผ่านยืนยันไม่ตรงกับรหัสผ่านที่ตั้งไว้');
      return;
    }
    if (regPass.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const newUser = await db.register({
        name: regName,
        email: regEmail,
        phoneNumber: regPhone,
        role: regRole,
        roles: [regRole],
        type: regRole === Role.RESEARCHER ? regType : undefined,
        campus: regCampus,
        faculty: regRole === Role.RESEARCHER || regRole === Role.ADVISOR ? regFaculty : undefined,
      }, regPass);

      alert('ลงทะเบียนสำเร็จ ระบบจะนำท่านเข้าสู่ระบบอัตโนมัติ');
      onLogin(newUser);
    } catch (err: any) {
      console.error("Register error:", err);
      const errCode = err.code || '';
      const errMsg = err.message || '';

      if (errCode === 'auth/email-already-in-use') {
         setError('อีเมลนี้มีผู้ใช้งานแล้ว');
      } else if (errCode === 'auth/invalid-email') {
         setError('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (errCode === 'auth/weak-password') {
         setError('รหัสผ่านคาดเดาง่ายเกินไป กรุณาตั้งรหัสผ่านให้ยากขึ้น (อย่างน้อย 6 ตัวอักษร)');
      } else if (errCode === 'auth/network-request-failed') {
         setError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาตรวจสอบอินเทอร์เน็ต');
      } else {
         setError('การลงทะเบียนล้มเหลว: ' + (errMsg || 'โปรดลองอีกครั้ง'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.resetPassword(resetEmail);
      alert(`ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${resetEmail} แล้ว (หากอีเมลมีอยู่ในระบบ)`);
      setView('LOGIN');
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการส่งอีเมล กรุณาตรวจสอบอีเมลหรือลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch(view) {
      case 'LOGIN': return 'เข้าสู่ระบบ';
      case 'REGISTER': return 'ลงทะเบียนสมาชิกใหม่';
      case 'FORGOT_EMAIL': return 'ลืมรหัสผ่าน';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* Help Button Absolute */}
      <button 
        onClick={onNavigateManual}
        className="fixed top-4 right-4 bg-white text-blue-600 px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium z-50"
      >
        <HelpCircle size={18} /> คู่มือการใช้งาน
      </button>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Brand */}
        <div className="md:w-1/2 bg-blue-700 p-10 flex flex-col justify-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="z-10">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg p-3 mx-auto md:mx-0">
               <img 
                 src="https://lh3.googleusercontent.com/d/1cRjmEPgytoyDLRYvoegnN3OaqrayaF-c" 
                 alt="TNSU Logo" 
                 className="w-full h-full object-contain"
                 referrerPolicy="no-referrer"
               />
            </div>
            <h1 className="text-3xl font-bold mb-2">TNSU-REC</h1>
            <p className="text-blue-100 text-lg mb-8">ระบบจริยธรรมการวิจัยในมนุษย์<br/>มหาวิทยาลัยการกีฬาแห่งชาติ</p>
            <div className="space-y-4 text-sm text-blue-200">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div>
                 <span>ยื่นขอใบรับรองจริยธรรมออนไลน์</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div>
                 <span>ติดตามสถานะและรับ E-Certificate</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div>
                 <span>แจ้งเตือนรายงานความก้าวหน้า</span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-10 py-12">
          
          {/* Removed First Time Setup Alert */}

          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            {getTitle()}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
              <span className="font-bold flex-shrink-0">!</span> 
              <span>{error}</span>
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="user@tnsu.ac.th"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button type="button" onClick={() => { setView('FORGOT_EMAIL'); setError(''); }} className="text-sm text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                  ลืมรหัสผ่าน?
                </button>
              </div>

              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={20} />}
                เข้าสู่ระบบ
              </button>
              <div className="text-center mt-4">
                 <button type="button" onClick={() => { setView('REGISTER'); setError(''); }} className="text-sm text-blue-600 hover:underline">
                    ยังไม่มีบัญชี? ลงทะเบียนที่นี่
                 </button>
              </div>
            </form>
          )}

          {view === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Role Selection */}
              <div className="flex gap-4 mb-4">
                 <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm font-medium ${regRole === Role.RESEARCHER ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}>
                    <input type="radio" name="role" className="hidden" checked={regRole === Role.RESEARCHER} onChange={() => setRegRole(Role.RESEARCHER)} />
                    ผู้วิจัย
                 </label>
                 <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm font-medium ${regRole === Role.ADVISOR ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}>
                    <input type="radio" name="role" className="hidden" checked={regRole === Role.ADVISOR} onChange={() => setRegRole(Role.ADVISOR)} />
                    อาจารย์ที่ปรึกษา
                 </label>
              </div>

              {regRole === Role.RESEARCHER && (
                <div className="mb-4">
                   <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                   <select 
                     className="w-full p-2.5 border border-slate-300 rounded-lg"
                     value={regType}
                     onChange={(e) => setRegType(e.target.value as UserType)}
                   >
                     <option value={UserType.STUDENT}>นักศึกษา</option>
                     <option value={UserType.STAFF}>อาจารย์/บุคลากร</option>
                   </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
                <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (จำเป็น) <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="tel" 
                        required 
                        value={regPhone} 
                        onChange={e => setRegPhone(e.target.value)} 
                        className="w-full pl-10 pr-4 p-2.5 border border-slate-300 rounded-lg" 
                        placeholder="08X-XXXXXXX"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">สังกัด (วิทยาเขต/รร.)</label>
                    <select value={regCampus} onChange={e => setRegCampus(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                        <optgroup label="วิทยาเขต">
                            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                        <optgroup label="โรงเรียนกีฬา">
                            {SCHOOLS.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">คณะ</label>
                    <select value={regFaculty} onChange={e => setRegFaculty(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                        {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
                    <input type="password" required value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่าน</label>
                    <input type="password" required value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg" />
                 </div>
              </div>

              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md mt-4 flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={20} />}
                ลงทะเบียน
              </button>
              <div className="text-center mt-2">
                 <button type="button" onClick={() => { setView('LOGIN'); setError(''); }} className="text-sm text-blue-600 hover:underline">
                    กลับไปหน้าเข้าสู่ระบบ
                 </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD: STEP 1 (Email) */}
          {view === 'FORGOT_EMAIL' && (
            <form onSubmit={handleForgotEmailSubmit} className="space-y-6">
              <div className="text-center text-slate-600 text-sm mb-4">
                กรุณากรอกอีเมลที่ท่านใช้ลงทะเบียน ระบบจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้ทางอีเมล
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder="user@tnsu.ac.th"
                    required
                  />
                </div>
              </div>

              <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={20} />}
                ส่งลิงก์รีเซ็ตรหัสผ่าน
              </button>
              
              <div className="text-center mt-4">
                 <button type="button" onClick={() => { setView('LOGIN'); setError(''); }} className="text-sm text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto">
                    <ArrowLeft size={16} /> กลับไปหน้าเข้าสู่ระบบ
                 </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
