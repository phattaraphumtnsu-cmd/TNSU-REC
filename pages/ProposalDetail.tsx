
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Proposal, Role, Permission, hasPermission } from '../types';
import { Loader2 } from 'lucide-react';

// Imported modular components
import ProposalInfo from '../components/proposal/ProposalInfo';
import AdvisorSection from '../components/proposal/AdvisorSection';
import AdminSection from '../components/proposal/AdminSection';
import ReviewerSection from '../components/proposal/ReviewerSection';
import RevisionSection from '../components/proposal/RevisionSection';
import ProgressSection from '../components/proposal/ProgressSection';

interface ProposalDetailProps {
  id: string;
  onNavigate: (page: string, params?: any) => void;
}

const ProposalDetail: React.FC<ProposalDetailProps> = ({ id, onNavigate }) => {
  const user = db.currentUser;
  const [proposal, setProposal] = useState<Proposal | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Function to refresh proposal data
  const fetchProposal = useCallback(async () => {
    try {
        const p = await db.getProposalById(id);
        setProposal(p);
    } catch (e) {
        console.error("Failed to fetch proposal", e);
    } finally {
        setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  if (!user) return <div>Access Denied</div>;
  if (loading) return <div className="flex h-64 items-center justify-center text-blue-600"><Loader2 className="animate-spin mr-2"/> Loading Proposal...</div>;
  if (!proposal) return <div>Not Found</div>;

  return (
    <div className="space-y-6 pb-20 relative max-w-7xl mx-auto">
      
      {/* 1. Proposal Header & Info (Read-only Details) */}
      <ProposalInfo 
        proposal={proposal} 
        user={user} 
        onNavigate={onNavigate} 
        onUpdate={fetchProposal} 
      />

      {/* 2. Action Sections based on Role & Status */}

      {/* Advisor: Approve/Reject */}
      {user.roles.includes(Role.ADVISOR) && (
        <AdvisorSection 
          proposal={proposal} 
          user={user} 
          onUpdate={fetchProposal} 
        />
      )}

      {/* Admin: Manage Workflow (Assign, Decision, Cert) */}
      {/* We pass the whole component logic here; inside it decides what to render based on status */}
      {hasPermission(user.roles, Permission.MANAGE_USERS) && ( // Using broad admin permission check
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
                 {/* Admin logic is now self-contained in AdminSection which handles multiple statuses */}
                 <AdminSection 
                    proposal={proposal} 
                    user={user} 
                    onUpdate={fetchProposal} 
                 />
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              {/* Revision: For Researchers to see feedback and submit files */}
              <RevisionSection 
                  proposal={proposal} 
                  user={user} 
                  onUpdate={fetchProposal} 
              />
              
              {/* Progress: Post-Approval Reports */}
              <ProgressSection 
                  proposal={proposal} 
                  user={user} 
                  onUpdate={fetchProposal} 
              />
          </div>

          <div className="space-y-6">
              {/* Reviewer: Vote & Comment */}
              <ReviewerSection 
                  proposal={proposal} 
                  user={user} 
                  onUpdate={fetchProposal} 
              />
          </div>
      </div>
    </div>
  );
};

export default ProposalDetail;
