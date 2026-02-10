
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { CAMPUSES, FACULTIES, SCHOOLS, SurveyResponse } from '../types';
import { Save, Lock, AlertCircle, CheckCircle, UserCircle, RotateCw, AlertTriangle, Phone, Star, BarChart3 } from 'lucide-react';

const UserProfile: React.FC = () => {
  const user = db.currentUser;
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [profileData, setProfileData] = useState({
     name: user?.name || '',
     phoneNumber: user?.phoneNumber || '',
     campus: user?.campus || '',
     faculty: user?.faculty || ''
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
     newPassword: '',
     confirmPassword: ''
  });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Survey State
  const [surveyStatus, setSurveyStatus] = useState<SurveyResponse | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [suggestion, setSuggestion] = useState('');
  const [urgentSuggestion, setUrgentSuggestion] = useState('');

  // Check existing survey status
  useEffect(() => {
     if (user && activeTab === 'survey') {
         const checkSurvey = async () => {
             const existing = await db.getUserSurveyStatus(user.id);
             setSurveyStatus(existing);
             if (existing) {
                 setScores(existing.scores);
                 setSuggestion(existing.suggestion || '');
                 setUrgentSuggestion(existing.urgentSuggestion || '');
             }
         };
         checkSurvey();
     }
  }, [user, activeTab]);

  if (!user) return null;

  const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await db.updateUser(user.id, profileData);
          alert('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
          setIsEditing(false);
      } catch (err) {
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      } finally {
          setLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPassError('');
      setPassSuccess('');

      if (passwordData.newPassword.length < 6) {
          setPassError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
          return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPassError('รหัสผ่านยืนยันไม่ตรงกัน');
          return;
      }

      setLoading(true);
      try {
          await db.changePassword(passwordData.newPassword);
          setPassSuccess('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
          setPasswordData({ newPassword: '', confirmPassword: '' });
      } catch (err: any) {
          if (err.code === 'auth/requires-recent-login') {
             setPassError('เพื่อความปลอดภัย กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน');
          } else {
             setPassError('ไม่สามารถเปลี่ยนรหัสผ่านได้: ' + err.message);
          }
      } finally {
          setLoading(false);
      }
  };

  const handleSurveySubmit = async () => {
      if (Object.keys(scores).length < 8) { // 8 Questions total
          alert('กรุณาตอบคำถามให้ครบทุกข้อ');
          return;
      }

      if(window.confirm('ยืนยันการส่งแบบประเมิน?')) {
          setLoading(true);
          try {
              await db.submitSurvey({
                  userId: user.id,
                  userName: user.name,
                  role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role,
                  scores: scores,
                  suggestion: suggestion,
                  urgentSuggestion: urgentSuggestion
              });
              
              // Refresh status
              const updated = await db.getUserSurveyStatus(user.id);
              setSurveyStatus(updated);
              setIsResubmitting(false);
              alert('ขอบคุณสำหรับการประเมิน\nระบบได้บันทึกข้อมูลเรียบร้อยแล้ว');
          } catch(e) {
              console.error(e);
              alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
          } finally {
              setLoading(false);
          }
      }
  };

  const surveySections = [
    {
      title: "ด้านที่ 1: ด้านระบบสารสนเทศ (System Usability)",
      questions: [
        "1. ระบบมีความสะดวกและง่ายต่อการใช้งาน (User Friendly)",
        "2. การออกแบบหน้าจอมีความสวยงามและจัดหมวดหมู่ชัดเจน",
        "3. ความรวดเร็วและความเสถียรในการประมวลผลของระบบ",
        "4. ระบบมีการแจ้งเตือนสถานะที่ชัดเจนและทันท่วงที"
      ]
    },
    {
      title: "ด้านที่ 2: ด้านกระบวนการและการให้บริการ (Process & Service)",
      questions: [
        "5. ขั้นตอนการยื่นขอจริยธรรมมีความชัดเจนและไม่ซับซ้อน",
        "6. เจ้าหน้าที่/กรรมการ ให้คำแนะนำและข้อเสนอแนะที่เป็นประโยชน์",
        "7. ความรวดเร็วในการตรวจสอบและพิจารณาโครงการวิจัย",
        "8. การอำนวยความสะดวกในการออกใบรับรองและเอกสารต่างๆ"
      ]
    }
  ];

  const handleScoreChange = (qIndex: number, score: number) => {
    setScores(prev => ({...prev, [qIndex]: score}));
  }

  // Helper to calculate summary for view mode
  const getSummary = () => {
      if (!surveyStatus) return null;
      let sumSys = 0, sumProc = 0;
      // Q1-4 System
      for(let i=0; i<4; i++) sumSys += (surveyStatus.scores[i] || 0);
      // Q5-8 Process
      for(let i=4; i<8; i++) sumProc += (surveyStatus.scores[i] || 0);
      
      return {
          sysAvg: (sumSys / 4).toFixed(1),
          procAvg: (sumProc / 4).toFixed(1)
      };
  };

  const summary = getSummary();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex space-x-4 border-b">
         <button onClick={() => setActiveTab('profile')} className={`pb-3 px-4 font-medium ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>ข้อมูลส่วนตัว</button>
         <button onClick={() => setActiveTab('survey')} className={`pb-3 px-4 font-medium ${activeTab === 'survey' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>ประเมินความพึงพอใจ</button>
       </div>

       {activeTab === 'profile' ? (
         <div className="space-y-6">
            {/* Personal Info Card */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><UserCircle size={20}/> ข้อมูลทั่วไป</h3>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">แก้ไขข้อมูล</button>
                    )}
                </div>
                
                <form onSubmit={handleProfileUpdate}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">ชื่อ-นามสกุล</label>
                            <input 
                                type="text" 
                                value={profileData.name} 
                                onChange={e => setProfileData({...profileData, name: e.target.value})}
                                disabled={!isEditing} 
                                className={`w-full p-2.5 rounded border ${isEditing ? 'border-blue-300 bg-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">อีเมล (ไม่สามารถแก้ไขได้)</label>
                            <input type="text" value={user.email} disabled className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded text-slate-500 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">เบอร์โทรศัพท์</label>
                            <div className="relative">
                                <Phone size={16} className={`absolute left-3 top-3 ${isEditing ? 'text-slate-400' : 'text-slate-300'}`} />
                                <input 
                                    type="tel" 
                                    value={profileData.phoneNumber} 
                                    onChange={e => setProfileData({...profileData, phoneNumber: e.target.value})}
                                    disabled={!isEditing}
                                    placeholder="08X-XXXXXXX"
                                    className={`w-full pl-10 p-2.5 rounded border ${isEditing ? 'border-blue-300 bg-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">วิทยาเขต/โรงเรียน</label>
                            <select 
                                value={profileData.campus} 
                                onChange={e => setProfileData({...profileData, campus: e.target.value})}
                                disabled={!isEditing}
                                className={`w-full p-2.5 rounded border ${isEditing ? 'border-blue-300 bg-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                                <optgroup label="วิทยาเขต">
                                    {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="โรงเรียนกีฬา">
                                    {SCHOOLS.map(c => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">คณะ</label>
                            <select 
                                value={profileData.faculty} 
                                onChange={e => setProfileData({...profileData, faculty: e.target.value})}
                                disabled={!isEditing}
                                className={`w-full p-2.5 rounded border ${isEditing ? 'border-blue-300 bg-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                                {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>
                    {isEditing && (
                        <div className="mt-6 flex gap-3 justify-end">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                                <Save size={18} /> บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* Password Change Card */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800"><Lock size={20}/> เปลี่ยนรหัสผ่าน</h3>
                <form onSubmit={handleChangePassword} className="max-w-md">
                    {passError && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded flex items-center gap-2"><AlertCircle size={16}/> {passError}</div>}
                    {passSuccess && <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded flex items-center gap-2"><CheckCircle size={16}/> {passSuccess}</div>}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">รหัสผ่านใหม่</label>
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className="w-full border border-slate-300 p-2.5 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                className="w-full border border-slate-300 p-2.5 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="••••••••"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 shadow-sm disabled:opacity-50">
                            เปลี่ยนรหัสผ่าน
                        </button>
                    </div>
                </form>
            </div>
         </div>
       ) : (
         <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-2">แบบประเมินความพึงพอใจ</h3>
            <p className="text-sm text-slate-500 mb-6">คำชี้แจง: โปรดระบุคะแนนความพึงพอใจ (5=มากที่สุด, 1=น้อยที่สุด)</p>
            
            {/* Status Banner & Result Display */}
            {surveyStatus && !isResubmitting ? (
                <div className="animate-in fade-in zoom-in-95">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full text-green-600 mb-3">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-green-800 mb-1">ท่านได้ทำการประเมินเรียบร้อยแล้ว</h3>
                        <p className="text-green-600 text-sm">ขอบคุณสำหรับข้อเสนอแนะเพื่อการปรับปรุงระบบ</p>
                        <p className="text-slate-400 text-xs mt-2">เมื่อวันที่ {new Date(surveyStatus.submittedAt).toLocaleString('th-TH')}</p>
                    </div>

                    {/* Result Summary */}
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-blue-500"/> ด้านระบบสารสนเทศ
                                </h4>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl font-bold text-blue-600">{summary.sysAvg}</span>
                                    <span className="text-sm text-slate-400">/ 5.0</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${(parseFloat(summary.sysAvg)/5)*100}%` }}></div>
                                </div>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-green-500"/> ด้านกระบวนการ
                                </h4>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl font-bold text-green-600">{summary.procAvg}</span>
                                    <span className="text-sm text-slate-400">/ 5.0</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${(parseFloat(summary.procAvg)/5)*100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-center">
                        <button 
                            onClick={() => setIsResubmitting(true)} 
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <RotateCw size={18} /> แก้ไขผลการประเมิน
                        </button>
                    </div>
                </div>
            ) : (
                <>
                {isResubmitting && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
                        <RotateCw size={18} /> กำลังแก้ไขแบบประเมิน (ข้อมูลเดิมของท่านถูกโหลดมาแสดงผลแล้ว)
                    </div>
                )}
                
                <div className="space-y-8">
                {surveySections.map((section, sIdx) => (
                    <div key={sIdx}>
                        <h4 className="font-semibold text-blue-800 bg-blue-50 p-3 rounded-lg mb-4">{section.title}</h4>
                        <div className="space-y-4 pl-2">
                            {section.questions.map((q, qIdx) => {
                            const globalIndex = sIdx * 4 + qIdx;
                            return (
                                <div key={globalIndex} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 last:border-0 gap-4">
                                    <span className="text-slate-700 text-sm flex-1">{q}</span>
                                    <div className="flex gap-2 flex-shrink-0">
                                    {[1,2,3,4,5].map(score => (
                                        <label key={score} className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer transition-all ${scores[globalIndex] === score ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-110' : 'hover:bg-blue-50 border-slate-200 text-slate-500'}`}>
                                            <input 
                                                type="radio" 
                                                name={`q${globalIndex}`} 
                                                className="hidden" 
                                                checked={scores[globalIndex] === score}
                                                onChange={() => handleScoreChange(globalIndex, score)}
                                            />
                                            <span className="text-xs font-bold">{score}</span>
                                        </label>
                                    ))}
                                    </div>
                                </div>
                            )
                            })}
                        </div>
                    </div>
                ))}
                </div>

                <div className="mt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                            <AlertTriangle size={18} /> ข้อเสนอแนะที่ต้องการให้ปรับปรุงเร่งด่วน (Urgent Improvements)
                        </label>
                        <textarea 
                            className="w-full border border-red-200 bg-red-50/30 p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" 
                            placeholder="ระบุปัญหาที่พบ หรือสิ่งที่ต้องการให้แก้ไขโดยเร็ว..." 
                            rows={3}
                            value={urgentSuggestion}
                            onChange={(e) => setUrgentSuggestion(e.target.value)}
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ข้อเสนอแนะเพิ่มเติมทั่วไป (General Suggestions)</label>
                        <textarea 
                            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="ความคิดเห็นของท่าน..." 
                            rows={3}
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                        ></textarea>
                    </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                    {isResubmitting && (
                        <button 
                            className="px-6 py-2.5 rounded-lg border text-slate-600 hover:bg-slate-50"
                            onClick={() => setIsResubmitting(false)}
                        >
                            ยกเลิก
                        </button>
                    )}
                    <button 
                        disabled={loading}
                        className="bg-green-600 text-white px-8 py-2.5 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-50" 
                        onClick={handleSurveySubmit}
                    >
                        {isResubmitting ? 'บันทึกการแก้ไข' : 'ส่งแบบประเมิน'}
                    </button>
                </div>
                </>
            )}
         </div>
       )}
    </div>
  );
};

export default UserProfile;
