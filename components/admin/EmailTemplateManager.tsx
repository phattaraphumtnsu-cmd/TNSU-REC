import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { EmailTemplate, EmailTrigger } from '../../types';
import { Loader2, Save, Edit2, X, Check, Mail } from 'lucide-react';

const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EmailTemplate>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await db.getEmailTemplates();
      setTemplates(data);
    } catch (e) {
      console.error("Failed to fetch templates", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingId(template.id);
    setEditForm(template);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    try {
        await db.updateEmailTemplate(editingId, editForm);
        await fetchTemplates();
        setEditingId(null);
        alert("บันทึกเทมเพลตเรียบร้อยแล้ว");
    } catch (e: any) {
        alert("Error: " + e.message);
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <Mail size={24} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-800">จัดการเทมเพลตอีเมล (Email Templates)</h2>
            <p className="text-slate-500">ตั้งค่าหัวข้อและเนื้อหาอีเมลที่จะส่งออกจากระบบอัตโนมัติ</p>
        </div>
      </div>

      <div className="grid gap-6">
        {templates.map(template => (
            <div key={template.id} className={`bg-white rounded-xl shadow-sm border ${editingId === template.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'} p-6 transition-all`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <h3 className="font-bold text-lg text-slate-800">{template.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">ID: {template.id}</span>
                    </div>
                    <div>
                        {editingId === template.id ? (
                            <div className="flex gap-2">
                                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50">
                                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} บันทึก
                                </button>
                                <button onClick={handleCancel} disabled={saving} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200">
                                    <X size={16} /> ยกเลิก
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => handleEdit(template)} className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                                <Edit2 size={16} /> แก้ไข
                            </button>
                        )}
                    </div>
                </div>

                {editingId === template.id ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้ออีเมล (Subject)</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={editForm.subject || ''}
                                onChange={e => setEditForm({...editForm, subject: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เนื้อหาอีเมล (HTML Body)</label>
                            <textarea 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm h-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={editForm.body || ''}
                                onChange={e => setEditForm({...editForm, body: e.target.value})}
                            />
                            <p className="text-xs text-slate-500 mt-1">รองรับ HTML Tags เช่น &lt;p&gt;, &lt;b&gt;, &lt;br&gt;</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <span className="text-xs font-bold text-slate-600 block mb-1">ตัวแปรที่ใช้ได้ (Variables):</span>
                            <div className="flex flex-wrap gap-2">
                                {template.variables.map(v => (
                                    <span key={v} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded font-mono text-slate-600 select-all cursor-pointer" title="Click to copy" onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}>
                                        {`{{${v}}}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id={`active-${template.id}`}
                                checked={editForm.isActive}
                                onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`active-${template.id}`} className="text-sm text-slate-700">เปิดใช้งาน (Active)</label>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 opacity-80">
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Subject:</span>
                            <p className="text-slate-800 font-medium">{template.subject}</p>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Body Preview:</span>
                            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 max-h-32 overflow-hidden relative">
                                {template.body.replace(/<[^>]+>/g, '').substring(0, 150)}...
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};

export default EmailTemplateManager;
