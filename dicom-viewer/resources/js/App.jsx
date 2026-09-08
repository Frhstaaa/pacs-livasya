import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, Users, Monitor, Settings, LogOut, Upload, Shield, Activity, Network } from 'lucide-react';
import Viewer from './pages/Viewer';
import PatientList from './pages/PatientList';
import Login from './pages/Login';
import UploadDICOM from './pages/Upload';
import RouterIntegration from './pages/RouterIntegration';
import SuperadminPanel from './pages/SuperadminPanel';
import TatDashboard from './pages/TatDashboard';
import IntegrationPanel from './pages/IntegrationPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';

function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const { appName, appLogo } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ to, icon: Icon, label, mobileOnly = false, desktopOnly = false }) => {
    const active = isActive(to);
    return (
      <Link 
        to={to} 
        className={`flex flex-col md:flex-row items-center justify-center md:justify-start px-2 py-2 md:px-3.5 md:py-2.5 mx-1 md:mx-2.5 rounded-xl transition-all duration-200 ${
          active 
            ? 'bg-sky-500/15 text-sky-400 font-semibold border-l-2 border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)]' 
            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 font-medium'
        } ${mobileOnly ? 'md:hidden' : ''} ${desktopOnly ? 'hidden md:flex' : ''}`}
      >
        <Icon className={`w-5 h-5 md:w-4.5 md:h-4.5 shrink-0 ${active ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]' : 'text-slate-400'}`} />
        <span className="text-[10px] md:text-xs tracking-wide mt-1 md:mt-0 md:ml-3">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-[#0b0f19] text-slate-100 font-sans selection:bg-sky-500/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[#1e293b] bg-[#0e1424] z-50 shadow-2xl shrink-0">
        
        {/* Hospital Branding Header */}
        <div className="h-18 flex items-center px-5 border-b border-[#1e293b] bg-[#11192e]/50">
          {appLogo ? (
            <img src={appLogo} alt="App Logo" className="h-9 w-auto rounded object-contain" />
          ) : (
            <div className="bg-gradient-to-tr from-sky-600 to-blue-600 p-2 rounded-xl shadow-[0_0_12px_rgba(14,165,233,0.3)]">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="ml-3 flex flex-col flex-1 overflow-hidden">
            <span className="font-extrabold text-base text-white tracking-tight truncate leading-tight" title={appName}>
              {appName || 'DICOM PACS'}
            </span>
            <span className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase truncate mt-0.5">
              RSIA Livasya Majalengka
            </span>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 py-5 flex flex-col gap-1.5 overflow-y-auto">
          <div className="px-5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Alur Klinis (Workflow)
          </div>
          
          {can('patients.view') && (
            <NavItem to="/" icon={Users} label="Daftar Pasien" />
          )}
          
          {can('dicom.upload') && (
            <NavItem to="/upload" icon={Upload} label="Unggah DICOM" />
          )}

          {can('viewer.view') && (
            <NavItem to="/viewer" icon={Monitor} label="Radiology Viewer" />
          )}
          
          {can('tat.view') && (
            <NavItem to="/tat" icon={Activity} label="Dashboard Kinerja TAT" />
          )}

          {(user?.role === 'superadmin' || can('users.view') || can('permissions.manage') || can('integration.view') || can('router.view')) && (
            <>
              <div className="px-5 mt-5 mb-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Administrasi Sistem
              </div>
              {(user?.role === 'superadmin' || can('users.view') || can('permissions.manage')) && (
                <NavItem to="/superadmin" icon={Shield} label="Pengguna & Hak Akses" />
              )}
              {(user?.role === 'superadmin' || can('integration.view')) && (
                <NavItem to="/integration" icon={Network} label="Integrasi SIMRS & FHIR" />
              )}
              {(user?.role === 'superadmin' || can('router.view')) && (
                <NavItem to="/router" icon={Settings} label="Integrasi PACS Router" />
              )}
            </>
          )}
        </nav>
        
        {/* User Profile & Logout Box */}
        <div className="p-3.5 border-t border-[#1e293b] bg-[#0c1220]">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2 shadow-sm mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0e1424]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate">{user?.name}</div>
                <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">
                  {user?.role}
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-4 h-15 shrink-0 bg-[#0e1424] border-b border-[#1e293b] z-40 shadow-lg relative">
        <div className="flex items-center">
          {appLogo ? (
            <img src={appLogo} alt="App Logo" className="h-7 w-auto rounded object-contain" />
          ) : (
            <div className="bg-gradient-to-tr from-sky-600 to-blue-600 p-1.5 rounded-lg shadow-sm">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="ml-2.5 flex flex-col">
            <span className="font-bold text-sm text-white tracking-tight leading-tight">{appName}</span>
            <span className="text-[9px] text-sky-400 font-semibold uppercase tracking-wider">RSIA Livasya</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-200 max-w-[80px] truncate">{user?.name}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative pb-16 md:pb-0 z-0 bg-[#0b0f19]">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-15 bg-[#0e1424]/95 backdrop-blur-xl border-t border-[#1e293b] flex items-center justify-around z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {can('patients.view') && <NavItem to="/" icon={Users} label="Pasien" />}
        {can('dicom.upload') && <NavItem to="/upload" icon={Upload} label="Unggah" />}
        {can('viewer.view') && <NavItem to="/viewer" icon={Monitor} label="Viewer" />}
        {can('tat.view') && <NavItem to="/tat" icon={Activity} label="TAT" />}
        {(user?.role === 'superadmin' || can('users.view') || can('permissions.manage')) && (
          <NavItem to="/superadmin" icon={Shield} label="Admin" />
        )}
        
        <button onClick={handleLogout} className="flex flex-col items-center justify-center px-2 py-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-medium mt-0.5">Keluar</span>
        </button>
      </nav>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#333] border-t-[#00e5ff] rounded-full animate-spin shadow-[0_0_15px_rgba(0,229,255,0.5)] mb-4"></div>
        <div className="text-sm text-[#888] font-medium tracking-widest uppercase">Initializing...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* General Protected Routes */}
      <Route element={<ProtectedRoute requiredPermission="patients.view" />}>
        <Route path="/" element={<Layout><PatientList /></Layout>} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="viewer.view" />}>
        <Route path="/viewer/:uuid?" element={<Layout><Viewer /></Layout>} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="tat.view" />}>
        <Route path="/tat" element={<Layout><TatDashboard /></Layout>} />
      </Route>

      {/* Upload DICOM */}
      <Route element={<ProtectedRoute requiredPermission="dicom.upload" />}>
        <Route path="/upload" element={<Layout><UploadDICOM /></Layout>} />
      </Route>

      {/* Administration & Integrations */}
      <Route element={<ProtectedRoute requiredPermission="users.view" />}>
        <Route path="/superadmin" element={<Layout><SuperadminPanel /></Layout>} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="integration.view" />}>
        <Route path="/integration" element={<Layout><IntegrationPanel /></Layout>} />
      </Route>
      <Route element={<ProtectedRoute requiredPermission="router.view" />}>
        <Route path="/router" element={<Layout><RouterIntegration /></Layout>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </AppProvider>
  );
}
