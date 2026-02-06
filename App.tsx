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
import { db } from './services/mockDatabase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('auth');
  const [pageParams, setPageParams] = useState<any>({});
  const [user, setUser] = useState(db.currentUser);

  const handleLogin = () => {
    setUser(db.currentUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    setCurrentPage('auth');
  };

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    if (params) setPageParams(params);
  };

  // Guard logic: Redirect to auth if not logged in AND not visiting a public page (manual)
  useEffect(() => {
    if (!user && currentPage !== 'auth' && currentPage !== 'manual') {
      setCurrentPage('auth');
    }
  }, [user, currentPage]);

  if (currentPage === 'auth') {
    return <Auth onLogin={handleLogin} onNavigateManual={() => handleNavigate('manual')} />;
  }

  // If viewing manual without login, wrap in a simple container or reuse Layout structure (Layout handles !user gracefully)
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