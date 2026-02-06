import React, { useState } from 'react';
import { db } from '../services/mockDatabase';

const UserProfile: React.FC = () => {
  const user = db.currentUser;
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) return null;

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
               <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">บันทึกการเปลี่ยนแปลง</button>
            </div>
         </div>
       ) : (
         <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4">แบบประเมินความพึงพอใจ</h3>
            <p className="text-sm text-slate-500 mb-6">ความคิดเห็นของท่านมีค่าต่อการพัฒนาระบบ</p>
            
            <div className="space-y-4">
               {['ความสะดวกในการใช้งาน', 'ความง่ายในการกรอกข้อมูล', 'การแจ้งเตือนชัดเจน', 'ความรวดเร็วของเจ้าหน้าที่'].map((q, i) => (
                 <div key={i} className="flex justify-between items-center border-b pb-4">
                    <span className="text-slate-700 text-sm">{q}</span>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(score => (
                          <label key={score} className="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer hover:bg-blue-50">
                             <input type="radio" name={`q${i}`} className="hidden" />
                             <span className="text-xs font-bold">{score}</span>
                          </label>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
            <div className="mt-6">
                <textarea className="w-full border p-3 rounded" placeholder="ข้อเสนอแนะเพิ่มเติม..." rows={3}></textarea>
            </div>
            <button className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700" onClick={() => alert('ขอบคุณสำหรับการประเมิน')}>ส่งแบบประเมิน</button>
         </div>
       )}
    </div>
  );
};

export default UserProfile;