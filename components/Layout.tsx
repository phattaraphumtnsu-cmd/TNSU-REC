

import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Role, Permission, hasPermission, Notification } from '../types';
import { LogOut, Home, FilePlus, Users, BarChart, UserCircle, HelpCircle, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, currentPage, onNavigate }) => {
  const user = db.currentUser;
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Refresh notifications periodically
  useEffect(() => {
    if(!user) return;
    
    const fetchNotifs = async () => {
        try {
            const data = await db.getNotifications(user.id);
            setNotifications(data);
        } catch (e) {
            console.error("Failed to load notifications");
        }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);
  
  if (!user) return <>{children}</>;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (link?: string) => {
      await db.markAsRead(user.id);
      const updated = await db.getNotifications(user.id);
      setNotifications(updated);
      setShowNotifications(false);
      if(link) {
          const [page, search] = link.split('?');
          const params = new URLSearchParams(search);
          onNavigate(page, { id: params.get('id') });
      }
  };

  const NavItem = ({ page, icon: Icon, label }: { page: string, icon: any, label: string }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`flex items-center space-x-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
        currentPage === page 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-0.5">
               <img 
                 src="https://lh3.googleusercontent.com/d/1cRjmEPgytoyDLRYvoegnN3OaqrayaF-c" 
                 alt="Logo" 
                 className="w-full h-full object-contain" 
                 referrerPolicy="no-referrer"
               />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TNSU-REC</h1>
          </div>
          <p className="text-xs text-slate-400 mt-2">ระบบจริยธรรมการวิจัยในมนุษย์</p>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <NavItem page="dashboard" icon={Home} label="แดชบอร์ด" />
          
          {hasPermission(user.roles, Permission.SUBMIT_PROPOSAL) && (
            <NavItem page="submit" icon={FilePlus} label="ยื่นคำขอใหม่" />
          )}

          {hasPermission(user.roles, Permission.MANAGE_USERS) && (
            <NavItem page="users" icon={Users} label="จัดการผู้ใช้งาน" />
          )}

          {hasPermission(user.roles, Permission.VIEW_REPORTS) && (
            <NavItem page="reports" icon={BarChart} label="รายงานสถิติ" />
          )}

          <NavItem page="profile" icon={UserCircle} label="ข้อมูลส่วนตัว" />
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavItem page="manual" icon={HelpCircle} label="คู่มือการใช้งาน" />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center mb-3">
             <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
             </div>
             <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                    {user.roles.map(r => (
                        <span key={r} className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 capitalize">{r}</span>
                    ))}
                </div>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-red-400 hover:text-red-300 text-sm w-full pt-2"
          >
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar for Mobile/Notifications */}
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-end px-8 shrink-0 relative">
             <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors"
                >
                   <Bell size={20} />
                   {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                   )}
                </button>

                {showNotifications && (
                   <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                         <h3 className="font-semibold text-sm text-slate-800">การแจ้งเตือน</h3>
                         {unreadCount > 0 && (
                            <button onClick={async () => { 
                                await db.markAsRead(user.id); 
                                const u = await db.getNotifications(user.id);
                                setNotifications(u);
                            }} className="text-xs text-blue-600 hover:underline">อ่านทั้งหมด</button>
                         )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                         {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">ไม่มีการแจ้งเตือน</div>
                         ) : (
                            notifications.map(n => (
                               <div key={n.id} onClick={() => handleNotificationClick(n.link)} 
                                  className={`p-4 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                               >
                                  <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.message}</p>
                                  <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                               </div>
                            ))
                         )}
                      </div>
                   </div>
                )}
             </div>
          </header>

          <main className="flex-1 overflow-auto p-8">
             {children}
          </main>
      </div>
    </div>
  );
};

export default Layout;
