import React, { useState } from 'react';
import { db } from '../services/mockDatabase';
import { ArrowLeft, BookOpen, UserPlus, FileText, CheckCircle, Shield, AlertCircle, HelpCircle } from 'lucide-react';

interface UserManualProps {
  onNavigate: (page: string) => void;
}

const UserManual: React.FC<UserManualProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('intro');
  const user = db.currentUser;

  const tabs = [
    { id: 'intro', label: 'เริ่มต้นใช้งาน / ลงทะเบียน', icon: UserPlus },
    { id: 'researcher', label: 'สำหรับนักวิจัย', icon: FileText },
    { id: 'approver', label: 'สำหรับที่ปรึกษา/กรรมการ', icon: CheckCircle },
    { id: 'admin', label: 'สำหรับ Admin', icon: Shield },
    { id: 'status', label: 'ความหมายสถานะ', icon: AlertCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <BookOpen className="text-blue-600" /> คู่มือการใช้งานระบบ TNSU-REC
           </h2>
           <p className="text-slate-500">คำแนะนำการใช้งานสำหรับทุกบทบาทในระบบจริยธรรมการวิจัยในมนุษย์</p>
        </div>
        {!user && (
          <button onClick={() => onNavigate('auth')} className="flex items-center text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
            <ArrowLeft size={18} className="mr-2" /> กลับหน้าเข้าสู่ระบบ
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
          
          {/* TAB: INTRO & REGISTRATION */}
          {activeTab === 'intro' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-3">การเริ่มต้นใช้งานและการลงทะเบียน</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">1</div>
                   <div>
                     <h4 className="font-semibold text-slate-800">การเข้าใช้งานครั้งแรก</h4>
                     <p className="text-slate-600 text-sm mt-1">ผู้ใช้งานทุกคนต้องทำการลงทะเบียนบัญชีใหม่ โดยกดที่ปุ่ม <span className="text-blue-600 font-medium">"ยังไม่มีบัญชี? ลงทะเบียนที่นี่"</span> ในหน้า Login</p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">2</div>
                   <div>
                     <h4 className="font-semibold text-slate-800">การเลือกบทบาท (Role)</h4>
                     <ul className="list-disc pl-5 text-sm text-slate-600 mt-2 space-y-1">
                       <li><span className="font-semibold text-slate-900">ผู้วิจัย (Researcher):</span> สำหรับนักศึกษา อาจารย์ หรือบุคลากรที่ต้องการยื่นขอจริยธรรม</li>
                       <li><span className="font-semibold text-slate-900">อาจารย์ที่ปรึกษา (Advisor):</span> สำหรับอาจารย์ที่ต้องอนุมัติโครงการของนักศึกษาในที่ปรึกษา</li>
                     </ul>
                     <div className="bg-yellow-50 p-3 rounded mt-2 text-xs text-yellow-800 border border-yellow-200">
                        * สำหรับบทบาท <strong>Reviewer (กรรมการ)</strong> จะต้องถูกเพิ่มโดย Admin เท่านั้น ไม่สามารถสมัครเองได้
                     </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">3</div>
                   <div>
                     <h4 className="font-semibold text-slate-800">ข้อมูลที่ต้องใช้</h4>
                     <p className="text-slate-600 text-sm mt-1">กรอกข้อมูล ชื่อ-นามสกุล, อีเมล (แนะนำอีเมลสถาบัน), รหัสผ่าน และเลือกสังกัด (วิทยาเขต/คณะ) ให้ถูกต้อง</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RESEARCHER */}
          {activeTab === 'researcher' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-3">คู่มือสำหรับนักวิจัย (Researcher)</h3>

              <div className="space-y-6">
                <section>
                  <h4 className="font-bold text-blue-700 mb-2">1. การยื่นคำขอใหม่</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    เมื่อเข้าสู่ระบบ ให้กดที่เมนู <strong>"ยื่นคำขอใหม่"</strong> หรือปุ่ม <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">+ ยื่นคำขอใหม่</span> ในหน้าแดชบอร์ด
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                    <strong>สิ่งที่ต้องเตรียม:</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                      <li>รายละเอียดโครงการ (ชื่อไทย/อังกฤษ, จำนวนกลุ่มตัวอย่าง, ระยะเวลา)</li>
                      <li><strong>ลิงก์ Google Drive:</strong> ที่แชร์สิทธิ์เป็น "Anyone with the link can view" ภายในประกอบด้วยไฟล์ PDF ที่จำเป็น (แบบคำขอ, โครงร่าง, เครื่องมือ, เอกสารชี้แจง ฯลฯ)</li>
                      <li><strong>หลักฐานการโอนเงิน:</strong> (สำหรับบุคคลภายนอก/อาจารย์) ค่าธรรมเนียม 1,500 บาท</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h4 className="font-bold text-blue-700 mb-2">2. การติดตามสถานะ</h4>
                  <p className="text-sm text-slate-600">
                    ท่านสามารถดูสถานะโครงการได้ที่หน้า <strong>"แดชบอร์ด"</strong> โดยสถานะจะเปลี่ยนไปตามขั้นตอน (ดูความหมายสถานะที่แท็บสุดท้าย)
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-blue-700 mb-2">3. การแก้ไขโครงการ (Revision)</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    หากสถานะเป็น <span className="text-orange-600 font-bold">แก้ไขตามข้อเสนอแนะ</span> ให้คลิกที่รูปดวงตา <EyeIcon /> เพื่อดูรายละเอียด
                  </p>
                  <ul className="list-decimal pl-5 text-sm text-slate-600 space-y-1">
                    <li>อ่านข้อเสนอแนะจากกรรมการ (Consolidated Feedback)</li>
                    <li>แก้ไขไฟล์ในเครื่องคอมพิวเตอร์ และอัพโหลดไฟล์ชุดใหม่ขึ้น Google Drive (หรือสร้าง Folder ใหม่)</li>
                    <li>นำลิงก์ไฟล์ใหม่มาใส่ในช่อง <strong>"ส่งแก้ไขโครงการ"</strong> ด้านล่างของหน้ารายละเอียด แล้วกดส่ง</li>
                  </ul>
                </section>
                
                <section>
                   <h4 className="font-bold text-blue-700 mb-2">4. การรับใบรับรอง</h4>
                   <p className="text-sm text-slate-600">
                      เมื่อสถานะเป็น <span className="text-green-600 font-bold">อนุมัติ/ได้รับใบรับรอง</span> จะปรากฏปุ่มสีเขียวให้ดาวน์โหลดใบรับรองอิเล็กทรอนิกส์ (E-Certificate) ได้ทันที
                   </p>
                </section>
              </div>
            </div>
          )}

          {/* TAB: APPROVER */}
          {activeTab === 'approver' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-3">สำหรับที่ปรึกษา และ กรรมการ</h3>

              <div className="space-y-8">
                {/* Advisor */}
                <div>
                   <h4 className="text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-6 bg-orange-500 rounded-full"></div> 
                      บทบาทอาจารย์ที่ปรึกษา (Advisor)
                   </h4>
                   <p className="text-sm text-slate-600 mb-3">
                      ทำหน้าที่คัดกรองโครงการของนักศึกษาในที่ปรึกษา <strong>ก่อน</strong> ส่งเข้าสู่ระบบส่วนกลาง
                   </p>
                   <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-2">
                      <li>ล็อกอินเข้าสู่ระบบ จะเห็นโครงการที่ระบุชื่อท่านเป็นที่ปรึกษา</li>
                      <li>สถานะจะเป็น <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">รอที่ปรึกษาอนุมัติ</span></li>
                      <li>กดเข้าไปดูรายละเอียด ตรวจสอบความเรียบร้อยของเอกสาร</li>
                      <li>กดปุ่ม <strong>"อนุมัติให้นักศึกษา"</strong> เพื่อส่งเรื่องต่อให้ Admin ตรวจสอบ</li>
                   </ol>
                </div>

                <hr className="border-slate-100" />

                {/* Reviewer */}
                <div>
                   <h4 className="text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-6 bg-blue-500 rounded-full"></div> 
                      บทบาทกรรมการพิจารณา (Reviewer)
                   </h4>
                   <p className="text-sm text-slate-600 mb-3">
                      ทำหน้าที่ประเมินจริยธรรมการวิจัยตามที่ได้รับมอบหมายจาก Admin
                   </p>
                   <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-2">
                      <li>เมื่อได้รับมอบหมาย โครงการจะปรากฏใน Dashboard สถานะ <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">อยู่ระหว่างพิจารณา</span></li>
                      <li>กดปุ่ม <span className="font-mono bg-slate-100 px-1">Edit</span> เพื่อเข้าสู่หน้าประเมิน</li>
                      <li>อ่านรายละเอียดและเปิดลิงก์เอกสารแนบ</li>
                      <li>เลือกผลการพิจารณา:
                         <ul className="list-disc pl-5 mt-1 mb-1 text-slate-500">
                            <li><strong>สมควรอนุมัติ:</strong> ไม่มีการแก้ไข</li>
                            <li><strong>ให้แก้ไข:</strong> มีข้อบกพร่องต้องปรับปรุง (ต้องระบุคอมเมนต์)</li>
                            <li><strong>ไม่อนุมัติ:</strong> ผิดหลักจริยธรรมร้ายแรง</li>
                         </ul>
                      </li>
                      <li>พิมพ์ข้อเสนอแนะ (Comment) ให้ชัดเจน แล้วกดยืนยัน</li>
                   </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADMIN */}
          {activeTab === 'admin' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-3">สำหรับผู้ดูแลระบบ (Admin)</h3>
              <p className="text-sm text-slate-600">Admin มีหน้าที่บริหารจัดการ Workflow ทั้งหมดของระบบ</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="border p-4 rounded-lg bg-slate-50">
                    <h5 className="font-bold text-slate-800 mb-2">1. ตรวจสอบเบื้องต้น (Screening)</h5>
                    <p className="text-xs text-slate-600">เมื่อโครงการเข้ามาในสถานะ "รอเจ้าหน้าที่ตรวจสอบ" ให้เช็คเอกสาร หากไม่ครบให้ส่งคืนแก้ไข หากครบให้เลือกประเภทการพิจารณา (Exempt/Expedited/Full Board)</p>
                 </div>
                 <div className="border p-4 rounded-lg bg-slate-50">
                    <h5 className="font-bold text-slate-800 mb-2">2. มอบหมายกรรมการ (Assign)</h5>
                    <p className="text-xs text-slate-600">เลือก Reviewer จากรายชื่อในระบบ ระบบจะเปลี่ยนสถานะเป็น "อยู่ระหว่างพิจารณา"</p>
                 </div>
                 <div className="border p-4 rounded-lg bg-slate-50">
                    <h5 className="font-bold text-slate-800 mb-2">3. สรุปผล (Decision)</h5>
                    <p className="text-xs text-slate-600">เมื่อกรรมการลงคะแนนครบ ให้รวบรวมข้อคิดเห็น และกด "สรุปผลการพิจารณา" เพื่อแจ้งผู้วิจัย (ให้แก้ไข หรือ อนุมัติ)</p>
                 </div>
                 <div className="border p-4 rounded-lg bg-slate-50">
                    <h5 className="font-bold text-slate-800 mb-2">4. จัดการผู้ใช้งาน</h5>
                    <p className="text-xs text-slate-600">เพิ่ม/ลบ สมาชิก และตั้งค่า Role กรรมการ ได้ที่เมนู "จัดการผู้ใช้งาน"</p>
                 </div>
              </div>
            </div>
          )}

          {/* TAB: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-3">ความหมายของสถานะต่างๆ</h3>
              
              <div className="overflow-hidden border rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">สถานะ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ความหมาย / สิ่งที่ต้องทำ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">รอที่ปรึกษาอนุมัติ</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">รออาจารย์ที่ปรึกษากดอนุมัติ (สำหรับ นศ.)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">รอเจ้าหน้าที่ตรวจสอบ</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">Admin กำลังตรวจสอบความครบถ้วนของเอกสาร</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">อยู่ระหว่างพิจารณา</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">ส่งต่อให้กรรมการ (Reviewer) ทำการประเมิน</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">รอสรุปผล</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">กรรมการพิจารณาครบแล้ว รอ Admin สรุปมติ</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">แก้ไขตามข้อเสนอแนะ</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">ต้องแก้ไขเอกสารตามคอมเมนต์ และส่งกลับเข้าระบบใหม่</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">อนุมัติ/ได้รับใบรับรอง</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">ผ่านการรับรองแล้ว สามารถดาวน์โหลดใบรับรองได้</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">ไม่อนุมัติ</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">โครงการไม่ผ่านการพิจารณา</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Helper for icon used in text
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mx-1 text-slate-500"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default UserManual;