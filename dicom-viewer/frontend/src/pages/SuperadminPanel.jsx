import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, UserPlus, Edit2, Trash2, CheckCircle, AlertCircle, RefreshCw, Search, Filter, SearchX, LayoutTemplate, Image as ImageIcon, Save, Upload } from 'lucide-react';
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
  const [role, setRole] = useState('nurse');
  const [signatureFile, setSignatureFile] = useState(null);

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
      setMessage({ type: 'error', text: 'Failed to fetch users.' });
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
        // Need to use POST with _method=PUT for Laravel to handle FormData correctly
        formData.append('_method', 'PUT');
        await axios.post(`/users/${currentId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage({ type: 'success', text: 'User updated successfully!' });
      } else {
        await axios.post('/users', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage({ type: 'success', text: 'User created successfully!' });
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
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
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`/users/${id}`);
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
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
      setSettingMessage({ type: 'success', text: 'App settings saved successfully!' });
      refreshSettings();
    } catch (err) {
      setSettingMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full bg-[#050505] overflow-auto flex flex-col">
      {/* Tabs */}
      <div className="max-w-7xl mx-auto w-full mb-8 flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center px-6 py-4 font-bold transition-all border-b-2 ${
            activeTab === 'users' ? 'text-[#00e5ff] border-[#00e5ff] bg-[#00e5ff]/5' : 'text-[#888] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-5 h-5 mr-2" /> User Management
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center px-6 py-4 font-bold transition-all border-b-2 ${
            activeTab === 'settings' ? 'text-[#00e5ff] border-[#00e5ff] bg-[#00e5ff]/5' : 'text-[#888] border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutTemplate className="w-5 h-5 mr-2" /> App Customization
        </button>
      </div>

      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-8">
        
        {activeTab === 'users' && (
          <>
            {/* Left Side - User List */}
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[600px]">
              <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[#00e5ff]/5 blur-[100px] pointer-events-none" />
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h1 className="text-2xl font-extrabold text-white flex items-center tracking-tight">
                  <Shield className="w-8 h-8 mr-3 text-[#00e5ff]" />
                  User Management
                </h1>
                <button onClick={fetchUsers} className="text-[#888] hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#00e5ff]' : ''}`} />
                </button>
              </div>

              {/* SEARCH & FILTER UI */}
              <div className="flex flex-col xl:flex-row gap-4 mb-6 relative z-10">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-[#888] group-focus-within:text-[#00e5ff] transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by Name or Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
                  />
                </div>
                
                <div className="relative w-full xl:w-56 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Filter className="w-5 h-5 text-[#888] group-focus-within:text-[#00e5ff] transition-colors" />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
                  >
                    <option value="all" className="bg-[#111] text-white">All Roles</option>
                    <option value="superadmin" className="bg-[#111] text-white">Superadmin</option>
                    <option value="doctor" className="bg-[#111] text-white">Doctor</option>
                    <option value="nurse" className="bg-[#111] text-white">Nurse</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 relative z-10 flex-1 overflow-y-auto pr-2">
                {filteredUsers.length === 0 && !loading ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-[#666]">
                    <SearchX className="w-12 h-12 mb-4 opacity-20" />
                    <p>No users matching criteria.</p>
                    <button onClick={() => {setSearchQuery(''); setRoleFilter('all');}} className="mt-4 text-[#00e5ff] hover:underline text-sm font-bold">Clear Filters</button>
                  </div>
                ) : (
                  filteredUsers.map(u => (
                    <div key={u.id} className="group bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold">{u.name}</h3>
                        <div className="text-xs font-mono text-[#888] mt-1">{u.email}</div>
                        <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
                          u.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          u.role === 'doctor' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(u)} className="p-2.5 bg-white/5 hover:bg-[#00e5ff] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] rounded-lg text-white transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full md:w-[400px]">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 md:sticky md:top-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#0077ff]/10 blur-[100px] pointer-events-none" />
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center relative z-10 tracking-tight">
                  <UserPlus className="w-6 h-6 mr-3 text-[#0077ff]" />
                  {isEditing ? 'Edit Existing User' : 'Register New User'}
                </h2>

                {message.text && (
                  <div className={`relative z-10 p-4 rounded-xl mb-6 flex items-center text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {message.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 shrink-0" />}
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                  <div className="group">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                      required
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                      required
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2 ml-1">
                      Password {isEditing && <span className="text-yellow-500/80 normal-case tracking-normal ml-1 normal-case">(Leave blank to keep)</span>}
                    </label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                      required={!isEditing}
                      minLength={6}
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2 ml-1">Access Role</label>
                    <select 
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all appearance-none cursor-pointer group-hover:border-white/20 font-medium"
                    >
                      <option value="nurse" className="bg-[#111] text-white">Nurse (Upload/View)</option>
                      <option value="doctor" className="bg-[#111] text-white">Doctor (Diagnose/View)</option>
                      <option value="superadmin" className="bg-[#111] text-white">Superadmin (Manage All)</option>
                    </select>
                  </div>
                  
                  {role === 'doctor' && (
                    <div className="group border border-white/5 rounded-xl p-4 bg-white/5">
                      <label className="block text-[10px] font-bold text-[#888] uppercase tracking-widest mb-3 ml-1">Doctor's Signature</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg"
                          onChange={(e) => setSignatureFile(e.target.files[0])}
                          className="w-full text-sm text-[#888] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#00e5ff]/10 file:text-[#00e5ff] hover:file:bg-[#00e5ff]/20 transition-all cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-[#555] mt-2">Upload a transparent PNG of the doctor's signature. This will be automatically attached to PDF reports.</p>
                    </div>
                  )}

                  <div className="flex gap-4 mt-4">
                    {isEditing && (
                      <button type="button" onClick={resetForm} className="flex-1 px-4 py-4 bg-transparent border-2 border-white/10 hover:border-white/30 hover:bg-white/5 text-white rounded-xl transition-all font-bold">
                        Cancel
                      </button>
                    )}
                    <button type="submit" className="flex-1 px-4 py-4 bg-gradient-to-r from-[#00e5ff] to-[#0077ff] hover:opacity-90 text-white rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                      {isEditing ? 'Save Changes' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="w-full max-w-3xl mx-auto">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#00e5ff]/5 blur-[100px] pointer-events-none" />
              
              <h2 className="text-2xl font-extrabold text-white mb-8 flex items-center relative z-10 tracking-tight">
                <LayoutTemplate className="w-8 h-8 mr-3 text-[#00e5ff]" />
                App Customization
              </h2>

              {settingMessage.text && (
                <div className={`relative z-10 p-4 rounded-xl mb-8 flex items-center text-sm font-medium ${settingMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {settingMessage.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 shrink-0" />}
                  {settingMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="flex flex-col gap-8 relative z-10">
                {/* App Name */}
                <div className="group">
                  <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-3 ml-1">Application Name</label>
                  <input 
                    type="text" 
                    value={settingAppName}
                    onChange={e => setSettingAppName(e.target.value)}
                    placeholder="e.g. RSUD Sehat PACS"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20 text-lg"
                    required
                  />
                  <p className="text-xs text-[#555] mt-2 ml-1">This name will be displayed on the top left of the sidebar and the browser tab.</p>
                </div>

                {/* App Logo */}
                <div className="group">
                  <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-3 ml-1">Application Logo</label>
                  
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-32 h-32 bg-black border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg relative group-hover:border-[#00e5ff]/50 transition-colors">
                      {settingLogoPreview ? (
                        <img src={settingLogoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-white/20" />
                      )}
                    </div>
                    
                    <div className="flex-1">
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
                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-bold border border-white/10 hover:border-white/30 flex items-center mb-3"
                      >
                        <Upload className="w-4 h-4 mr-2 text-[#00e5ff]" /> Browse Logo Image
                      </button>
                      <p className="text-xs text-[#555] leading-relaxed">
                        Recommended format: PNG with transparent background.<br/>
                        Maximum file size: 2MB.<br/>
                        The logo will be automatically scaled to fit the top bar.
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-white/5 my-2" />

                <div className="flex justify-end">
                  <button type="submit" disabled={savingSettings} className="px-8 py-4 bg-gradient-to-r from-[#00e5ff] to-[#0077ff] hover:opacity-90 disabled:opacity-50 text-white rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(0,229,255,0.3)] flex items-center text-lg">
                    <Save className="w-5 h-5 mr-2" />
                    {savingSettings ? 'Saving...' : 'Save Settings'}
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
