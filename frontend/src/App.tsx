import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MockDbProvider, useMockDb } from './context/MockDbContext';
import Login from './pages/Login';
import JudgeDashboard from './pages/JudgeDashboard';
import LitigantPortal from './pages/LitigantPortal';
import CaseTracking from './pages/litigant/CaseTracking';
import FileCase from './pages/litigant/FileCase';
import Scheduling from './pages/judge/Scheduling';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import ModelMonitor from './pages/admin/ModelMonitor';
import LiveStatsBar from './components/LiveStatsBar';
import AIChatbot from './components/AIChatbot';
import { Scale, Gavel, Users, BarChart2, Briefcase, LogOut, Cpu } from 'lucide-react';

const AuthGuard: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { currentUser } = useMockDb();
  if (!currentUser) return <Navigate to="/login" />;
  if (!allowedRoles.includes(currentUser.role as string)) return <Navigate to="/login" />;
  return <>{children}</>;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
    isActive
      ? 'bg-judicial-600 text-white shadow-lg shadow-judicial-600/30'
      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
  }`;

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout } = useMockDb();
  if (!currentUser) return <>{children}</>;

  // Derive initials from name
  const initials = currentUser.name
    ? currentUser.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : currentUser.role?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <LiveStatsBar />
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-judicial-700 p-2 rounded-xl">
              <Scale size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-judicial-900 leading-none">Nyaya-Gati</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase leading-none mt-0.5">Judicial AI System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'judge' && (
              <>
                <NavLink to="/judge" className={navLinkClass}><Gavel size={16} /> Dashboard</NavLink>
                <NavLink to="/admin" className={navLinkClass}><BarChart2 size={16} /> Analytics</NavLink>
                <NavLink to="/admin/models" className={navLinkClass}><Cpu size={16} /> AI Models</NavLink>
              </>
            )}
            {currentUser.role === 'lawyer' && (
              <>
                <NavLink to="/lawyer" className={navLinkClass}><Briefcase size={16} /> My Cases</NavLink>
                <NavLink to="/lawyer/file" className={navLinkClass}><Scale size={16} /> File Petition</NavLink>
              </>
            )}
            {currentUser.role === 'litigant' && (
              <NavLink to="/litigant" className={navLinkClass}><Users size={16} /> My Cases</NavLink>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-judicial-800 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name || currentUser.role}</p>
                <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 relative">
        {children}
      </main>
      <AIChatbot />
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MockDbProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/*" element={
              <Layout>
                <Routes>
                  {/* Default redirect to login */}
                  <Route path="/" element={<Navigate to="/login" />} />
                  
                  {/* Judge Routes */}
                  <Route path="/judge" element={<AuthGuard allowedRoles={['judge']}><JudgeDashboard /></AuthGuard>} />
                  <Route path="/judge/scheduling" element={<AuthGuard allowedRoles={['judge']}><Scheduling /></AuthGuard>} />
                  <Route path="/admin" element={<AuthGuard allowedRoles={['judge']}><AnalyticsDashboard /></AuthGuard>} />
                  <Route path="/admin/models" element={<AuthGuard allowedRoles={['judge']}><ModelMonitor /></AuthGuard>} />
                  
                  {/* Lawyer Routes */}
                  <Route path="/lawyer" element={<AuthGuard allowedRoles={['lawyer']}><LitigantPortal isLawyer={true} /></AuthGuard>} />
                  <Route path="/lawyer/file" element={<AuthGuard allowedRoles={['lawyer']}><FileCase /></AuthGuard>} />
                  <Route path="/lawyer/case/*" element={<AuthGuard allowedRoles={['lawyer']}><CaseTracking /></AuthGuard>} />
                  <Route path="/lawyer/case/:caseNumber" element={<AuthGuard allowedRoles={['lawyer']}><CaseTracking /></AuthGuard>} />
                  
                  {/* Litigant Routes */}
                  <Route path="/litigant" element={<AuthGuard allowedRoles={['litigant']}><LitigantPortal isLawyer={false} /></AuthGuard>} />
                  <Route path="/litigant/case/*" element={<AuthGuard allowedRoles={['litigant']}><CaseTracking /></AuthGuard>} />
                  <Route path="/litigant/case/:caseNumber" element={<AuthGuard allowedRoles={['litigant']}><CaseTracking /></AuthGuard>} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </BrowserRouter>
      </MockDbProvider>
    </QueryClientProvider>
  );
}

export default App;
