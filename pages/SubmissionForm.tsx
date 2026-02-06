
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { ProposalStatus, ReviewType, Role, UserType, User } from '../types';
import { ArrowLeft, Loader2, Link as LinkIcon, Info, AlertCircle } from 'lucide-react';

interface SubmissionFormProps {
  onNavigate: (page: string) => void;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onNavigate }) => {
  const user = db.currentUser;
  const [loading, setLoading] = useState(false);
  const [advisors, setAdvisors] = useState<User[]>([]);
  
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

  // Fetch Advisors on load
  useEffect(() => {
    const fetchAdvisors = async () => {
        const data = await db.getUsersByRole(Role.ADVISOR);
        setAdvisors(data);
    };
    fetchAdvisors();
  }, []);

  if (!user || user.role !== Role.RESEARCHER) return <div className="text-red-500">Access Denied</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (user.type === UserType.STUDENT && !formData.advisorId) {
      alert('กรุณาเลือกอาจารย์ที่ปรึกษา');
      return;
    }
    if (user.type === UserType.STAFF && !formData.paymentSlipLink) {
      alert('กรุณาระบุลิงก์หลักฐานการชำระเงิน (1,500 บาท)');
      return;
    }
    if (!formData.fileLink.includes('http')) {
       alert('กรุณาใส่ลิงก์ Google Drive ให้ถูกต้อง');
       return;
    }

    setLoading(true);
    try {
        const advisor = advisors.find(a => a.id === formData.advisorId);
        
        await db.createProposal({
          titleTh: formData.titleTh,
          titleEn: formData.titleEn,
          type: formData.type,
          fileLink: formData.fileLink,
          paymentSlipLink: formData.paymentSlipLink,
          researcherId: user.id,
          researcherName: user.name,
          faculty: user.faculty,
          campus: user.campus,
          advisorId: formData.advisorId,
          advisorName: advisor?.name,
        });

        alert('ยื่นคำขอสำเร็จ สถานะของคุณจะถูกอัพเดทในหน้าแดชบอร์ด');
        onNavigate('dashboard');
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-2" />
        กลับไปหน้าแดชบอร์ด
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">แบบฟอร์มขอรับการพิจารณาจริยธรรมการวิจัย</h2>
          <p className="text-sm text-slate-500 mt-1">กรุณากรอกข้อมูลให้ครบถ้วนและแนบลิงก์เอกสารจาก Google Drive</p>
        </div>

        {/* Warning Banner regarding Google Drive */}
        <div className="bg-orange-50 px-8 py-4 border-b border-orange-100 flex items-start gap-3">
            <AlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="text-sm text-orange-800">
                <span className="font-bold">คำแนะนำสำคัญ:</span> ผู้วิจัยต้องรับผิดชอบในการจัดการไฟล์บน Cloud Storage (แนะนำ Google Drive) ด้วยตนเอง 
                และต้องตรวจสอบว่าได้เปิดสิทธิ์การเข้าถึง (Share) เป็น <span className="font-bold underline">"Anyone with the link (ทุกคนที่มีลิงก์)"</span> เพื่อให้คณะกรรมการสามารถเปิดตรวจสอบได้
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Section 1: General Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
              ข้อมูลโครงการ
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโครงการ (ภาษาไทย)</label>
                <input required type="text" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.titleTh} onChange={e => setFormData({...formData, titleTh: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Title (English)</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนกลุ่มตัวอย่าง (คน)</label>
                    <input required type="number" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                       value={formData.sampleCount} onChange={e => setFormData({...formData, sampleCount: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ระยะเวลาดำเนินการ (เดือน)</label>
                    <input required type="text" className="w-full border-slate-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                       value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                 </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Roles specific */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span>
              ข้อมูลเพิ่มเติม
            </h3>
            <div className="space-y-6">
              {user.type === UserType.STUDENT && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">อาจารย์ที่ปรึกษา</label>
                  <select className="w-full border-slate-300 rounded-lg p-2.5 border outline-none"
                     value={formData.advisorId} onChange={e => setFormData({...formData, advisorId: e.target.value})}>
                     <option value="">-- เลือกอาจารย์ที่ปรึกษา --</option>
                     {advisors.map(a => (
                       <option key={a.id} value={a.id}>{a.name} ({a.faculty})</option>
                     ))}
                  </select>
                  <p className="text-xs text-orange-500 mt-1">* ต้องได้รับการอนุมัติจากที่ปรึกษาก่อนส่ง Admin</p>
                </div>
              )}

              {user.type === UserType.STAFF && (
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์หลักฐานการชำระเงิน (1,500 บาท)</label>
                   <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input required type="url" placeholder="https://drive.google.com/..." 
                        className="w-full py-2.5 pl-10 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.paymentSlipLink} onChange={e => setFormData({...formData, paymentSlipLink: e.target.value})} />
                   </div>
                   <p className="text-xs text-slate-500 mt-1">อัปโหลดสลิปขึ้น Google Drive แล้วนำลิงก์มาวาง</p>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Documents */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">3</span>
              เอกสารแนบ (Google Drive Link)
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 text-sm text-blue-800">
               <p className="font-semibold mb-2">เอกสารที่ต้องมีในโฟลเดอร์:</p>
               <ul className="list-disc pl-5 space-y-1">
                 <li>แบบคำขอ (AF 06-01) และ บันทึกข้อความ</li>
                 <li>โครงร่างการวิจัย (บทที่ 1-3)</li>
                 <li>เครื่องมือการวิจัย</li>
                 <li>เอกสารชี้แจง (AF 06-02) และใบยินยอม (AF 06-03)</li>
                 <li>ใบรับรองการผ่านอบรมจริยธรรม (HSP/GCP)</li>
               </ul>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์โฟลเดอร์ Google Drive รวมเอกสาร</label>
               <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input required type="url" placeholder="https://drive.google.com/drive/folders/..." 
                    className="w-full py-2.5 pl-10 pr-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.fileLink} onChange={e => setFormData({...formData, fileLink: e.target.value})} />
               </div>
               <p className="text-xs text-red-500 mt-1 font-medium">* ตรวจสอบสิทธิ์การเข้าถึงเป็น "Anyone with the link" ก่อนส่ง เพื่อป้องกันการถูกตีกลับ</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
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

export default SubmissionForm;
