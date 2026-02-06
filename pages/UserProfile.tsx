import React, { useState } from 'react';
import { db } from '../services/database';

const UserProfile: React.FC = () => {
  const user = db.currentUser;
  const [activeTab, setActiveTab] = useState('profile');

  // State for survey
  const [scores, setScores] = useState<Record<string, number>>({});
  const [suggestion, setSuggestion] = useState('');

  if (!user) return null;

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex space-x-4 border-b">
         <button onClick={() => setActiveTab('profile')} className={`pb-3 px-4 font-medium ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>ข้อมูลส่วนตัว</button>
         <button onClick={() => setActiveTab('survey')} className={`pb-3 px-4 font-medium ${activeTab === 'survey' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>ประเมินความพึงพอใจ</button>
       </div>

       {activeTab === 'profile' ? (
         <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-6">แก้ไขข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล</label>
                  <input type="text" value={user.name} disabled className="w-full bg-slate-50 border p-2 rounded text-slate-500" />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">อีเมล</label>
                  <input type="text" value={user.email} disabled className="w-full bg-slate-50 border p-2 rounded text-slate-500" />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">สังกัด</label>
                  <input type="text" value={user.campus || '-'} disabled className="w-full bg-slate-50 border p-2 rounded text-slate-500" />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">คณะ</label>
                  <input type="text" value={user.faculty || '-'} disabled className="w-full bg-slate-50 border p-2 rounded text-slate-500" />
               </div>
            </div>
            <div className="mt-8">
               <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 opacity-50 cursor-not-allowed" disabled>บันทึกการเปลี่ยนแปลง (ติดต่อ Admin เพื่อแก้ไข)</button>
            </div>
         </div>
       ) : (
         <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-2">แบบประเมินความพึงพอใจ</h3>
            <p className="text-sm text-slate-500 mb-6">คำชี้แจง: โปรดระบุคะแนนความพึงพอใจ (5=มากที่สุด, 1=น้อยที่สุด)</p>
            
            <div className="space-y-8">
               {surveySections.map((section, sIdx) => (
                  <div key={sIdx}>
                     <h4 className="font-semibold text-blue-800 bg-blue-50 p-3 rounded-lg mb-4">{section.title}</h4>
                     <div className="space-y-4 pl-2">
                        {section.questions.map((q, qIdx) => {
                           // Calculate global index to keep keys unique
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

            <div className="mt-8">
                <label className="block text-sm font-medium text-slate-700 mb-2">ข้อเสนอแนะเพิ่มเติม</label>
                <textarea 
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="ความคิดเห็นของท่าน..." 
                  rows={3}
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                ></textarea>
            </div>
            
            <div className="mt-6 flex justify-end">
               <button 
                  className="bg-green-600 text-white px-8 py-2.5 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-transform active:scale-95" 
                  onClick={() => alert('ขอบคุณสำหรับการประเมิน\nระบบได้บันทึกข้อมูลเรียบร้อยแล้ว')}
               >
                  ส่งแบบประเมิน
               </button>
            </div>
         </div>
       )}
    </div>
  );
};

export default UserProfile;
