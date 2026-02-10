
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { ProposalStatus, ReviewType, Role, UserType, User } from '../types';
import { ArrowLeft, Loader2, Link as LinkIcon, Info, AlertCircle, UserCheck, Wallet, Search, CheckCircle, X } from 'lucide-react';
import FileUploader from '../components/FileUploader';

interface SubmissionFormProps {
  onNavigate: (page: string) => void;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onNavigate }) => {
  const user = db.currentUser;
  const [loading, setLoading] = useState(false);
  const [advisors, setAdvisors] = useState<User[]>([]);
  const [advisorSearch, setAdvisorSearch] = useState(''); 
  
  const [formData, setFormData] = useState({
    titleTh: '',
    titleEn: '',
    type: ReviewType.EXEMPTION,
    objective: '',
    sampleCount: '',
    duration: '',
    advisorId: '',
    fileLink: '',
    paymentSlipLink: ''
  });

  const isStudent = user?.type === UserType.STUDENT;

  // Fetch Advisors on load
  useEffect(() => {
    const fetchAdvisors = async () => {
        try {
            const data = await db.getUsersByRole(Role.ADVISOR);
            setAdvisors(data);
        } catch (error) {
            console.error("Failed to load advisors", error);
        }
    };
    fetchAdvisors();
  }, []);

  if (!user || !user.roles.includes(Role.RESEARCHER)) return <div className="text-red-500 p-8">Access Denied: สำหรับนักวิจัยเท่านั้น</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation Logic
    if (isStudent && !formData.advisorId) {
      alert('กรุณาเลือกอาจารย์ที่ปรึกษา (จำเป็นสำหรับนักศึกษา)');
      return;
    }

    if (!isStudent && !formData.paymentSlipLink) {
      alert('กรุณาแนบหลักฐานการชำระเงินค่าธรรมเนียม (1,500 บาท)');
      return;
    }

    if (!formData.fileLink.includes('http')) {
       alert('กรุณาใส่ลิงก์ Google Drive ให้ถูกต้อง');
       return;
    }

    setLoading(true);
    try {
        const advisor = advisors.find(a => a.id === formData.advisorId);
        
        // Pass ALL fields to database
        await db.createProposal({
          titleTh: formData.titleTh,
          titleEn: formData.titleEn,
          type: formData.type,
          objective: formData.objective,
          sampleCount: formData.sampleCount,
          duration: formData.duration,
          fileLink: formData.fileLink,
          // If student, payment slip is optional/skipped
          paymentSlipLink: isStudent ? undefined : formData.paymentSlipLink, 
          researcherId: user.id,
          researcherName: user.name,
          faculty: user.faculty,
          campus: user.campus,
          advisorId: isStudent ? formData.advisorId : undefined,
          advisorName: isStudent ? advisor?.name : undefined,
        });

        const successMsg = isStudent 
            ? 'ยื่นคำขอสำเร็จ! กรุณาแจ้งอาจารย์ที่ปรึกษาเพื่อทำการอนุมัติในระบบ'
            : 'ยื่นคำขอสำเร็จ! เจ้าหน้าที่จะทำการตรวจสอบเอกสารเป็นลำดับถัดไป';
            
        alert(successMsg);
        onNavigate('dashboard');
    } catch (err: any) {
        console.error(err);
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  // Logic to filter advisors based on search input
  const filteredAdvisors = advisors.filter(a => 
    a.name.toLowerCase().includes(advisorSearch.toLowerCase()) || 
    a.email.toLowerCase().includes(advisorSearch.toLowerCase()) ||
    (a.faculty && a.faculty.toLowerCase().includes(advisorSearch.toLowerCase()))
  );
  
  const selectedAdvisor = advisors.find(a => a.id === formData.advisorId);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-2" />
        กลับไปหน้าแดชบอร์ด
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">แบบฟอร์มขอรับการพิจารณาจริยธรรมการวิจัย</h2>
          <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded border ${isStudent ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                  สถานะ: {isStudent ? 'นักศึกษา (Student)' : 'บุคลากร/ภายนอก (Staff/External)'}
              </span>
              {isStudent && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Wallet size={12}/> ยกเว้นค่าธรรมเนียม</span>}
          </div>
        </div>

        {/* Warning Banner regarding Google Drive */}
        <div className="bg-orange-50 px-8 py-4 border-b border-orange-100 flex items-start gap-3">
            <AlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="text-sm text-orange-800">
                <span className="font-bold">คำแนะนำสำคัญ:</span> ผู้วิจัยต้องรับผิดชอบในการจัดการไฟล์บน Cloud Storage (แนะนำ Google Drive) ด้วยตนเอง 
                และต้องตรวจสอบว่าได้เปิดสิทธิ์การเข้าถึง (Share) เป็น <span className="font-bold underline">"Anyone with the link (ทุกคนที่มีลิงก์)"</span>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Section 1: General Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
              ข้อมูลโครงการ
            </h3>
            <div className="grid grid-cols-1 gap-6 pl-2 md:pl-10">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโครงการ (ภาษาไทย) <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.titleTh} onChange={e => setFormData({...formData, titleTh: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Title (English) <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.titleEn} onChange={e => setFormData({...formData, titleEn: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทการพิจารณา</label>
                <select className="w-full border-slate-300 rounded-lg p-2.5 border outline-none"
                   value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ReviewType})}>
                   <option value={ReviewType.EXEMPTION}>{ReviewType.EXEMPTION}</option>
                   <option value={ReviewType.EXPEDITED}>{ReviewType.EXPEDITED}</option>
                   <option value={ReviewType.FULL_BOARD}>{ReviewType.FULL_BOARD}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนกลุ่มตัวอย่าง (คน) <span className="text-red-500">*</span></label>
                    <input required type="number" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                       value={formData.sampleCount} onChange={e => setFormData({...formData, sampleCount: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ระยะเวลาดำเนินการ (เดือน) <span className="text-red-500">*</span></label>
                    <input required type="text" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                       value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                 </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Advisor Selection (Student Only) */}
          {isStudent && (
            <>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                  เลือกอาจารย์ที่ปรึกษา
                </h3>
                <div className="pl-2 md:pl-10">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-4 flex gap-3">
                         <UserCheck className="text-yellow-600 flex-shrink-0" size={20} />
                         <div className="text-sm text-yellow-800">
                            <strong>สำหรับนักศึกษา:</strong> ท่านต้องเลือกอาจารย์ที่ปรึกษาเพื่อทำการอนุมัติโครงการเบื้องต้น
                         </div>
                    </div>
                    
                    <label className="block text-sm font-medium text-slate-700 mb-1">ค้นหาและเลือกอาจารย์ที่ปรึกษา <span className="text-red-500">*</span></label>
                    
                    {selectedAdvisor && (
                       <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                          <div>
                             <div className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                <CheckCircle size={16} className="text-blue-600"/> ท่านเลือก: {selectedAdvisor.name}
                             </div>
                             <div className="text-xs text-blue-700 pl-6">
                                {selectedAdvisor.faculty || 'ไม่ระบุคณะ'} | {selectedAdvisor.email}
                             </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, advisorId: ''})}
                            className="text-slate-400 hover:text-red-500 p-2"
                          >
                             <X size={18} />
                          </button>
                       </div>
                    )}

                    {!selectedAdvisor && (
                        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                           <div className="relative border-b border-slate-100">
                              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input 
                                 type="text" 
                                 className="w-full pl-10 pr-4 py-3 text-sm outline-none focus:bg-slate-50 transition-colors"
                                 placeholder="พิมพ์ชื่อ, คณะ หรืออีเมล เพื่อค้นหา..."
                                 value={advisorSearch}
                                 onChange={(e) => setAdvisorSearch(e.target.value)}
                              />
                           </div>
                           
                           <div className="max-h-60 overflow-y-auto bg-slate-50/30">
                              {filteredAdvisors.length > 0 ? (
                                 filteredAdvisors.map(a => (
                                    <div 
                                       key={a.id} 
                                       onClick={() => setFormData({...formData, advisorId: a.id})}
                                       className="p-3 border-b border-slate-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center group"
                                    >
                                       <div>
                                          <div className="font-medium text-slate-800 text-sm group-hover:text-blue-700">{a.name}</div>
                                          <div className="text-xs text-slate-500">{a.faculty || 'ไม่ระบุคณะ'} • {a.email}</div>
                                       </div>
                                       <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">เลือก</span>
                                    </div>
                                 ))
                              ) : (
                                 <div className="p-8 text-center text-slate-400 text-sm">
                                    ไม่พบรายชื่อที่ตรงกับ "{advisorSearch}"
                                 </div>
                              )}
                           </div>
                           <div className="bg-slate-100 p-2 text-center text-xs text-slate-500 border-t border-slate-200">
                              แสดงรายชื่อ {filteredAdvisors.length} ท่าน (จากทั้งหมด {advisors.length})
                           </div>
                        </div>
                    )}
                </div>
              </div>
              <hr className="border-slate-100" />
            </>
          )}

          {/* Section 3: Documents */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">{isStudent ? 3 : 2}</span>
              เอกสารแนบ (Google Drive Link)
            </h3>
            <div className="pl-2 md:pl-10">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">เอกสารที่ต้องมีในโฟลเดอร์:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>แบบคำขอ (AF 06-01) และ บันทึกข้อความ</li>
                    <li>โครงร่างการวิจัย (บทที่ 1-3)</li>
                    <li>เครื่องมือการวิจัย</li>
                    <li>เอกสารชี้แจง (AF 06-02) และใบยินยอม (AF 06-03)</li>
                    <li>ใบรับรองการผ่านอบรมจริยธรรม (HSP/GCP)</li>
                </ul>
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์โฟลเดอร์ Google Drive รวมเอกสาร <span className="text-red-500">*</span></label>
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input required type="url" placeholder="https://drive.google.com/drive/folders/..." 
                        className="w-full py-2.5 pl-10 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.fileLink} onChange={e => setFormData({...formData, fileLink: e.target.value})} />
                </div>
                <p className="text-xs text-slate-500 mt-1">* ตรวจสอบสิทธิ์การเข้าถึงเป็น "Anyone with the link" เพื่อป้องกันการถูกตีกลับ</p>
                </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Payment Slip */}
          <div>
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">{isStudent ? 4 : 3}</span>
                {isStudent ? 'เอกสารเพิ่มเติม (ถ้ามี)' : 'หลักฐานการชำระเงิน / เอกสารเพิ่มเติม'}
             </h3>
             
             <div className="pl-2 md:pl-10">
                {!isStudent ? (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2 mb-2 text-slate-800 font-medium">
                             <Wallet size={18} className="text-slate-500"/> ค่าธรรมเนียมการพิจารณา: 1,500 บาท
                        </div>
                        <FileUploader 
                            folder="payment_slips" 
                            label="อัปโหลดไฟล์หลักฐาน (รูปภาพ/PDF) *"
                            onUploadComplete={(url) => setFormData(prev => ({ ...prev, paymentSlipLink: url }))}
                            accept=".jpg,.jpeg,.png,.pdf"
                            currentUrl={formData.paymentSlipLink}
                            required
                        />
                        <div className="text-center text-xs text-slate-400 my-2">- หรือ -</div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ระบุเป็นลิงก์ (กรณีไฟล์อยู่ภายนอก)</label>
                            <input 
                                type="url" 
                                placeholder="https://..." 
                                className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={formData.paymentSlipLink} 
                                onChange={e => setFormData({...formData, paymentSlipLink: e.target.value})} 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4">
                         <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                            <CheckCircleIcon /> นักศึกษาได้รับสิทธิ์ยกเว้นค่าธรรมเนียม
                         </div>
                         <p className="text-sm text-green-700">ท่านไม่จำเป็นต้องแนบหลักฐานการชำระเงิน หากมีเอกสารอื่นๆ เพิ่มเติมที่ไม่ได้อยู่ใน Google Drive หลัก สามารถแนบได้ที่นี่</p>
                         <div className="mt-4">
                             <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์เอกสารเพิ่มเติม (ถ้ามี)</label>
                             <input 
                                type="url" 
                                placeholder="https://..." 
                                className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={formData.paymentSlipLink} 
                                onChange={e => setFormData({...formData, paymentSlipLink: e.target.value})} 
                            />
                         </div>
                    </div>
                )}
             </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100">
             <button disabled={loading} type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-lg font-medium transition-transform active:scale-95 flex items-center gap-2">
               {loading && <Loader2 className="animate-spin" size={18} />}
               ยืนยันส่งคำขอ
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default SubmissionForm;
