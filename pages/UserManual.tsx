
import React, { useState } from 'react';
import { db } from '../services/database';
import { ArrowLeft, BookOpen, UserPlus, FileText, CheckCircle, Shield, AlertCircle, HelpCircle, HardDrive, GitBranch, PlayCircle, FileCheck, RefreshCw } from 'lucide-react';

interface UserManualProps {
  onNavigate: (page: string) => void;
}

const UserManual: React.FC<UserManualProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('workflow');
  const user = db.currentUser;

  const tabs = [
    { id: 'workflow', label: 'ภาพรวมกระบวนการ (Workflow)', icon: GitBranch },
    { id: 'prep', label: 'การเตรียมเอกสาร (Google Drive)', icon: HardDrive },
    { id: 'researcher', label: 'คู่มือนักวิจัย (Researcher)', icon: FileText },
    { id: 'approver', label: 'คู่มือที่ปรึกษา/กรรมการ', icon: CheckCircle },
    { id: 'admin', label: 'คู่มือผู้ดูแลระบบ (Admin)', icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <BookOpen className="text-blue-600" /> คู่มือการใช้งานระบบ TNSU-REC
           </h2>
           <p className="text-slate-500 mt-1">รายละเอียดขั้นตอนการทำงานและการใช้งานระบบจริยธรรมการวิจัยในมนุษย์</p>
        </div>
        {!user && (
          <button onClick={() => onNavigate('auth')} className="flex items-center text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200 shadow-sm">
            <ArrowLeft size={18} className="mr-2" /> กลับหน้าเข้าสู่ระบบ
          </button>
        )}
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
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[600px]">
          
          {/* TAB: WORKFLOW ANALYSIS */}
          {activeTab === 'workflow' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-800">วิเคราะห์กระบวนการทำงาน (System Workflow Analysis)</h3>
                  <p className="text-slate-500 text-sm mt-1">แผนภาพแสดงลำดับขั้นตอนการพิจารณาจริยธรรมการวิจัย ตั้งแต่เริ่มต้นจนสิ้นสุด</p>
              </div>

              {/* Workflow Diagram */}
              <div className="space-y-4">
                  <WorkflowStep 
                      step="1" 
                      title="ยื่นคำขอ (Submission)" 
                      desc="นักวิจัยกรอกข้อมูลและแนบลิงก์ Google Drive" 
                      role="Researcher"
                      color="blue"
                  />
                  
                  {/* Branching for Student */}
                  <div className="pl-8 border-l-2 border-dashed border-slate-300 ml-6 py-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                          <span className="bg-slate-200 px-2 py-1 rounded">กรณีเป็นนักศึกษา</span>
                      </div>
                      <WorkflowStep 
                          step="1.5" 
                          title="ที่ปรึกษาพิจารณา (Advisor Review)" 
                          desc="ตรวจสอบความถูกต้องเบื้องต้น (อนุมัติ/ส่งคืนแก้ไข)" 
                          role="Advisor"
                          color="orange"
                      />
                  </div>

                  <WorkflowStep 
                      step="2" 
                      title="เจ้าหน้าที่ตรวจสอบ (Admin Check)" 
                      desc="ตรวจสอบเอกสารครบถ้วน และคัดเลือกกรรมการ (Assign Reviewers)" 
                      role="Admin"
                      color="purple"
                  />

                  <WorkflowStep 
                      step="3" 
                      title="การพิจารณา (In Review)" 
                      desc="กรรมการผู้ทรงคุณวุฒิประเมินโครงการและลงมติ (Approve / Fix / Reject)" 
                      role="Reviewer"
                      color="indigo"
                  />

                  <WorkflowStep 
                      step="4" 
                      title="สรุปผล (Final Decision)" 
                      desc="Admin รวบรวมมติและแจ้งผลไปยังนักวิจัย" 
                      role="Admin"
                      color="blue"
                  />

                  {/* Feedback Loop */}
                  <div className="pl-8 border-l-2 border-dashed border-slate-300 ml-6 py-4">
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-3">
                          <RefreshCw className="text-red-500 mt-1" size={18}/>
                          <div>
                              <span className="font-bold text-red-800 text-sm">กรณี "ให้แก้ไข" (Revision Required)</span>
                              <p className="text-xs text-red-700 mt-1">
                                  นักวิจัยต้องแก้ไขเอกสารและส่งลิงก์ใหม่ -> กลับไปขั้นตอนที่ 2 (Admin Check)
                              </p>
                          </div>
                      </div>
                  </div>

                  <WorkflowStep 
                      step="5" 
                      title="ออกใบรับรอง (Certification)" 
                      desc="เมื่อผ่านการอนุมัติ ระบบจะออกเลขใบรับรองและให้ดาวน์โหลด E-Certificate" 
                      role="System/Admin"
                      color="green"
                  />
              </div>
            </div>
          )}

          {/* TAB: PREPARATION (GOOGLE DRIVE) */}
          {activeTab === 'prep' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b pb-4">
                    <h3 className="text-xl font-bold text-slate-800">การเตรียมเอกสารด้วย Google Drive (สำคัญมาก)</h3>
                    <p className="text-slate-500 text-sm mt-1">เนื่องจากระบบเน้นความรวดเร็วและรองรับไฟล์ขนาดใหญ่ ท่านต้องเตรียมไฟล์บน Cloud Storage ก่อนยื่นคำขอ</p>
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
                            <p className="text-sm text-slate-600 mt-1">สร้าง Folder ใน Google Drive ของท่าน ตั้งชื่อให้สื่อความหมาย เช่น "TNSU_Research_2024_ชื่อผู้วิจัย"</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">2</div>
                        <div>
                            <h5 className="font-bold text-slate-800 text-lg">อัปโหลดไฟล์ที่จำเป็น</h5>
                            <p className="text-sm text-slate-600 mt-1">แปลงไฟล์เอกสารทั้งหมดเป็น <strong>PDF</strong> และอัปโหลดลงใน Folder (แยกไฟล์ให้ชัดเจน ไม่ควรรวมเป็นไฟล์เดียวหากไม่จำเป็น)</p>
                            <ul className="list-disc pl-5 mt-2 text-sm text-slate-500 space-y-1">
                                <li>แบบเสนอโครงการวิจัย (Submission Form)</li>
                                <li>โครงร่างการวิจัย (Proposal Protocol)</li>
                                <li>เครื่องมือที่ใช้ในการวิจัย (Questionnaire/Interview Guide)</li>
                                <li>เอกสารชี้แจงและขอความยินยอม (Participant Information Sheet & Informed Consent)</li>
                                <li>ประวัติผู้วิจัย (CV) และใบรับรองจริยธรรม (Certificate of Human Ethics Training)</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">3</div>
                        <div>
                            <h5 className="font-bold text-slate-800 text-lg">คัดลอกลิงก์ (Copy Link)</h5>
                            <p className="text-sm text-slate-600 mt-1">คลิกขวาที่โฟลเดอร์ -> Share -> เปลี่ยน General access เป็น <strong>Anyone with the link</strong> -> Copy Link เพื่อนำมาวางในระบบ</p>
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* TAB: RESEARCHER GUIDE */}
          {activeTab === 'researcher' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-800">คู่มือสำหรับนักวิจัย (Researcher)</h3>
                  <p className="text-slate-500 text-sm mt-1">ขั้นตอนการยื่นขอ, ติดตามผล, และการแก้ไขโครงการ</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Step 1 */}
                 <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                    <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">1. ลงทะเบียน/เข้าสู่ระบบ</h4>
                    <p className="text-sm text-slate-600">
                        สมัครสมาชิกโดยใช้อีเมล (แนะนำอีเมลสถาบัน) เลือกบทบาทเป็น <strong>"ผู้วิจัย"</strong> และระบุสถานะ (นักศึกษา/บุคลากร) ให้ถูกต้อง
                    </p>
                 </div>

                 {/* Step 2 */}
                 <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                    <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">2. ยื่นคำขอ (Submit)</h4>
                    <p className="text-sm text-slate-600">
                        เมนู "ยื่นคำขอใหม่" -> กรอกข้อมูลโครงการ -> วางลิงก์ Google Drive -> (ถ้านักศึกษา) เลือกที่ปรึกษา -> (ถ้าบุคลากร) แนบลิงก์สลิปโอนเงิน -> กดส่ง
                    </p>
                 </div>

                 {/* Step 3 */}
                 <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                    <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">3. ติดตามสถานะ</h4>
                    <p className="text-sm text-slate-600">
                        ตรวจสอบสถานะที่ "แดชบอร์ด" 
                        <br/>
                        <span className="text-xs text-slate-400">• รอที่ปรึกษาอนุมัติ (นักศึกษาต้องแจ้งอาจารย์)</span>
                        <br/>
                        <span className="text-xs text-slate-400">• รอเจ้าหน้าที่ตรวจสอบ (Admin กำลังเช็คเอกสาร)</span>
                    </p>
                 </div>

                 {/* Step 4 */}
                 <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors bg-orange-50/50">
                    <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2">4. การแก้ไข (Revision)</h4>
                    <p className="text-sm text-slate-600">
                        หากสถานะเป็น <strong>"แก้ไขตามข้อเสนอแนะ"</strong> หรือ <strong>"เอกสารไม่ถูกต้อง"</strong>
                        <br/>
                        ให้คลิกเข้าไปดูรายละเอียด -> อ่านคอมเมนต์ -> แก้ไขไฟล์ใน Drive -> นำลิงก์ไฟล์ใหม่มาวางในช่อง "ส่งแบบขอแก้ไข"
                    </p>
                 </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
                 <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><FileCheck /> หลังได้รับอนุมัติ (Post-Approval)</h4>
                 <ul className="list-disc pl-5 space-y-2 text-sm text-green-800">
                    <li>ท่านสามารถดาวน์โหลด <strong>ใบรับรอง (E-Certificate)</strong> ได้ที่หน้าโครงการ</li>
                    <li>เมื่อครบกำหนด (6 เดือน / 1 ปี) ระบบจะแจ้งเตือนให้ส่ง <strong>รายงานความก้าวหน้า (Progress Report)</strong></li>
                    <li>หากต้องการต่ออายุใบรับรอง ให้กดปุ่ม <strong>"ขอต่ออายุ (Renew)"</strong> ก่อนใบรับรองหมดอายุ 30 วัน</li>
                 </ul>
              </div>
            </div>
          )}

          {/* TAB: ADVISOR & REVIEWER */}
          {activeTab === 'approver' && (
             <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-800">คู่มือสำหรับที่ปรึกษาและกรรมการ</h3>
                  <p className="text-slate-500 text-sm mt-1">บทบาทในการกลั่นกรองและประเมินคุณภาพงานวิจัย</p>
                </div>

                {/* ADVISOR */}
                <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                        <UserPlus className="bg-yellow-200 p-1 rounded text-yellow-800" size={24}/> 
                        สำหรับอาจารย์ที่ปรึกษา (Advisor)
                    </h4>
                    <div className="space-y-3 text-sm text-slate-700">
                        <p>ท่านมีหน้าที่ <strong>"คัดกรองเบื้องต้น"</strong> โครงการของนักศึกษาในที่ปรึกษาของท่าน</p>
                        <ol className="list-decimal pl-5 space-y-2 bg-white p-4 rounded-lg border border-yellow-100">
                            <li>เมื่อนักศึกษายื่นคำขอ ระบบจะส่งอีเมลแจ้งเตือนท่าน</li>
                            <li>เข้าสู่ระบบ -> แดชบอร์ด -> รายการที่สถานะ <strong>"รอที่ปรึกษาอนุมัติ"</strong></li>
                            <li>ตรวจสอบไฟล์เอกสารจากลิงก์ Google Drive</li>
                            <li>
                                <strong>กรณีผ่าน:</strong> กดปุ่ม "อนุมัติโครงการ (Approve)" เพื่อส่งต่อให้ Admin
                                <br/>
                                <strong>กรณีไม่ผ่าน:</strong> กดปุ่ม "ส่งคืนแก้ไข (Return)" และระบุข้อความแจ้งนักศึกษา
                            </li>
                        </ol>
                    </div>
                </div>

                {/* REVIEWER */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="bg-indigo-200 p-1 rounded text-indigo-800" size={24}/> 
                        สำหรับกรรมการ (Reviewer)
                    </h4>
                    <div className="space-y-3 text-sm text-slate-700">
                        <p>ท่านจะได้รับการแต่งตั้งจาก Admin ให้พิจารณาโครงการตามความเชี่ยวชาญ</p>
                        <ol className="list-decimal pl-5 space-y-2 bg-white p-4 rounded-lg border border-indigo-100">
                            <li><strong>การตอบรับ:</strong> เมื่อได้รับอีเมล/แจ้งเตือน ให้กดเข้าไปดูและกด "ตอบรับ" หรือ "ปฏิเสธ" การพิจารณา</li>
                            <li><strong>การประเมิน:</strong> อ่านเอกสารและลงความเห็นในแบบฟอร์ม (Vote & Comment)
                                <ul className="list-disc pl-5 mt-1 text-slate-500">
                                    <li>APPROVE: อนุมัติโดยไม่มีเงื่อนไข</li>
                                    <li>FIX: ให้แก้ไข (ต้องระบุรายละเอียดสิ่งที่ต้องแก้)</li>
                                    <li>REJECT: ไม่อนุมัติ (ผิดจริยธรรมร้ายแรง)</li>
                                </ul>
                            </li>
                            <li><strong>การส่งผล:</strong> สามารถแนบไฟล์ Word/PDF ที่ท่านทำ Comment ไว้ (ถ้ามี) แล้วกดส่งผลการพิจารณา</li>
                        </ol>
                    </div>
                </div>
             </div>
          )}

          {/* TAB: ADMIN */}
          {activeTab === 'admin' && (
             <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-800">คู่มือสำหรับผู้ดูแลระบบ (Admin)</h3>
                  <p className="text-slate-500 text-sm mt-1">การบริหารจัดการโครงการและผู้ใช้งาน</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                        <div className="font-bold text-2xl text-slate-300">01</div>
                        <div>
                            <h5 className="font-bold text-slate-800">Screening (ตรวจสอบเบื้องต้น)</h5>
                            <p className="text-sm text-slate-600 mt-1">
                                ตรวจสอบความครบถ้วนของเอกสาร หากไม่ครบให้กด <strong>"ส่งคืนให้ผู้วิจัยแก้ไข" (Return)</strong> พร้อมระบุเหตุผล
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                        <div className="font-bold text-2xl text-slate-300">02</div>
                        <div>
                            <h5 className="font-bold text-slate-800">Reviewer Assignment (มอบหมายกรรมการ)</h5>
                            <p className="text-sm text-slate-600 mt-1">
                                เลือกกรรมการจากรายชื่อ ระบบจะแสดงภาระงาน (Workload) ของกรรมการแต่ละท่านเพื่อช่วยในการตัดสินใจ
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                        <div className="font-bold text-2xl text-slate-300">03</div>
                        <div>
                            <h5 className="font-bold text-slate-800">Final Decision (สรุปผล)</h5>
                            <p className="text-sm text-slate-600 mt-1">
                                เมื่อกรรมการส่งผลครบ ให้รวบรวมข้อคิดเห็น (Consolidate Feedback) สร้างเป็นไฟล์ PDF เดียว แล้วแนบลิงก์ส่งให้นักวิจัย พร้อมเลือกมติ (Approve / Revision Required / Reject)
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-slate-50 flex gap-4">
                        <div className="font-bold text-2xl text-slate-300">04</div>
                        <div>
                            <h5 className="font-bold text-slate-800">Certification (ออกใบรับรอง)</h5>
                            <p className="text-sm text-slate-600 mt-1">
                                กรณีอนุมัติ: ระบบจะให้กรอกข้อมูลใบรับรอง (เลขที่, วันที่, วันหมดอายุ) และแนบลิงก์ไฟล์ใบรับรองที่ลงนามแล้ว
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t pt-6">
                    <h4 className="font-bold text-slate-800 mb-3">การจัดการผู้ใช้งาน (User Management)</h4>
                    <p className="text-sm text-slate-600 mb-2">เข้าเมนู "จัดการผู้ใช้งาน" เพื่อ:</p>
                    <ul className="list-disc pl-5 text-sm text-slate-600">
                        <li>เพิ่มผู้ใช้งานใหม่ (Add User)</li>
                        <li>แก้ไขบทบาท (เช่น เพิ่มสิทธิ์ Reviewer ให้อาจารย์)</li>
                        <li>รีเซ็ตรหัสผ่าน (Send Password Reset Email)</li>
                        <li>ระงับการใช้งาน (Suspend)</li>
                    </ul>
                </div>
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
