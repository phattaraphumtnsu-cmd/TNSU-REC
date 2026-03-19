import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/database';
import { ArrowLeft, BookOpen, UserPlus, FileText, CheckCircle, Shield, AlertCircle, HelpCircle, HardDrive, GitBranch, Download, FileCheck, RefreshCw, Settings, Save, X } from 'lucide-react';
import { Role } from '../types';

interface UserManualProps {
  onNavigate: (page: string) => void;
}

const UserManual: React.FC<UserManualProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('workflow');
  const [generating, setGenerating] = useState(false);
  const [manualUrl, setManualUrl] = useState<string>('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const user = db.currentUser;
  const isAdmin = user?.roles?.includes(Role.ADMIN) || false;

  const tabs = [
    { id: 'workflow', label: 'ภาพรวมกระบวนการ (Workflow)', icon: GitBranch },
    { id: 'prep', label: 'การเตรียมเอกสาร (Google Drive)', icon: HardDrive },
    { id: 'researcher', label: 'คู่มือนักวิจัย (Researcher)', icon: FileText },
    { id: 'approver', label: 'คู่มือที่ปรึกษา/กรรมการ', icon: CheckCircle },
    { id: 'admin', label: 'คู่มือผู้ดูแลระบบ (Admin)', icon: Shield },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await db.getSystemSettings();
    if (settings && settings.manualUrl) {
      setManualUrl(settings.manualUrl);
      setTempUrl(settings.manualUrl);
    }
  };

  const handleSaveUrl = async () => {
    try {
      setGenerating(true);
      await db.updateSystemSettings({ manualUrl: tempUrl });
      setManualUrl(tempUrl);
      setIsEditingUrl(false);
      alert('บันทึกลิงก์คู่มือสำเร็จ');
    } catch (error) {
      console.error('Error saving manual URL', error);
      alert('เกิดข้อผิดพลาดในการบันทึกลิงก์');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
      if (manualUrl) {
          window.open(manualUrl, '_blank');
      } else {
          alert("ยังไม่มีการอัปโหลดไฟล์คู่มือ (PDF) ในระบบ กรุณาติดต่อผู้ดูแลระบบ");
      }
  };

  const renderWorkflow = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">วิเคราะห์กระบวนการทำงาน (System Workflow Analysis)</h3>
          <p className="text-slate-500 text-sm mt-1">แผนภาพแสดงลำดับขั้นตอนการพิจารณาจริยธรรมการวิจัย ตั้งแต่เริ่มต้นจนสิ้นสุดอย่างละเอียด</p>
      </div>

      <div className="space-y-4">
          <WorkflowStep 
              step="1" 
              title="ยื่นคำขอ (Submission)" 
              desc="นักวิจัยเข้าสู่ระบบ กรอกข้อมูลโครงการวิจัยให้ครบถ้วน และแนบลิงก์ Google Drive ที่บรรจุไฟล์เอกสารทั้งหมด (ต้องเปิดสิทธิ์ Anyone with the link)" 
              role="Researcher"
              color="blue"
          />
          
          <div className="pl-8 border-l-2 border-dashed border-slate-300 ml-6 py-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <span className="bg-slate-200 px-2 py-1 rounded">กรณีเป็นนักศึกษา</span>
              </div>
              <WorkflowStep 
                  step="1.5" 
                  title="ที่ปรึกษาพิจารณา (Advisor Review)" 
                  desc="ระบบจะส่งเรื่องไปยังอาจารย์ที่ปรึกษาที่นักศึกษาเลือก เพื่อตรวจสอบความถูกต้องเบื้องต้น หากไม่ผ่านจะถูกส่งกลับไปให้นักศึกษาแก้ไข หากผ่านจะเข้าสู่ขั้นตอนของ Admin" 
                  role="Advisor"
                  color="orange"
              />
          </div>

          <WorkflowStep 
              step="2" 
              title="เจ้าหน้าที่ตรวจสอบ (Admin Check)" 
              desc="Admin ตรวจสอบความครบถ้วนของเอกสาร (Screening) หากเอกสารไม่ครบถ้วนจะส่งคืน (Return) หากครบถ้วนจะทำการคัดเลือกและมอบหมายกรรมการผู้ทรงคุณวุฒิ (Assign Reviewers)" 
              role="Admin"
              color="purple"
          />

          <WorkflowStep 
              step="3" 
              title="การพิจารณา (In Review)" 
              desc="กรรมการผู้ทรงคุณวุฒิที่ได้รับมอบหมาย เข้ามาประเมินโครงการและลงมติ (Approve / Revision Required / Reject) พร้อมให้ข้อเสนอแนะ" 
              role="Reviewer"
              color="indigo"
          />

          <WorkflowStep 
              step="4" 
              title="สรุปผล (Final Decision)" 
              desc="Admin รวบรวมมติจากกรรมการทั้งหมด สรุปผลการพิจารณา และแจ้งผลไปยังนักวิจัย" 
              role="Admin"
              color="blue"
          />

          <div className="pl-8 border-l-2 border-dashed border-slate-300 ml-6 py-4">
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-3">
                  <RefreshCw className="text-red-500 mt-1" size={18}/>
                  <div>
                      <span className="font-bold text-red-800 text-sm">กรณี "ให้แก้ไข" (Revision Required)</span>
                      <p className="text-xs text-red-700 mt-1">
                          นักวิจัยต้องแก้ไขเอกสารตามข้อเสนอแนะ อัปโหลดไฟล์ที่แก้ไขแล้วลงใน Google Drive เดิม หรือสร้างโฟลเดอร์ใหม่ และนำลิงก์มาส่งในระบบ (Submit Revision) &rarr; กระบวนการจะกลับไปที่ขั้นตอน Admin Check อีกครั้ง
                      </p>
                  </div>
              </div>
          </div>

          <WorkflowStep 
              step="5" 
              title="ออกใบรับรอง (Certification)" 
              desc="เมื่อโครงการผ่านการอนุมัติ (Approved) Admin จะดำเนินการออกเลขที่ใบรับรอง กำหนดวันหมดอายุ และอัปโหลดไฟล์ใบรับรองที่ลงนามแล้วเข้าระบบ เพื่อให้นักวิจัยดาวน์โหลด" 
              role="System/Admin"
              color="green"
          />
      </div>
    </div>
  );

  const renderPrep = () => (
     <div className="space-y-6 animate-in fade-in duration-300">
        <div className="border-b pb-4">
            <h3 className="text-xl font-bold text-slate-800">การเตรียมเอกสารด้วย Google Drive (สำคัญมาก)</h3>
            <p className="text-slate-500 text-sm mt-1">ระบบ TNSU-REC ใช้ระบบ Cloud Storage (Google Drive) ในการจัดเก็บไฟล์ เพื่อรองรับไฟล์ขนาดใหญ่และลดข้อจำกัดของระบบ</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                <AlertCircle size={20}/> ข้อควรระวังเรื่องสิทธิ์การเข้าถึง (Permission)
            </h4>
            <p className="text-sm text-orange-700 leading-relaxed">
                ปัญหาที่พบบ่อยที่สุดคือ <strong>"กรรมการเปิดไฟล์ไม่ได้"</strong> กรุณาตั้งค่าการแชร์โฟลเดอร์หรือไฟล์ให้เป็น 
                <span className="font-bold bg-white px-2 py-0.5 rounded mx-1 border border-orange-300">"Anyone with the link (ทุกคนที่มีลิงก์)"</span> 
                และเลือกสิทธิ์เป็น <strong>Viewer (ผู้มีสิทธิ์อ่าน)</strong>
            </p>
        </div>

        <div className="space-y-6 mt-6">
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">1</div>
                <div>
                    <h5 className="font-bold text-slate-800 text-lg">สร้างโฟลเดอร์โครงการ</h5>
                    <p className="text-sm text-slate-600 mt-1">สร้าง Folder ใน Google Drive ของท่าน ตั้งชื่อให้สื่อความหมาย เช่น "TNSU_REC_2567_ชื่อผู้วิจัย_ชื่อโครงการสั้นๆ"</p>
                </div>
            </div>
            
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">2</div>
                <div>
                    <h5 className="font-bold text-slate-800 text-lg">อัปโหลดไฟล์ที่จำเป็น</h5>
                    <p className="text-sm text-slate-600 mt-1">แปลงไฟล์เอกสารทั้งหมดเป็น <strong>PDF</strong> และอัปโหลดลงใน Folder (ควรแยกไฟล์ให้ชัดเจน เพื่อให้กรรมการเปิดดูได้ง่าย)</p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-slate-500 space-y-1">
                        <li>1. แบบเสนอโครงการวิจัย (Submission Form)</li>
                        <li>2. โครงร่างการวิจัยฉบับเต็ม (Full Proposal Protocol)</li>
                        <li>3. เครื่องมือที่ใช้ในการวิจัย (Questionnaire / Interview Guide)</li>
                        <li>4. เอกสารชี้แจงผู้เข้าร่วมการวิจัย (Participant Information Sheet)</li>
                        <li>5. หนังสือแสดงความยินยอม (Informed Consent Form)</li>
                        <li>6. ประวัติผู้วิจัย (CV) และใบรับรองการอบรมจริยธรรมการวิจัยในมนุษย์</li>
                    </ul>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">3</div>
                <div>
                    <h5 className="font-bold text-slate-800 text-lg">คัดลอกลิงก์ (Copy Link)</h5>
                    <p className="text-sm text-slate-600 mt-1">คลิกขวาที่โฟลเดอร์ &rarr; Share &rarr; เปลี่ยน General access เป็น <strong>Anyone with the link</strong> &rarr; Copy Link เพื่อนำมาวางในช่อง "ลิงก์เอกสารแนบ" ในระบบ TNSU-REC</p>
                </div>
            </div>
        </div>
     </div>
  );

  const renderResearcher = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">คู่มือสำหรับนักวิจัย (Researcher)</h3>
          <p className="text-slate-500 text-sm mt-1">ขั้นตอนการยื่นขอพิจารณาจริยธรรม, การติดตามผล, และการส่งรายงานความก้าวหน้า</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">1. การลงทะเบียนและเข้าสู่ระบบ</h4>
            <p className="text-sm text-slate-600">
                สมัครสมาชิกโดยใช้อีเมล (แนะนำให้ใช้อีเมลของสถาบัน) กรอกข้อมูลส่วนตัวให้ครบถ้วน เลือกบทบาทเป็น <strong>"ผู้วิจัย"</strong> และระบุสถานะ (นักศึกษา หรือ บุคลากร) ให้ถูกต้อง เนื่องจากมีผลต่อขั้นตอนการพิจารณา
            </p>
         </div>

         <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">2. การยื่นคำขอ (Submit Proposal)</h4>
            <p className="text-sm text-slate-600">
                ไปที่เมนู "ยื่นคำขอใหม่" &rarr; กรอกชื่อโครงการ (ไทย/อังกฤษ) &rarr; วางลิงก์ Google Drive ที่เตรียมไว้ &rarr; 
                <strong>กรณีนักศึกษา:</strong> ต้องเลือกชื่ออาจารย์ที่ปรึกษา &rarr; 
                <strong>กรณีบุคลากร/บุคคลภายนอก:</strong> แนบลิงก์หลักฐานการชำระเงินค่าธรรมเนียม &rarr; กด "ส่งข้อมูล"
            </p>
         </div>

         <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">3. การติดตามสถานะ (Tracking)</h4>
            <p className="text-sm text-slate-600">
                ตรวจสอบสถานะโครงการได้ที่หน้า "แดชบอร์ด" 
                <br/>
                <span className="text-xs text-slate-400">• <strong>รอที่ปรึกษาอนุมัติ:</strong> โครงการถูกส่งไปให้อาจารย์ที่ปรึกษาตรวจสอบ (เฉพาะนักศึกษา)</span>
                <br/>
                <span className="text-xs text-slate-400">• <strong>รอเจ้าหน้าที่ตรวจสอบ:</strong> Admin กำลังตรวจสอบความครบถ้วนของเอกสาร</span>
                <br/>
                <span className="text-xs text-slate-400">• <strong>อยู่ระหว่างพิจารณา:</strong> กรรมการกำลังประเมินโครงการ</span>
            </p>
         </div>

         <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors bg-orange-50/50">
            <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2">4. การแก้ไขโครงการ (Revision)</h4>
            <p className="text-sm text-slate-600">
                หากสถานะเปลี่ยนเป็น <strong>"แก้ไขตามข้อเสนอแนะ"</strong> หรือ <strong>"เอกสารไม่ถูกต้อง"</strong>
                <br/>
                ให้คลิกที่ไอคอนรูปตา (ดูรายละเอียด) &rarr; อ่านข้อเสนอแนะจากกรรมการ/Admin &rarr; ทำการแก้ไขไฟล์ใน Google Drive &rarr; นำลิงก์ไฟล์ที่แก้ไขแล้วมาวางในช่อง "ส่งแบบขอแก้ไข" พร้อมระบุรายละเอียดการแก้ไข &rarr; กดส่ง
            </p>
         </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
         <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><FileCheck /> หลังได้รับอนุมัติ (Post-Approval)</h4>
         <ul className="list-disc pl-5 space-y-2 text-sm text-green-800">
            <li><strong>การรับใบรับรอง:</strong> เมื่อสถานะเป็น "อนุมัติแล้ว" ท่านสามารถดาวน์โหลด <strong>ใบรับรอง (E-Certificate)</strong> ได้ที่หน้ารายละเอียดโครงการ</li>
            <li><strong>รายงานความก้าวหน้า:</strong> เมื่อดำเนินการวิจัย ท่านต้องส่ง <strong>รายงานความก้าวหน้า (Progress Report)</strong> หรือรายงานปิดโครงการ (Close-out Report) ตามระยะเวลาที่กำหนด โดยกดปุ่ม "ส่งรายงานความก้าวหน้า" ในหน้าโครงการ</li>
            <li><strong>การต่ออายุ:</strong> หากการวิจัยยังไม่เสร็จสิ้น และใบรับรองใกล้หมดอายุ ให้กดปุ่ม <strong>"ขอต่ออายุ (Renew)"</strong> ก่อนใบรับรองหมดอายุอย่างน้อย 30 วัน</li>
         </ul>
      </div>
    </div>
  );

  const renderApprover = () => (
     <div className="space-y-8 animate-in fade-in duration-300">
        <div className="border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">คู่มือสำหรับที่ปรึกษาและกรรมการ (Advisor & Reviewer)</h3>
          <p className="text-slate-500 text-sm mt-1">บทบาทในการกลั่นกรอง ตรวจสอบ และประเมินคุณภาพงานวิจัยตามหลักจริยธรรม</p>
        </div>

        {/* ADVISOR */}
        <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-6">
            <h4 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                <UserPlus className="bg-yellow-200 p-1 rounded text-yellow-800" size={24}/> 
                สำหรับอาจารย์ที่ปรึกษา (Advisor)
            </h4>
            <div className="space-y-3 text-sm text-slate-700">
                <p>ท่านมีหน้าที่ <strong>"คัดกรองเบื้องต้น"</strong> โครงการของนักศึกษาที่ระบุชื่อท่านเป็นที่ปรึกษา เพื่อให้มั่นใจว่าเอกสารมีความสมบูรณ์ก่อนส่งถึงคณะกรรมการ</p>
                <ol className="list-decimal pl-5 space-y-2 bg-white p-4 rounded-lg border border-yellow-100">
                    <li>เมื่อนักศึกษายื่นคำขอ ระบบจะส่งอีเมลแจ้งเตือนไปยังท่าน</li>
                    <li>เข้าสู่ระบบ &rarr; ไปที่หน้า "แดชบอร์ด" &rarr; ท่านจะเห็นรายการโครงการที่สถานะเป็น <strong>"รอที่ปรึกษาอนุมัติ"</strong></li>
                    <li>คลิกที่ไอคอนรูปปากกา (แก้ไข/พิจารณา) เพื่อดูรายละเอียดโครงการ</li>
                    <li>ตรวจสอบไฟล์เอกสารจากลิงก์ Google Drive ที่นักศึกษาแนบมา</li>
                    <li>
                        <strong>การตัดสินใจ:</strong>
                        <ul className="list-disc pl-5 mt-1 text-slate-600">
                            <li><strong>กรณีผ่าน:</strong> กดปุ่ม "อนุมัติโครงการ (Approve)" โครงการจะถูกส่งต่อไปยัง Admin</li>
                            <li><strong>กรณีไม่ผ่าน:</strong> กดปุ่ม "ส่งคืนแก้ไข (Return)" พร้อมระบุข้อความแจ้งเตือนให้นักศึกษาทราบว่าต้องแก้ไขส่วนใด</li>
                        </ul>
                    </li>
                </ol>
            </div>
        </div>

        {/* REVIEWER */}
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-6">
            <h4 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                <CheckCircle className="bg-indigo-200 p-1 rounded text-indigo-800" size={24}/> 
                สำหรับกรรมการผู้ทรงคุณวุฒิ (Reviewer)
            </h4>
            <div className="space-y-3 text-sm text-slate-700">
                <p>ท่านจะได้รับการแต่งตั้งจาก Admin ให้พิจารณาโครงการตามความเชี่ยวชาญของท่าน</p>
                <ol className="list-decimal pl-5 space-y-2 bg-white p-4 rounded-lg border border-indigo-100">
                    <li><strong>การตอบรับการพิจารณา:</strong> เมื่อได้รับอีเมลเชิญ ให้เข้าระบบ &rarr; แดชบอร์ด &rarr; คลิกดูโครงการที่ได้รับมอบหมาย &rarr; กดปุ่ม <strong>"ตอบรับ (Accept)"</strong> หรือ <strong>"ปฏิเสธ (Decline)"</strong> การพิจารณา</li>
                    <li><strong>การประเมินโครงการ:</strong> หากตอบรับ ท่านสามารถเปิดดูเอกสารจากลิงก์ Google Drive และทำการประเมินตามหลักเกณฑ์จริยธรรมการวิจัย</li>
                    <li><strong>การบันทึกผลการพิจารณา:</strong> เลื่อนลงมาที่ส่วน "บันทึกผลการพิจารณา"
                        <ul className="list-disc pl-5 mt-1 text-slate-600">
                            <li><strong>มติ (Vote):</strong> เลือก APPROVE (อนุมัติ), MINOR_REVISION (แก้ไขเล็กน้อย), MAJOR_REVISION (แก้ไขใหญ่), หรือ REJECT (ไม่อนุมัติ)</li>
                            <li><strong>ข้อเสนอแนะ (Comments):</strong> พิมพ์ข้อเสนอแนะลงในกล่องข้อความ</li>
                            <li><strong>ไฟล์แนบ (Attachment):</strong> หากท่านมีการ Comment ลงในไฟล์ Word/PDF โดยตรง สามารถอัปโหลดไฟล์นั้นลง Google Drive ของท่าน และนำลิงก์มาวางในช่อง "ลิงก์ไฟล์แนบการประเมิน"</li>
                        </ul>
                    </li>
                    <li>ตรวจสอบความถูกต้องและกดปุ่ม <strong>"ส่งผลการพิจารณา"</strong> (เมื่อส่งแล้วจะไม่สามารถแก้ไขได้)</li>
                </ol>
            </div>
        </div>
     </div>
  );

  const renderAdmin = () => (
     <div className="space-y-8 animate-in fade-in duration-300">
        <div className="border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">คู่มือสำหรับผู้ดูแลระบบ (Admin)</h3>
          <p className="text-slate-500 text-sm mt-1">การบริหารจัดการโครงการทั้งหมด การจัดการผู้ใช้งาน และการออกใบรับรอง</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
            <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                <div className="font-bold text-2xl text-slate-300">01</div>
                <div>
                    <h5 className="font-bold text-slate-800">Screening (ตรวจสอบเบื้องต้น)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                        เมื่อโครงการมีสถานะ "รอเจ้าหน้าที่ตรวจสอบ" Admin ต้องเข้าไปตรวจสอบความครบถ้วนของเอกสารและหลักฐานการชำระเงิน (ถ้ามี) 
                        หากเอกสารไม่ครบ ให้กดปุ่ม <strong>"ส่งคืนให้ผู้วิจัยแก้ไข" (Return to Researcher)</strong> พร้อมระบุเหตุผล
                    </p>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                <div className="font-bold text-2xl text-slate-300">02</div>
                <div>
                    <h5 className="font-bold text-slate-800">Reviewer Assignment (มอบหมายกรรมการ)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                        หากเอกสารครบถ้วน ให้เลื่อนลงมาที่ส่วน "จัดการกรรมการ" เลือกกรรมการจาก Dropdown (สามารถเลือกได้หลายท่าน) ระบบจะแสดง <strong>ภาระงาน (Workload)</strong> ของกรรมการแต่ละท่านเพื่อช่วยในการตัดสินใจ จากนั้นกด "บันทึกและส่งแจ้งเตือน"
                    </p>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                <div className="font-bold text-2xl text-slate-300">03</div>
                <div>
                    <h5 className="font-bold text-slate-800">Final Decision (สรุปผลการพิจารณา)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                        เมื่อกรรมการส่งผลพิจารณาครบถ้วน Admin ต้องรวบรวมข้อคิดเห็น (Consolidate Feedback) สร้างเป็นไฟล์ PDF เดียว อัปโหลดลง Drive ของสำนักงาน และนำลิงก์มาวางในช่อง "ลิงก์เอกสารสรุปข้อเสนอแนะ" 
                        จากนั้นเลือกมติสรุป (Approve / Revision Required / Reject) และกด "บันทึกมติ"
                    </p>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                <div className="font-bold text-2xl text-slate-300">04</div>
                <div>
                    <h5 className="font-bold text-slate-800">Certification (การออกใบรับรอง)</h5>
                    <p className="text-sm text-slate-600 mt-1">
                        กรณีมติคือ "อนุมัติ" สถานะจะเปลี่ยนเป็น "รอออกใบรับรอง" Admin ต้องกรอกข้อมูลใบรับรอง (เลขที่ใบรับรอง, วันที่อนุมัติ, วันหมดอายุ) และแนบ <strong>ลิงก์ไฟล์ใบรับรองที่ลงนามแล้ว</strong> จากนั้นกด "ออกใบรับรอง"
                    </p>
                </div>
            </div>
        </div>

        <div className="mt-6 border-t pt-6">
            <h4 className="font-bold text-slate-800 mb-3">การจัดการผู้ใช้งาน (User Management)</h4>
            <p className="text-sm text-slate-600 mb-2">เข้าเมนู "จัดการผู้ใช้งาน" จากแถบเมนูด้านบน เพื่อ:</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                <li><strong>เพิ่มผู้ใช้งานใหม่:</strong> กดปุ่ม "เพิ่มผู้ใช้งาน" กรอกข้อมูลและกำหนดรหัสผ่านเริ่มต้น</li>
                <li><strong>แก้ไขบทบาท (Roles):</strong> สามารถเพิ่มสิทธิ์ Reviewer หรือ Admin ให้กับผู้ใช้งานที่มีอยู่ได้</li>
                <li><strong>รีเซ็ตรหัสผ่าน:</strong> กดปุ่มกุญแจ เพื่อส่งอีเมลรีเซ็ตรหัสผ่านไปยังผู้ใช้งาน</li>
                <li><strong>ระงับการใช้งาน:</strong> กดปุ่มแบน เพื่อระงับสิทธิ์การเข้าสู่ระบบของผู้ใช้งาน</li>
            </ul>
        </div>
        
        <div className="mt-6 border-t pt-6">
            <h4 className="font-bold text-slate-800 mb-3">ระบบรายงาน (Reports & Audit Logs)</h4>
            <p className="text-sm text-slate-600 mb-2">เข้าเมนู "รายงานสถิติ" เพื่อ:</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                <li>ดูสถิติโครงการแยกตามคณะ สถานะ และประสิทธิภาพการทำงานของกรรมการ</li>
                <li>ดูผลการประเมินความพึงพอใจของผู้ใช้งานระบบ</li>
                <li>ตรวจสอบ <strong>Audit Logs</strong> (บันทึกกิจกรรมระบบ) และ <strong>Email Logs</strong> (บันทึกการส่งอีเมล) เพื่อใช้ในการตรวจสอบย้อนหลัง</li>
            </ul>
        </div>
     </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <BookOpen className="text-blue-600" /> คู่มือการใช้งานระบบ TNSU-REC
           </h2>
           <p className="text-slate-500 mt-1">รายละเอียดขั้นตอนการทำงานและการใช้งานระบบจริยธรรมการวิจัยในมนุษย์อย่างครบถ้วน</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleDownloadPDF}
                disabled={generating}
                className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
                <Download size={18} className="mr-2" />
                {generating ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดคู่มือ (PDF)'}
            </button>
            {!user && (
            <button onClick={() => onNavigate('auth')} className="flex items-center text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200 shadow-sm">
                <ArrowLeft size={18} className="mr-2" /> กลับหน้าเข้าสู่ระบบ
            </button>
            )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg border-blue-600 transform scale-105'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon size={20} className={activeTab === tab.id ? 'text-blue-200' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="bg-slate-100 p-4 rounded-xl mt-6 border border-slate-200">
             <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                <HelpCircle size={16}/> ต้องการความช่วยเหลือ?
             </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                หากพบปัญหาในการใช้งาน หรือต้องการสอบถามข้อมูลเพิ่มเติม กรุณาติดต่อเจ้าหน้าที่สำนักงานบัณฑิตศึกษา หรือ Admin ประจำระบบ
             </p>
          </div>
        </div>

        {/* Content Area */}
        <div 
            ref={manualRef} 
            className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[600px]"
        >
          {isAdmin && (
            <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={20} className="text-slate-500" />
                  ตั้งค่าลิงก์คู่มือ PDF (สำหรับ Admin)
                </h3>
                {!isEditingUrl && (
                  <button 
                    onClick={() => setIsEditingUrl(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    แก้ไขลิงก์
                  </button>
                )}
              </div>
              
              {isEditingUrl ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">กรุณาวางลิงก์ไฟล์ PDF (เช่น ลิงก์จาก Google Drive ที่ตั้งค่า Anyone with the link)</p>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={handleSaveUrl}
                      disabled={generating}
                      className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={18} className="mr-2" /> บันทึก
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingUrl(false);
                        setTempUrl(manualUrl);
                      }}
                      className="flex items-center bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 border border-slate-200 rounded-lg text-sm text-slate-600 break-all">
                  {manualUrl ? (
                    <a href={manualUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {manualUrl}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">ยังไม่ได้ตั้งค่าลิงก์คู่มือ</span>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'workflow' && (
              <div>
                  {renderWorkflow()}
              </div>
          )}

          {activeTab === 'prep' && (
              <div>
                  {renderPrep()}
              </div>
          )}

          {activeTab === 'researcher' && (
              <div>
                  {renderResearcher()}
              </div>
          )}

          {activeTab === 'approver' && (
              <div>
                  {renderApprover()}
              </div>
          )}

          {activeTab === 'admin' && (
              <div>
                  {renderAdmin()}
              </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

// Helper Component for Workflow Step
const WorkflowStep = ({ step, title, desc, role, color }: any) => {
    const colorClasses: any = {
        blue: "bg-blue-100 text-blue-800 border-blue-200",
        orange: "bg-orange-100 text-orange-800 border-orange-200",
        purple: "bg-purple-100 text-purple-800 border-purple-200",
        indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
        green: "bg-green-100 text-green-800 border-green-200",
    };

    return (
        <div className="flex gap-4 items-start relative group">
            <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg z-10 border-2 shadow-sm ${colorClasses[color]} bg-white`}>
                    {step}
                </div>
                {/* Connector Line */}
                <div className="w-0.5 h-full bg-slate-200 absolute top-10 bottom-[-20px] group-last:hidden"></div>
            </div>
            <div className={`flex-1 p-4 rounded-xl border bg-white hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800">{title}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${colorClasses[color]}`}>{role}</span>
                </div>
                <p className="text-sm text-slate-600">{desc}</p>
            </div>
        </div>
    );
};

export default UserManual;
