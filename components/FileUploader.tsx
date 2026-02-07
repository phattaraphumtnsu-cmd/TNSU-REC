
import React, { useState, useEffect } from 'react';
import { uploadFile } from '../services/storage';
import { UploadCloud, CheckCircle, FileText, X, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  folder: string;
  onUploadComplete: (url: string) => void;
  label?: string;
  accept?: string;
  required?: boolean;
  currentUrl?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  folder, 
  onUploadComplete, 
  label = "อัปโหลดไฟล์", 
  accept = ".pdf,.jpg,.jpeg,.png,.zip",
  required = false,
  currentUrl = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState(currentUrl);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    setFileUrl(currentUrl);
  }, [currentUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setUploading(true);
      setProgress(0);

      try {
        const url = await uploadFile(file, folder, (p) => setProgress(p));
        setFileUrl(url);
        onUploadComplete(url);
      } catch (error) {
        alert('การอัปโหลดล้มเหลว กรุณาลองใหม่');
        setFileName('');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemove = () => {
    setFileUrl('');
    setFileName('');
    onUploadComplete('');
    setProgress(0);
  };

  return (
    <div className="w-full">
      {label && (
         <label className="block text-sm font-medium text-slate-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
         </label>
      )}
      
      {!fileUrl ? (
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer group">
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept={accept}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center justify-center text-blue-600">
              <Loader2 className="animate-spin mb-2" size={24} />
              <div className="w-full max-w-[200px] h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                 <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-xs mt-1">{Math.round(progress)}% Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500">
              <UploadCloud size={32} className="mb-2" />
              <span className="text-sm font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</span>
              <span className="text-xs mt-1 text-slate-400">{accept.replace(/,/g, ', ')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
           <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-blue-100 p-2 rounded text-blue-600 flex-shrink-0">
                 <FileText size={20} />
              </div>
              <div className="min-w-0">
                 <p className="text-sm font-medium text-blue-900 truncate">{fileName || (fileUrl.includes('firebasestorage') ? 'ไฟล์ที่อัปโหลดเรียบร้อย' : fileUrl)}</p>
                 <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">ดูไฟล์</a>
              </div>
           </div>
           <button 
             onClick={handleRemove}
             type="button"
             className="text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded-full transition-colors"
           >
             <X size={18} />
           </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
