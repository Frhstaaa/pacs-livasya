import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, Users, Monitor, Settings, LogOut, Upload, Shield } from 'lucide-react';
import Viewer from './pages/Viewer';
import PatientList from './pages/PatientList';
import Login from './pages/Login';
import UploadDICOM from './pages/Upload';
import RouterIntegration from './pages/RouterIntegration';
import SuperadminPanel from './pages/SuperadminPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';

function Layout({ children }) {
  const { user, logout } = useAuth();
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
        className={`flex flex-col md:flex-row items-center justify-center md:justify-start px-2 py-2 md:px-4 md:py-3 mx-1 md:mx-3 rounded-xl transition-all duration-300 ${
          active ? 'bg-gradient-to-r from-[#00e5ff]/20 to-transparent text-[#00e5ff] md:border-l-4 md:border-[#00e5ff]' : 'text-[#888] hover:bg-white/5 hover:text-white'
        } ${mobileOnly ? 'md:hidden' : ''} ${desktopOnly ? 'hidden md:flex' : ''}`}
      >
        <Icon className={`w-6 h-6 md:w-5 md:h-5 ${active ? 'text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]' : ''}`} />
        <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0 md:ml-3 tracking-wide">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-[#050505] text-gray-200 font-sans selection:bg-[#00e5ff]/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl z-50 shadow-2xl">
        <div className="h-20 flex items-center px-6 border-b border-white/5 bg-gradient-to-r from-transparent to-[#00e5ff]/5">
          {appLogo ? (
            <img src={appLogo} alt="App Logo" className="h-10 w-auto rounded object-contain shadow-[0_0_15px_rgba(0,229,255,0.4)]" />
          ) : (
            <div className="bg-gradient-to-br from-[#00e5ff] to-[#0077ff] p-2 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.4)]">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="ml-3 flex flex-col flex-1 overflow-hidden">
            <span className="font-extrabold text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-white to-[#aaa] tracking-tight truncate leading-tight" title={appName}>{appName}</span>
            <span className="text-[10px] text-[#00e5ff] uppercase tracking-widest font-bold truncate mt-0.5">Rumah Sakit Livasya</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto">
          <div className="px-6 mb-2 text-xs font-bold text-[#555] uppercase tracking-widest">Main Menu</div>
          <NavItem to="/" icon={Users} label="Patients" />
          
          {(user?.role === 'nurse' || user?.role === 'superadmin') && (
            <NavItem to="/upload" icon={Upload} label="Upload" />
          )}

          <NavItem to="/viewer" icon={Monitor} label="Viewer" />

          {user?.role === 'superadmin' && (
            <>
              <div className="px-6 mt-6 mb-2 text-xs font-bold text-[#555] uppercase tracking-widest">Administration</div>
              <NavItem to="/superadmin" icon={Shield} label="User Roles" />
              <NavItem to="/router" icon={Settings} label="Router Setup" />
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-white/5 bg-black/40">
          <div className="px-3 py-2 bg-white/5 rounded-xl mb-2 flex items-center border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e5ff] to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(0,229,255,0.3)]">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-[#00e5ff] uppercase tracking-wider font-bold">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-bold text-sm border border-red-500/20 shadow-lg">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 shrink-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 z-40 shadow-lg relative">
        <div className="flex items-center">
          {appLogo ? (
            <img src={appLogo} alt="App Logo" className="h-8 w-auto rounded object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
          ) : (
            <div className="bg-gradient-to-br from-[#00e5ff] to-[#0077ff] p-1.5 rounded-lg shadow-[0_0_10px_rgba(0,229,255,0.4)]">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="ml-2.5 flex flex-col">
            <span className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-[#aaa] tracking-tight leading-tight">{appName}</span>
            <span className="text-[9px] text-[#00e5ff] uppercase tracking-widest font-bold leading-none mt-0.5">Rumah Sakit Livasya</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 pr-3 pl-1.5 py-1.5 rounded-full border border-white/10 shadow-inner">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00e5ff] to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs font-bold text-white max-w-[80px] truncate tracking-wide">{user?.name}</div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative pb-16 md:pb-0 z-0">
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00e5ff]/5 rounded-full blur-[120px] pointer-events-none" />
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <NavItem to="/" icon={Users} label="Patients" />
        
        {(user?.role === 'nurse' || user?.role === 'superadmin') && (
          <NavItem to="/upload" icon={Upload} label="Upload" />
        )}
        
        <NavItem to="/viewer" icon={Monitor} label="Viewer" />

        {user?.role === 'superadmin' && (
          <NavItem to="/superadmin" icon={Shield} label="Admin" />
        )}
        
        <button onClick={handleLogout} className="flex flex-col items-center justify-center px-2 py-2 text-[#888] hover:text-red-400 transition-colors">
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Logout</span>
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
      
      {/* General Protected Routes (Any logged in user) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout><PatientList /></Layout>} />
        <Route path="/viewer/:uuid?" element={<Layout><Viewer /></Layout>} />
      </Route>

      {/* Nurse & Superadmin Routes (Upload capability) */}
      <Route element={<ProtectedRoute allowedRoles={['nurse', 'superadmin']} />}>
        <Route path="/upload" element={<Layout><UploadDICOM /></Layout>} />
      </Route>

      {/* Superadmin Only Routes */}
      <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
        <Route path="/superadmin" element={<Layout><SuperadminPanel /></Layout>} />
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
