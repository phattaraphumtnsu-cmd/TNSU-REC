
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import SubmissionForm from './pages/SubmissionForm';
import ProposalDetail from './pages/ProposalDetail';
import Reports from './pages/Reports';
import UserProfile from './pages/UserProfile';
import UserManagement from './pages/UserManagement';
import UserManual from './pages/UserManual';
import CertificateView from './pages/CertificateView';
import { db } from './services/database';
import { User } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('auth');
  const [pageParams, setPageParams] = useState<any>({});
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Session (Mock)
  useEffect(() => {
    const checkSession = async () => {
       const savedUser = db.restoreSession();
       if (savedUser) {
           setUser(savedUser);
           if (currentPage === 'auth') {
               setCurrentPage('dashboard');
           }
       }
       setLoading(false);
    };
    checkSession();
  }, [currentPage]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await db.logout();
    setUser(null);
    setCurrentPage('auth');
  };

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    if (params) setPageParams(params);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-blue-600">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (currentPage === 'auth') {
    return <Auth onLogin={handleLogin} onNavigateManual={() => handleNavigate('manual')} />;
  }
  
  // Standalone page for printing certificate (no layout)
  if (currentPage === 'certificate') {
     return <CertificateView id={pageParams.id} onNavigate={handleNavigate} />;
  }

  return (
    <Layout onLogout={handleLogout} currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {currentPage === 'submit' && <SubmissionForm onNavigate={handleNavigate} />}
      {currentPage === 'proposal' && <ProposalDetail id={pageParams.id} onNavigate={handleNavigate} />}
      {currentPage === 'reports' && <Reports />}
      {currentPage === 'profile' && <UserProfile />}
      {currentPage === 'users' && <UserManagement />}
      {currentPage === 'manual' && <UserManual onNavigate={handleNavigate} />}
    </Layout>
  );
};

export default App;
