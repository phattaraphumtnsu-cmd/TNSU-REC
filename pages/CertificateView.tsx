
import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Proposal, ProposalStatus } from '../types';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';

interface CertificateViewProps {
  id: string;
  onNavigate: (page: string, params?: any) => void;
}

const CertificateView: React.FC<CertificateViewProps> = ({ id, onNavigate }) => {
  const [proposal, setProposal] = useState<Proposal | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const p = await db.getProposalById(id);
        setProposal(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!proposal) return <div className="p-8">ไม่พบข้อมูลโครงการ</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      {/* No Print Controls */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
         <button onClick={() => onNavigate('proposal', { id: proposal.id })} className="flex items-center text-slate-600 hover:text-slate-900 gap-2">
            <ArrowLeft size={20} /> กลับไปหน้าโครงการ
         </button>
         <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2">
            <Printer size={20} /> พิมพ์ใบรับรอง
         </button>
      </div>

      {/* A4 Paper */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-16 print:shadow-none print:p-10 relative text-slate-900 font-serif">
         {/* Border */}
         <div className="absolute inset-4 border-[3px] border-double border-slate-300 pointer-events-none print:inset-0"></div>
         
         {/* Header */}
         <div className="text-center mb-10">
            <div className="w-24 h-24 mx-auto mb-4">
                <img src="https://lh3.googleusercontent.com/d/1cRjmEPgytoyDLRYvoegnN3OaqrayaF-c" alt="TNSU Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wide mb-2">Certificate of Approval</h1>
            <h2 className="text-lg text-slate-600">Human Research Ethics Committee</h2>
            <h3 className="text-md text-slate-500">Thailand National Sports University</h3>
         </div>

         {/* Content */}
         <div className="space-y-6 text-justify leading-relaxed">
            <p className="text-center">This is to certify that the research project entitled:</p>
            
            <div className="bg-slate-50 p-6 border border-slate-100 rounded text-center print:bg-transparent print:border-none print:p-2">
               <h4 className="text-xl font-bold mb-2">{proposal.titleEn}</h4>
               <h5 className="text-lg text-slate-600 mb-4">{proposal.titleTh}</h5>
               <p className="text-sm font-mono text-blue-800 print:text-black">Protocol Code: {proposal.code}</p>
            </div>

            <div className="grid grid-cols-[150px_1fr] gap-2 mt-8">
               <div className="font-bold text-right pr-4">Principal Investigator:</div>
               <div>{proposal.researcherName}</div>

               <div className="font-bold text-right pr-4">Affiliation:</div>
               <div>{proposal.faculty}, {proposal.campus}</div>

               <div className="font-bold text-right pr-4">Review Type:</div>
               <div>{proposal.type}</div>
               
               <div className="font-bold text-right pr-4">Certificate No.:</div>
               <div>{proposal.approvalDetail?.certificateNumber || proposal.certNumber || 'PENDING'}</div>
            </div>

            <p className="mt-6">
               Has been reviewed and approved by the Human Research Ethics Committee of Thailand National Sports University 
               in accordance with the Declaration of Helsinki and international ethical guidelines for biomedical and behavioral research involving human subjects.
            </p>

            <div className="grid grid-cols-2 gap-10 mt-6">
                <div>
                   <span className="font-bold">Approval Date:</span> {proposal.approvalDetail?.issuanceDate || proposal.approvalDate}
                </div>
                <div>
                   <span className="font-bold">Expiration Date:</span> {proposal.approvalDetail?.expiryDate || 'N/A'}
                </div>
            </div>
         </div>

         {/* Signatures */}
         <div className="mt-20 grid grid-cols-2 gap-16 text-center">
             <div className="flex flex-col items-center">
                 <div className="w-40 border-b border-black mb-2 h-16 flex items-end justify-center">
                    {/* Placeholder for Signature Image */}
                    <span className="text-xs text-slate-300 italic mb-2 print:hidden">[Signature]</span>
                 </div>
                 <p className="font-bold">Chairperson</p>
                 <p className="text-sm text-slate-600">Human Research Ethics Committee</p>
             </div>
             <div className="flex flex-col items-center">
                 <div className="w-40 border-b border-black mb-2 h-16 flex items-end justify-center">
                     {/* Placeholder for Signature Image */}
                     <span className="text-xs text-slate-300 italic mb-2 print:hidden">[Signature]</span>
                 </div>
                 <p className="font-bold">President</p>
                 <p className="text-sm text-slate-600">Thailand National Sports University</p>
             </div>
         </div>

         {/* Footer */}
         <div className="absolute bottom-10 left-0 w-full text-center text-xs text-slate-400">
             <p>Thailand National Sports University Human Research Ethics Committee (TNSU-REC)</p>
             <p>System Generated Document</p>
         </div>
      </div>
    </div>
  );
};

export default CertificateView;
