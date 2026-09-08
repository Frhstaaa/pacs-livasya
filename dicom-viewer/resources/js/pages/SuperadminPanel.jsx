import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Shield, UserPlus, Edit2, Trash2, CheckCircle, AlertCircle, 
  RefreshCw, Search, Filter, SearchX, LayoutTemplate, 
  Image as ImageIcon, Save, Upload, User, Mail, Lock, 
  CheckCircle2, Eye, EyeOff, Users, Stethoscope, UserCheck,
  FileSignature, X, Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'settings'
  
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
  const { appName, appLogo, refreshSettings } = useAppContext();
  const [settingAppName, setSettingAppName] = useState('');
  const [settingLogoFile, setSettingLogoFile] = useState(null);
  const [settingLogoPreview, setSettingLogoPreview] = useState(null);
  const [settingMessage, setSettingMessage] = useState({ type: '', text: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      setSettingAppName(appName || '');
      setSettingLogoPreview(appLogo || null);
      setSettingMessage({ type: '', text: '' });
    }
  }, [activeTab, appName, appLogo]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memuat daftar pengguna sistem.' });
    } finally {
      setLoading(false);
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

  // Filter Logic
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
      case 'nurse':
      default:
        return {
          label: 'Radiografer / Perawat',
          classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: UserCheck,
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
                Manajemen akun staf radiologi (Dokter Sp.Rad, Radiografer, Superadmin) dan identitas RSIA Livasya
              </p>
            </div>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-auto shadow-sm">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'users' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Manajemen Pengguna</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Kustomisasi Aplikasi</span>
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
                  <span className="flex-1">{message.text}</span>
                  <button onClick={() => setMessage({ type: '', text: '' })} className="opacity-60 hover:opacity-100 text-white">✕</button>
                </div>
              )}

              {/* Search & Role Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama atau email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="all" className="bg-[#111827]">Semua Peran ({users.length})</option>
                    <option value="superadmin" className="bg-[#111827]">Super Administrator</option>
                    <option value="doctor" className="bg-[#111827]">Dokter Sp.Rad</option>
                    <option value="nurse" className="bg-[#111827]">Radiografer / Perawat</option>
                  </select>
                </div>
              </div>

              {/* Users Cards List */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 divide-y divide-slate-800/40">
                {filteredUsers.length === 0 && !loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <SearchX className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-medium">Tidak ada pengguna yang cocok dengan kriteria pencarian.</p>
                    <button 
                      onClick={() => { setSearchQuery(''); setRoleFilter('all'); }} 
                      className="mt-2 text-sky-400 hover:underline text-xs font-bold cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const badge = getRoleBadge(u.role);
                    const RoleIcon = badge.icon;
                    const isCurrent = currentId === u.id;

                    return (
                      <div 
                        key={u.id} 
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent 
                            ? 'bg-sky-500/10 border-sky-500/40 shadow-sm' 
                            : 'bg-slate-900/60 border-slate-800/70 hover:border-slate-700 hover:bg-slate-900/90'
                        }`}
                      >
                        {/* User Info & Avatar */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                            u.role === 'superadmin' 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                              : u.role === 'doctor'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500 text-white font-mono uppercase">
                                  Sedang Diedit
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                              {u.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.classes}`}>
                                <RoleIcon className="w-3 h-3" />
                                {badge.label}
                              </span>
                              {u.role === 'doctor' && u.signature_path && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <FileSignature className="w-3 h-3" /> TTD Aktif
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button 
                            onClick={() => handleEdit(u)} 
                            className="p-2 bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-400 rounded-lg text-xs font-semibold transition-all border border-slate-700/60 cursor-pointer"
                            title="Ubah Data Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(u.id, u.name)} 
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition-all border border-rose-500/20 cursor-pointer"
                            title="Hapus Pengguna"
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

            {/* Right Side: Form (Register / Edit) */}
            <div className="w-full lg:w-[420px] shrink-0">
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl lg:sticky lg:top-6 space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      {isEditing ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                        {isEditing ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru'}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {isEditing ? 'Perbarui informasi akun staf' : 'Buat kredensial akses baru'}
                      </p>
                    </div>
                  </div>

                  {isEditing && (
                    <button
                      onClick={resetForm}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-800 px-2 py-1 rounded-md"
                    >
                      <X className="w-3 h-3" /> Batal
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nama Lengkap Staf *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. dr. Hendra Sp.Rad / Ns. Kartika"
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Alamat Email (Akun Login) *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="staf@livasya.com"
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
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
                      <option value="nurse" className="bg-[#111827]">Radiografer / Perawat (Akuisisi & Unggah DICOM)</option>
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
                        Tanda tangan ini akan otomatis ditempelkan pada dokumen sertifikat PDF hasil ekspertise saat dokter melakukan verifikasi resmi.
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button 
                      type="submit" 
                      className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl transition-all font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isEditing ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      <span>{isEditing ? 'Simpan Perubahan Pengguna' : 'Daftarkan Pengguna Baru'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: App Customization */}
        {activeTab === 'settings' && (
          <div className="w-full max-w-3xl mx-auto">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
              
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Identitas & Kustomisasi Rumah Sakit</h2>
                  <p className="text-xs text-slate-400">Atur nama instansi dan logo resmi yang tampil di header dan laporan ekspertise.</p>
                </div>
              </div>

              {settingMessage.text && (
                <div className={`p-4 rounded-xl flex items-center text-xs font-bold border transition-all ${
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
                
                {/* App Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nama Fasilitas / Aplikasi Rumah Sakit *
                  </label>
                  <input 
                    type="text" 
                    value={settingAppName}
                    onChange={e => setSettingAppName(e.target.value)}
                    placeholder="e.g. RSIA LIVASYA MAJALENGKA"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all font-semibold"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Nama ini akan ditampilkan pada sidebar navigasi, judul browser, dan kop surat ekspertise.</p>
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
          </div>
        )}

      </div>
    </div>
  );
}
