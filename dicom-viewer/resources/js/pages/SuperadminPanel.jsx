import React, { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import { 
  Shield, ShieldCheck, UserPlus, Edit2, Trash2, CheckCircle, AlertCircle, 
  RefreshCw, Search, Filter, SearchX, LayoutTemplate, 
  Image as ImageIcon, Save, Upload, User, Mail, Lock, 
  CheckCircle2, Eye, EyeOff, Users, Stethoscope, UserCheck,
  FileSignature, X, Sparkles, Key, RotateCcw, CheckSquare, 
  Square, Sliders, Check, ChevronRight, Info
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'permissions', or 'settings'
  const { refetchUser } = useAuth();
  
  // User Management State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('nurse');
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  // App Customization State
  const { appName, hospitalName, appLogo, refreshSettings } = useAppContext();
  const [settingAppName, setSettingAppName] = useState('');
  const [settingHospitalName, setSettingHospitalName] = useState('');
  const [settingLogoFile, setSettingLogoFile] = useState(null);
  const [settingLogoPreview, setSettingLogoPreview] = useState(null);
  const [settingMessage, setSettingMessage] = useState({ type: '', text: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef(null);

  // Role & Permissions (RBAC) State
  const [permData, setPermData] = useState({ modules: {}, all_permissions: [], roles: [], role_permissions: {} });
  const [roleMatrix, setRoleMatrix] = useState({});
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permMessage, setPermMessage] = useState({ type: '', text: '' });
  const [permSearch, setPermSearch] = useState('');
  const [permSubTab, setPermSubTab] = useState('roles'); // 'roles' or 'users'

  // Per-User Override State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [userOverrides, setUserOverrides] = useState({});
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      setSettingAppName(appName || '');
      setSettingHospitalName(hospitalName || '');
      setSettingLogoPreview(appLogo || null);
      setSettingMessage({ type: '', text: '' });
    } else if (activeTab === 'permissions') {
      fetchPermissions();
    }
  }, [activeTab, appName, hospitalName, appLogo]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserOverrides(selectedUserId);
    } else {
      setSelectedUserData(null);
      setUserOverrides({});
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
      if (res.data.length > 0 && !selectedUserId) {
        setSelectedUserId(res.data[0].id.toString());
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memuat daftar pengguna sistem.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setPermLoading(true);
    try {
      const res = await axios.get('/permissions');
      setPermData(res.data);
      setRoleMatrix(res.data.role_permissions || {});
    } catch (err) {
      setPermMessage({ type: 'error', text: 'Gagal memuat data hak akses dan peran.' });
    } finally {
      setPermLoading(false);
    }
  };

  const handleToggleRolePermission = (roleName, permId) => {
    if (roleName === 'superadmin') return; // Superadmin always full
    setRoleMatrix(prev => {
      const currentList = prev[roleName] || [];
      const has = currentList.includes(permId);
      const updated = has ? currentList.filter(id => id !== permId) : [...currentList, permId];
      return { ...prev, [roleName]: updated };
    });
  };

  const handleToggleModuleAll = (roleName, modulePerms, targetState) => {
    if (roleName === 'superadmin') return;
    setRoleMatrix(prev => {
      const currentList = new Set(prev[roleName] || []);
      modulePerms.forEach(p => {
        if (targetState) {
          currentList.add(p.id);
        } else {
          currentList.delete(p.id);
        }
      });
      return { ...prev, [roleName]: Array.from(currentList) };
    });
  };

  const handleSaveRoleMatrix = async () => {
    setPermSaving(true);
    setPermMessage({ type: '', text: '' });
    try {
      await axios.post('/permissions/roles', { matrix: roleMatrix });
      setPermMessage({ type: 'success', text: 'Matriks hak akses peran berhasil disimpan!' });
      refetchUser();
      fetchPermissions();
    } catch (err) {
      setPermMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan matriks peran.' });
    } finally {
      setPermSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Kembalikan seluruh hak akses peran ke standar klinis RSIA Livasya?')) return;
    setPermSaving(true);
    try {
      const res = await axios.post('/permissions/reset-defaults');
      setPermMessage({ type: 'success', text: res.data.message });
      refetchUser();
      fetchPermissions();
    } catch (err) {
      setPermMessage({ type: 'error', text: 'Gagal mereset matriks peran.' });
    } finally {
      setPermSaving(false);
    }
  };

  const fetchUserOverrides = async (userId) => {
    if (!userId) return;
    setOverrideLoading(true);
    setOverrideMessage({ type: '', text: '' });
    try {
      const res = await axios.get(`/permissions/users/${userId}`);
      setSelectedUserData(res.data);
      
      const overrideMap = {};
      (permData.all_permissions || []).forEach(p => {
        if (res.data.overrides && res.data.overrides[p.id] !== undefined) {
          overrideMap[p.id] = res.data.overrides[p.id] ? 'granted' : 'revoked';
        } else {
          overrideMap[p.id] = 'default';
        }
      });
      setUserOverrides(overrideMap);
    } catch (err) {
      setOverrideMessage({ type: 'error', text: 'Gagal memuat hak akses pengguna.' });
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleSetUserOverride = (permId, status) => {
    setUserOverrides(prev => ({
      ...prev,
      [permId]: status,
    }));
  };

  const handleResetAllUserOverrides = () => {
    const resetMap = {};
    (permData.all_permissions || []).forEach(p => {
      resetMap[p.id] = 'default';
    });
    setUserOverrides(resetMap);
  };

  const handleSaveUserOverrides = async () => {
    if (!selectedUserId) return;
    setOverrideSaving(true);
    setOverrideMessage({ type: '', text: '' });
    try {
      const res = await axios.post(`/permissions/users/${selectedUserId}`, { overrides: userOverrides });
      setOverrideMessage({ type: 'success', text: res.data.message });
      refetchUser();
      fetchUserOverrides(selectedUserId);
    } catch (err) {
      setOverrideMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan override pengguna.' });
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', role);
      if (password) formData.append('password', password);
      if (signatureFile) formData.append('signature', signatureFile);

      if (isEditing) {
        formData.append('_method', 'PUT');
        await axios.post(`/users/${currentId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage({ type: 'success', text: 'Data pengguna berhasil diperbarui!' });
      } else {
        await axios.post('/users', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage({ type: 'success', text: 'Pengguna baru berhasil ditambahkan!' });
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan data pengguna.' });
    }
  };

  const handleEdit = (user) => {
    setIsEditing(true);
    setCurrentId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword('');
    setSignatureFile(null);
    setSignaturePreview(user.signature_url || null);
  };

  const handleDelete = async (id, userName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    try {
      await axios.delete(`/users/${id}`);
      setMessage({ type: 'success', text: `Pengguna "${userName}" berhasil dihapus!` });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menghapus pengguna.' });
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('nurse');
    setSignatureFile(null);
    setSignaturePreview(null);
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSettingLogoFile(file);
      setSettingLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('app_name', settingAppName);
    formData.append('hospital_name', settingHospitalName);
    if (settingLogoFile) {
      formData.append('logo', settingLogoFile);
    }

    try {
      await axios.post('/app/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettingMessage({ type: 'success', text: 'Pengaturan identitas aplikasi berhasil disimpan!' });
      refreshSettings();
    } catch (err) {
      setSettingMessage({ type: 'error', text: 'Gagal menyimpan pengaturan aplikasi.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'superadmin':
        return {
          label: 'Super Administrator',
          classes: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          icon: Shield,
        };
      case 'doctor':
        return {
          label: 'Dokter Spesialis Radiologi',
          classes: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
          icon: Stethoscope,
        };
      case 'radiographer':
        return {
          label: 'Radiografer Modalitas',
          classes: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
          icon: UserCheck,
        };
      case 'nurse':
      default:
        return {
          label: 'Perawat / Staf Administrasi',
          classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: User,
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-100 overflow-y-auto font-sans">
      
      {/* Top Banner / Header */}
      <div className="border-b border-slate-800 bg-[#0e1424]/90 backdrop-blur-xl px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Shield className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Kelola Pengguna & <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">Hak Akses</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider uppercase">
                  Administrasi Sistem
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manajemen akun staf radiologi, matriks izin peran (*Role Matrix*), dan override akses individual
              </p>
            </div>
          </div>

          {/* Segmented Tab Switcher (3 Tabs) */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-auto shadow-sm">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'users' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pengguna</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {users.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'permissions' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Hak Akses & Peran (RBAC)</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Kustomisasi RS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 flex-1 max-w-7xl w-full mx-auto space-y-6">

        {/* TAB 1: User Management */}
        {activeTab === 'users' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Side: Users List */}
            <div className="flex-1 w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col space-y-5">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    Daftar Pengguna Sistem ({filteredUsers.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Seluruh akun yang terdaftar untuk mengakses PACS / RIS.</p>
                </div>

                <button 
                  onClick={fetchUsers} 
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer self-end sm:self-auto"
                  title="Segarkan Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {/* Notification Message */}
              {message.text && (
                <div className={`p-4 rounded-xl flex items-center text-xs font-bold border transition-all ${
                  message.type === 'error' 
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}>
                  {message.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 mr-2.5 shrink-0 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2.5 shrink-0 text-emerald-400" />
                  )}
                  <span>{message.text}</span>
                  <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau email..."
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <select 
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-all cursor-pointer font-medium"
                  >
                    <option value="all" className="bg-[#111827]">Semua Peran</option>
                    <option value="doctor" className="bg-[#111827]">Dokter Spesialis Radiologi</option>
                    <option value="radiographer" className="bg-[#111827]">Radiografer</option>
                    <option value="nurse" className="bg-[#111827]">Perawat / Staf Administrasi</option>
                    <option value="superadmin" className="bg-[#111827]">Super Administrator</option>
                  </select>
                </div>
              </div>

              {/* User List Cards */}
              <div className="space-y-2.5 overflow-y-auto max-h-[550px] pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                    <SearchX className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">Tidak ada pengguna yang sesuai.</p>
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const badge = getRoleBadge(u.role);
                    const BadgeIcon = badge.icon;
                    return (
                      <div 
                        key={u.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          currentId === u.id 
                            ? 'bg-sky-500/10 border-sky-500/40 shadow-sm shadow-sky-500/10' 
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-white truncate">{u.name}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${badge.classes}`}>
                                <BadgeIcon className="w-2.5 h-2.5" />
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <Mail className="w-3 h-3 shrink-0 text-slate-500" />
                              <span className="truncate">{u.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {u.signature_url && (
                            <div className="hidden sm:flex w-10 h-7 bg-white/5 border border-slate-700 rounded items-center justify-center p-0.5" title="Tanda Tangan Digital Terpasang">
                              <img src={u.signature_url} alt="TTD" className="max-h-full max-w-full object-contain filter invert opacity-80" />
                            </div>
                          )}

                          <button 
                            onClick={() => handleEdit(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-400 border border-slate-700/60 transition-colors cursor-pointer"
                            title="Ubah Profil"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={() => handleDelete(u.id, u.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 transition-colors cursor-pointer"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Add / Edit User Form */}
            <div className="w-full lg:w-[380px] bg-[#111827] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    {isEditing ? <Edit2 className="w-4 h-4 text-sky-400" /> : <UserPlus className="w-4 h-4 text-sky-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isEditing ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'}
                    </h3>
                    <p className="text-[10px] text-slate-400">Akun akses klinis PACS/RIS</p>
                  </div>
                </div>

                {isEditing && (
                  <button 
                    onClick={resetForm}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nama Lengkap & Gelar *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. dr. Ahmad Fauzi, Sp.Rad"
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all font-medium"
                      required 
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Alamat Email (Login) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. dokter.radiologi@livasya.com"
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all font-medium"
                      required 
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Kata Sandi (Password) *</span>
                    {isEditing && (
                      <span className="text-[10px] text-amber-400 font-normal">
                        Kosongkan jika tidak diubah
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isEditing ? '•••••••• (Tetap sama)' : 'Minimal 6 karakter'}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                      required={!isEditing}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Peran & Otoritas Akses *
                  </label>
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-all cursor-pointer font-medium"
                  >
                    <option value="nurse" className="bg-[#111827]">Perawat / Staf Administrasi (Worklist & Cetak)</option>
                    <option value="radiographer" className="bg-[#111827]">Radiografer (Modalitas, Upload DICOM, Router)</option>
                    <option value="doctor" className="bg-[#111827]">Dokter Spesialis Radiologi (Diagnosis, AI, & Verifikasi)</option>
                    <option value="superadmin" className="bg-[#111827]">Super Administrator (Akses Penuh Seluruh Sistem)</option>
                  </select>
                </div>
                
                {/* Doctor's Signature Upload */}
                {role === 'doctor' && (
                  <div className="rounded-xl p-3.5 bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300">
                        Tanda Tangan Elektronik Dokter
                      </label>
                      <span className="text-[10px] text-sky-400 font-semibold">Format .PNG Transparan</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {signaturePreview && (
                        <div className="w-20 h-12 bg-white/10 border border-slate-700 rounded-lg flex items-center justify-center p-1 shrink-0">
                          <img src={signaturePreview} alt="Signature Preview" className="max-h-full max-w-full object-contain filter invert" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg"
                        onChange={handleSignatureChange}
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 transition-all cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Digunakan pada lembar cetak hasil ekspertise resmi yang terverifikasi digital.
                    </p>
                  </div>
                )}

                {/* Form Action Buttons */}
                <div className="pt-2 flex gap-3">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Simpan Perubahan' : 'Daftarkan Pengguna'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Role & Permission Management (RBAC & Per-User Overrides) */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            
            {/* Perm Sub-tab Switcher & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setPermSubTab('roles')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    permSubTab === 'roles' 
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Matriks Peran (Role Matrix)</span>
                </button>

                <button
                  onClick={() => setPermSubTab('users')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    permSubTab === 'users' 
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Override Hak Akses Per-User</span>
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                <input 
                  type="text"
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                  placeholder="Filter izin atau modul..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                {permSearch && (
                  <button onClick={() => setPermSearch('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Notification Message */}
            {permMessage.text && (
              <div className={`p-4 rounded-xl flex items-center text-xs font-bold border transition-all ${
                permMessage.type === 'error' 
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {permMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 mr-2.5 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2.5 shrink-0 text-emerald-400" />
                )}
                <span>{permMessage.text}</span>
                <button onClick={() => setPermMessage({ type: '', text: '' })} className="ml-auto text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* SUB-TAB 1: Role Permissions Matrix */}
            {permSubTab === 'roles' && (
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                
                {/* Header & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-sky-400" />
                      Matriks Hak Akses Grup Peran
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Centang izin yang diberikan untuk masing-masing grup peran staf. Pengguna dengan peran tersebut otomatis mendapatkan izin terkait.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleResetDefaults}
                      disabled={permSaving || permLoading}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      title="Kembalikan semua peran ke setelan rekomendasi medis"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Default Standar Klinis</span>
                    </button>

                    <button
                      onClick={handleSaveRoleMatrix}
                      disabled={permSaving || permLoading}
                      className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{permSaving ? 'Menyimpan...' : 'Simpan Matriks Peran'}</span>
                    </button>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="p-3.5 rounded-l-xl">Fitur & Izin Medis</th>
                        <th className="p-3.5">Kode Izin (*Slug*)</th>
                        <th className="p-3.5 text-center text-purple-400 bg-purple-500/5">
                          Superadmin (Penuh)
                        </th>
                        <th className="p-3.5 text-center text-sky-400 bg-sky-500/5">
                          Dokter Sp.Rad
                        </th>
                        <th className="p-3.5 text-center text-cyan-400 bg-cyan-500/5">
                          Radiografer
                        </th>
                        <th className="p-3.5 text-center text-emerald-400 bg-emerald-500/5 rounded-r-xl">
                          Perawat / Staf
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {Object.keys(permData.modules || {}).map(moduleName => {
                        const modulePerms = (permData.modules[moduleName] || []).filter(p => {
                          if (!permSearch) return true;
                          const q = permSearch.toLowerCase();
                          return p.label.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.module.toLowerCase().includes(q);
                        });

                        if (modulePerms.length === 0) return null;

                        return (
                          <React.Fragment key={moduleName}>
                            {/* Module Header Row */}
                            <tr className="bg-slate-900/90 font-bold text-white border-t-2 border-slate-800">
                              <td colSpan={2} className="py-2.5 px-3.5 text-xs text-sky-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-400" />
                                <span>{moduleName}</span>
                                <span className="text-[10px] text-slate-500 font-mono font-normal">({modulePerms.length} aksi)</span>
                              </td>
                              <td className="text-center text-[10px] text-purple-400 font-mono bg-purple-500/5">
                                Kunci Permanen
                              </td>
                              <td className="text-center bg-sky-500/5">
                                <div className="flex justify-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll('doctor', modulePerms, true)}
                                    className="text-sky-400 hover:underline cursor-pointer"
                                  >
                                    Semua
                                  </button>
                                  <span className="text-slate-600">/</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll('doctor', modulePerms, false)}
                                    className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                  >
                                    Kosongkan
                                  </button>
                                </div>
                              </td>
                              <td className="text-center bg-cyan-500/5">
                                <div className="flex justify-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll('radiographer', modulePerms, true)}
                                    className="text-cyan-400 hover:underline cursor-pointer"
                                  >
                                    Semua
                                  </button>
                                  <span className="text-slate-600">/</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll('radiographer', modulePerms, false)}
                                    className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                  >
                                    Kosongkan
                                  </button>
                                </div>
                              </td>
                              <td className="text-center bg-emerald-500/5">
                                <div className="flex justify-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll('nurse', modulePerms, true)}
                                    className="text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    Semua
                                  </button>
                                  <span className="text-slate-600">/</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll('nurse', modulePerms, false)}
                                    className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                  >
                                    Kosongkan
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Permission Rows */}
                            {modulePerms.map(p => {
                              const isDoc = (roleMatrix['doctor'] || []).includes(p.id);
                              const isRad = (roleMatrix['radiographer'] || []).includes(p.id);
                              const isNurse = (roleMatrix['nurse'] || []).includes(p.id);

                              return (
                                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                                  <td className="p-3.5">
                                    <div className="font-bold text-white text-xs">{p.label}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{p.description}</div>
                                  </td>
                                  <td className="p-3.5">
                                    <code className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-sky-400 border border-slate-800">
                                      {p.name}
                                    </code>
                                  </td>

                                  {/* Superadmin Check (Always ON & Disabled) */}
                                  <td className="p-3.5 text-center bg-purple-500/5">
                                    <div className="flex justify-center">
                                      <div className="w-5 h-5 rounded bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 cursor-not-allowed">
                                        <Check className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Doctor Check */}
                                  <td className="p-3.5 text-center bg-sky-500/5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRolePermission('doctor', p.id)}
                                      className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all cursor-pointer ${
                                        isDoc 
                                          ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30' 
                                          : 'bg-slate-900 border-slate-700 text-transparent hover:border-slate-500'
                                      }`}
                                    >
                                      <Check className={`w-3.5 h-3.5 ${isDoc ? 'opacity-100' : 'opacity-0'}`} />
                                    </button>
                                  </td>

                                  {/* Radiographer Check */}
                                  <td className="p-3.5 text-center bg-cyan-500/5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRolePermission('radiographer', p.id)}
                                      className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all cursor-pointer ${
                                        isRad 
                                          ? 'bg-cyan-500 text-white border-cyan-400 shadow-sm shadow-cyan-500/30' 
                                          : 'bg-slate-900 border-slate-700 text-transparent hover:border-slate-500'
                                      }`}
                                    >
                                      <Check className={`w-3.5 h-3.5 ${isRad ? 'opacity-100' : 'opacity-0'}`} />
                                    </button>
                                  </td>

                                  {/* Nurse Check */}
                                  <td className="p-3.5 text-center bg-emerald-500/5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRolePermission('nurse', p.id)}
                                      className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-all cursor-pointer ${
                                        isNurse 
                                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/30' 
                                          : 'bg-slate-900 border-slate-700 text-transparent hover:border-slate-500'
                                      }`}
                                    >
                                      <Check className={`w-3.5 h-3.5 ${isNurse ? 'opacity-100' : 'opacity-0'}`} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: User Permission Overrides */}
            {permSubTab === 'users' && (
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                
                {/* User Selector Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-sky-400" />
                      Override Hak Akses Perorangan
                    </h3>
                    <p className="text-xs text-slate-400">
                      Berikan izin khusus (*Force Allow*) atau cabut izin (*Force Deny*) pada pengguna tertentu tanpa mengubah perannya.
                    </p>
                  </div>

                  {/* Dropdown User Selector */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Pilih Staf:</span>
                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold cursor-pointer min-w-[220px]"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected User Summary Banner */}
                {selectedUserData && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm">
                        {selectedUserData.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white">{selectedUserData.user.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(selectedUserData.user.role).classes}`}>
                            {getRoleBadge(selectedUserData.user.role).label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{selectedUserData.user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-bold text-sky-400">
                          {selectedUserData.effective_permissions?.length || 0} Izin Aktif
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {Object.values(userOverrides).filter(v => v !== 'default').length} Override Ditetapkan
                        </div>
                      </div>

                      <button
                        onClick={handleResetAllUserOverrides}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-semibold transition-all cursor-pointer"
                      >
                        Reset ke Default Peran
                      </button>

                      <button
                        onClick={handleSaveUserOverrides}
                        disabled={overrideSaving || overrideLoading}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{overrideSaving ? 'Menyimpan...' : 'Simpan Override'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Overrides Feedback Message */}
                {overrideMessage.text && (
                  <div className={`p-4 rounded-xl flex items-center text-xs font-bold border transition-all ${
                    overrideMessage.type === 'error' 
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {overrideMessage.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 mr-2.5 shrink-0 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2.5 shrink-0 text-emerald-400" />
                    )}
                    <span>{overrideMessage.text}</span>
                  </div>
                )}

                {/* Overrides Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="p-3.5 rounded-l-xl">Izin / Fitur Medis</th>
                        <th className="p-3.5">Status Bawaan Peran</th>
                        <th className="p-3.5 text-center rounded-r-xl">Setelan Akses Pengguna Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {Object.keys(permData.modules || {}).map(moduleName => {
                        const modulePerms = (permData.modules[moduleName] || []).filter(p => {
                          if (!permSearch) return true;
                          const q = permSearch.toLowerCase();
                          return p.label.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.module.toLowerCase().includes(q);
                        });

                        if (modulePerms.length === 0) return null;

                        return (
                          <React.Fragment key={moduleName}>
                            <tr className="bg-slate-900/90 font-bold text-white border-t-2 border-slate-800">
                              <td colSpan={3} className="py-2 px-3.5 text-xs text-sky-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-400" />
                                <span>{moduleName}</span>
                              </td>
                            </tr>

                            {modulePerms.map(p => {
                              const roleGranted = (selectedUserData?.role_permission_ids || []).includes(p.id);
                              const currentSetting = userOverrides[p.id] || 'default';

                              return (
                                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                                  <td className="p-3.5">
                                    <div className="font-bold text-white text-xs">{p.label}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                      <span>{p.description}</span>
                                      <code className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-sky-400 border border-slate-800">
                                        {p.name}
                                      </code>
                                    </div>
                                  </td>

                                  <td className="p-3.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      roleGranted 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                    }`}>
                                      {roleGranted ? 'Diizinkan oleh Peran' : 'Tidak Diizinkan'}
                                    </span>
                                  </td>

                                  <td className="p-3.5 text-center">
                                    <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
                                      {/* Default */}
                                      <button
                                        type="button"
                                        onClick={() => handleSetUserOverride(p.id, 'default')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          currentSetting === 'default' 
                                            ? 'bg-slate-700 text-white shadow-sm' 
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        Ikuti Peran
                                      </button>

                                      {/* Force Allow */}
                                      <button
                                        type="button"
                                        onClick={() => handleSetUserOverride(p.id, 'granted')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          currentSetting === 'granted' 
                                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' 
                                            : 'text-emerald-400 hover:bg-emerald-500/10'
                                        }`}
                                      >
                                        Paksa Izinkan (Force Allow)
                                      </button>

                                      {/* Force Deny */}
                                      <button
                                        type="button"
                                        onClick={() => handleSetUserOverride(p.id, 'revoked')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          currentSetting === 'revoked' 
                                            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30' 
                                            : 'text-rose-400 hover:bg-rose-500/10'
                                        }`}
                                      >
                                        Paksa Cabut (Force Deny)
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: App Customization */}
        {activeTab === 'settings' && (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl max-w-3xl">
            <div className="pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2.5">
                <LayoutTemplate className="w-5 h-5 text-sky-400" />
                Identitas Aplikasi & Rumah Sakit
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Kustomisasi nama instansi dan logo RSIA Livasya yang ditampilkan pada seluruh antarmuka aplikasi dan cetakan laporan.
              </p>
            </div>

            {/* Notification */}
            {settingMessage.text && (
              <div className={`p-4 rounded-xl flex items-center text-xs font-bold border mb-6 transition-all ${
                settingMessage.type === 'error' 
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {settingMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 mr-2.5 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2.5 shrink-0 text-emerald-400" />
                )}
                <span>{settingMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Live Header Preview */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pratinjau Langsung Tampilan Header</span>
                </div>
                <div className="flex items-center px-4 py-3 rounded-xl bg-[#0e1424] border border-[#1e293b] w-fit min-w-[260px] shadow-lg">
                  {settingLogoPreview ? (
                    <img src={settingLogoPreview} alt="App Logo" className="h-8 w-auto rounded object-contain" />
                  ) : (
                    <div className="bg-gradient-to-tr from-sky-600 to-blue-600 p-2 rounded-xl shadow-[0_0_12px_rgba(14,165,233,0.3)]">
                      <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="ml-3 flex flex-col min-w-0">
                    <span className="font-extrabold text-sm text-white tracking-tight leading-tight truncate">
                      {settingAppName || 'DICOM PACS'}
                    </span>
                    <span className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase truncate mt-0.5">
                      {settingHospitalName || 'RSIA Livasya Majalengka'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 2 Column for App Name and Hospital Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* App Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nama Aplikasi / Sistem (Baris Atas) *
                  </label>
                  <input 
                    type="text" 
                    value={settingAppName}
                    onChange={e => setSettingAppName(e.target.value)}
                    placeholder="e.g. DICOM PACS"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-semibold transition-all"
                    required 
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tampil pada baris atas judul header dan tab browser.
                  </p>
                </div>

                {/* Hospital Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nama Rumah Sakit / Faskes (Baris Bawah) *
                  </label>
                  <input 
                    type="text" 
                    value={settingHospitalName}
                    onChange={e => setSettingHospitalName(e.target.value)}
                    placeholder="e.g. RSIA LIVASYA MAJALENGKA"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-semibold transition-all"
                    required 
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tampil pada baris bawah berwarna biru muda dan kop laporan.
                  </p>
                </div>
              </div>

              {/* App Logo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Logo Resmi Rumah Sakit
                </label>
                
                <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="w-28 h-28 bg-slate-950 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {settingLogoPreview ? (
                      <img src={settingLogoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2.5">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/svg+xml"
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                    />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current.click()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all text-xs font-bold border border-slate-700/60 flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>Pilih Berkas Logo Baru</span>
                    </button>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Format disarankan: <strong>PNG Transparan</strong> atau <strong>SVG</strong>.<br/>
                      Ukuran berkas maksimal: <strong>2 MB</strong>. Logo akan diskalakan secara otomatis di bagian atas aplikasi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button 
                  type="submit" 
                  disabled={savingSettings} 
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl transition-all font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Menyimpan...' : 'Simpan Kustomisasi'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
