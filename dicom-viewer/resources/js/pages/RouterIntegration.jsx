import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, Folder, CheckCircle, AlertCircle, FilePlus, 
  ArrowLeft, RefreshCw, HardDrive, Search, Server, Shield, 
  Filter, SearchX, ChevronRight, Copy, Check, ExternalLink,
  Activity, ArrowUpRight, FileText, CheckCircle2, Eye, EyeOff
} from 'lucide-react';

export default function RouterIntegration() {
  const [activeTab, setActiveTab] = useState('import'); // 'import' or 'setup'
  
  // Setup State
  const [path, setPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [setupMessage, setSetupMessage] = useState({ type: '', text: '' });
  const [testing, setTesting] = useState(false);
  const [testLatency, setTestLatency] = useState(null);

  // Import State
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState({ type: '', text: '' });
  const [importingFile, setImportingFile] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'folder', 'file'
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'import' && path) {
      browse(currentPath);
    }
  }, [activeTab, path, currentPath]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/dicom-router/settings');
      setPath(res.data.dicom_router_path || '');
      setUsername(res.data.dicom_router_username || '');
      setIsPasswordSet(res.data.dicom_router_password_set || false);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSetupMessage({ type: '', text: '' });
    try {
      await axios.post('/dicom-router/settings', {
        dicom_router_path: path,
        dicom_router_username: username,
        dicom_router_password: password
      });
      setSetupMessage({ type: 'success', text: 'Konfigurasi node DICOM router berhasil disimpan.' });
      if (password) setIsPasswordSet(true);
      setPassword(''); // Clear password field after saving for security
    } catch (err) {
      setSetupMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi router.' });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setSetupMessage({ type: '', text: '' });
    setTestLatency(null);
    const start = performance.now();
    try {
      const res = await axios.post('/dicom-router/test');
      const latency = Math.round(performance.now() - start);
      setTestLatency(latency);
      if (res.data.success) {
        setSetupMessage({ type: 'success', text: `Koneksi berhasil! Node DICOM Router online (${latency} ms).` });
      } else {
        setSetupMessage({ type: 'error', text: res.data.message || 'Koneksi ke router gagal.' });
      }
    } catch (err) {
      setSetupMessage({ type: 'error', text: err.response?.data?.message || 'Uji koneksi router gagal.' });
    } finally {
      setTesting(false);
    }
  };

  const browse = async (subPath = '') => {
    setLoading(true);
    setImportMessage({ type: '', text: '' });
    setSearchQuery('');
    
    try {
      const res = await axios.get('/dicom-router/browse', { params: { path: subPath } });
      setContents(res.data.contents || []);
    } catch (err) {
      setImportMessage({ type: 'error', text: err.response?.data?.error || 'Gagal membaca direktori router. Silakan periksa konfigurasi jalur UNC.' });
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (filePath) => {
    setImportingFile(filePath);
    setImportMessage({ type: '', text: '' });
    try {
      await axios.post('/dicom-router/import', { path: filePath });
      setImportMessage({ type: 'success', text: 'Berkas DICOM berhasil diimpor dan diproses ke sistem PACS!' });
    } catch (err) {
      setImportMessage({ type: 'error', text: err.response?.data?.error || 'Gagal mengimpor berkas DICOM.' });
    } finally {
      setImportingFile(null);
    }
  };

  const goUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('\\').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('\\'));
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentPath('');
      return;
    }
    const parts = currentPath.split('\\').filter(Boolean);
    const newPath = parts.slice(0, index + 1).join('\\');
    setCurrentPath(newPath);
  };

  const handleCopyPath = () => {
    const full = path + (currentPath ? '\\' + currentPath : '');
    navigator.clipboard.writeText(full);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Filter Logic
  const filteredContents = contents.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(query);
    
    let matchesType = true;
    if (typeFilter === 'folder') matchesType = item.isDir;
    if (typeFilter === 'file') matchesType = !item.isDir;

    return matchesSearch && matchesType;
  });

  const folderCount = contents.filter(i => i.isDir).length;
  const fileCount = contents.filter(i => !i.isDir).length;
  const breadcrumbParts = currentPath ? currentPath.split('\\').filter(Boolean) : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-100 overflow-y-auto font-sans">
      
      {/* Top Banner / Header */}
      <div className="border-b border-slate-800 bg-[#0e1424]/90 backdrop-blur-xl px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Server className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Integrasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">PACS Router</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider uppercase">
                  Network Node
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Penjelajah berkas DICOM dan sinkronisasi akuisisi citra langsung dari node jaringan router lokal
              </p>
            </div>
          </div>
          
          {/* Segmented Tab Switcher */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-auto shadow-sm">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'import' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Penjelajah Berkas</span>
              {contents.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'import' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {contents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'setup' 
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Konfigurasi Node</span>
              {isPasswordSet && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 flex-1 max-w-6xl w-full mx-auto space-y-6">

        {/* Tab 1: Penjelajah Berkas (Network Explorer) */}
        {activeTab === 'import' && (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col min-h-[70vh] relative space-y-4">
            
            {/* Network Node Status & Breadcrumbs Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5">
              
              {/* Path & Breadcrumb Trail */}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-0.5">
                  <button
                    onClick={() => navigateToBreadcrumb(-1)}
                    className={`font-mono font-bold transition-colors cursor-pointer px-2 py-1 rounded-md ${
                      !currentPath 
                        ? 'bg-sky-500/20 text-sky-400' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {path ? path : 'Root'}
                  </button>

                  {breadcrumbParts.map((part, idx) => {
                    const isLast = idx === breadcrumbParts.length - 1;
                    return (
                      <div key={idx} className="flex items-center gap-1.5 shrink-0">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        <button
                          onClick={() => navigateToBreadcrumb(idx)}
                          className={`font-mono font-semibold transition-colors cursor-pointer px-2 py-1 rounded-md ${
                            isLast 
                              ? 'bg-sky-500/20 text-sky-300 font-bold' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {part}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Node Actions: Copy Path & Quick Refresh */}
              <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                <button
                  onClick={handleCopyPath}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                  title="Salin Jalur UNC Lengkap"
                >
                  {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedPath ? 'Tersalin' : 'Salin Path'}</span>
                </button>

                <button
                  onClick={() => browse(currentPath)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Pindai Ulang Direktori"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {importMessage.text && (
              <div className={`p-4 rounded-xl flex items-center text-xs font-bold border transition-all ${
                importMessage.type === 'error' 
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {importMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 mr-2.5 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2.5 shrink-0 text-emerald-400" />
                )}
                <span className="flex-1">{importMessage.text}</span>
                <button onClick={() => setImportMessage({ type: '', text: '' })} className="opacity-60 hover:opacity-100 text-white">✕</button>
              </div>
            )}

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              
              {/* Search Box */}
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari folder tanggal atau nama file DICOM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
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

              {/* Type Filter & Statistics Pills */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-transparent text-slate-300 font-semibold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="all" className="bg-[#111827] text-white">Semua Berkas ({contents.length})</option>
                    <option value="folder" className="bg-[#111827] text-amber-300">Folder Saja ({folderCount})</option>
                    <option value="file" className="bg-[#111827] text-sky-300">File DICOM Saja ({fileCount})</option>
                  </select>
                </div>

                <div className="hidden md:flex items-center gap-2 text-[11px] font-mono font-bold text-slate-400">
                  <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {folderCount} Folder
                  </span>
                  <span className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {fileCount} File .DCM
                  </span>
                </div>
              </div>
            </div>

            {/* Enterprise Clinical Table Explorer */}
            <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden relative flex flex-col min-h-[400px]">
              
              {/* Network Scan Loader Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-20 flex-col">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                  <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                    Memindai Node Jaringan PACS...
                  </span>
                </div>
              )}

              {/* Table Column Headers */}
              <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex-1">Nama Folder / Berkas DICOM</div>
                <div className="w-36 text-center hidden sm:block">Format & Tipe</div>
                <div className="w-28 text-right">Aksi</div>
              </div>

              {/* Table Body List */}
              <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
                
                {/* Parent Directory (Go Up) Row */}
                {currentPath && (
                  <div 
                    onClick={goUp}
                    className="flex items-center px-3 py-2.5 hover:bg-slate-800/50 cursor-pointer rounded-xl text-slate-300 hover:text-white group transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold font-mono group-hover:text-sky-400 transition-colors">.. (Kembali ke Direktori Sebelumnya)</span>
                    </div>
                  </div>
                )}

                {/* Empty Search Results */}
                {filteredContents.length === 0 && !loading && contents.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <SearchX className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-medium">Tidak ada berkas yang sesuai dengan pencarian "{searchQuery}"</p>
                  </div>
                )}

                {/* Directory Is Empty */}
                {contents.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <Folder className="w-10 h-10 mb-2 opacity-20 text-slate-400" />
                    <p className="text-xs font-medium">Direktori jaringan kosong atau tidak dapat diakses.</p>
                    <p className="text-[11px] text-slate-600 mt-1">Pastikan path UNC dan kredensial router sudah terisi dengan benar di tab Konfigurasi.</p>
                  </div>
                )}

                {/* Explorer Items */}
                {filteredContents.map((item, idx) => {
                  const isDir = item.isDir;
                  const isProcessing = importingFile === item.path;

                  return (
                    <div 
                      key={idx} 
                      className="flex items-center px-3 py-2.5 hover:bg-slate-800/40 rounded-xl group transition-colors"
                    >
                      {/* Name & Icon Column */}
                      <div 
                        className={`flex items-center flex-1 min-w-0 ${isDir ? 'cursor-pointer' : ''}`}
                        onClick={() => isDir ? setCurrentPath(item.path) : null}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-3 shrink-0 transition-transform ${
                          isDir 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105' 
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {isDir ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <div className={`text-xs truncate transition-colors ${
                            isDir 
                              ? 'font-bold text-slate-100 group-hover:text-amber-300' 
                              : 'font-semibold text-slate-200 font-mono'
                          }`}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {isDir ? 'Folder Pemeriksaan / Tanggal' : 'DICOM Part 10 Medical Image'}
                          </div>
                        </div>
                      </div>

                      {/* Format / Type Column */}
                      <div className="w-36 text-center hidden sm:block">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                          isDir 
                            ? 'bg-slate-800 text-slate-400 border border-slate-700/60' 
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {isDir ? '📁 Folder' : '📄 DICOM .DCM'}
                        </span>
                      </div>

                      {/* Action Column */}
                      <div className="w-28 flex justify-end">
                        {isDir ? (
                          <button
                            onClick={() => setCurrentPath(item.path)}
                            className="flex items-center gap-1 text-slate-400 group-hover:text-sky-400 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <span>Buka</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleImport(item.path)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Mengimpor...</span>
                              </>
                            ) : (
                              <>
                                <FilePlus className="w-3 h-3" />
                                <span>Impor</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Breadcrumb Quick Info */}
              <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Direktori Aktif: <span className="font-mono text-slate-300">\{currentPath ? currentPath : 'Root'}</span></span>
                <span>Standar Protokol DICOM 3.0 Network Node</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Konfigurasi Node & Keamanan (Router Setup) */}
        {activeTab === 'setup' && (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Konfigurasi Node Jaringan & Jalur UNC</h2>
                  <p className="text-xs text-slate-400">Tentukan alamat folder bersama (network share) tempat alat rontgen/CT menyimpan citra.</p>
                </div>
              </div>

              {isPasswordSet && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" /> Kredensial Terverifikasi
                </span>
              )}
            </div>

            {setupMessage.text && (
              <div className={`p-4 rounded-xl flex items-center text-xs font-bold border transition-all ${
                setupMessage.type === 'error' 
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {setupMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 mr-2.5 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2.5 shrink-0 text-emerald-400" />
                )}
                <span>{setupMessage.text}</span>
              </div>
            )}

            <form onSubmit={saveSettings} className="space-y-5">
              
              {/* UNC Path */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Shared Folder Path (Format Universal Naming Convention / UNC) *
                </label>
                <div className="relative">
                  <HardDrive className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input 
                    type="text" 
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                    placeholder="\\192.168.0.186\dicomrouter"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Contoh: <code>\\192.168.1.100\DicomShare</code> atau <code>\\pacs-server\storage\dicom</code>
                </p>
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Username Windows / SAMBA (Opsional)
                  </label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                    placeholder="e.g. pacs_user"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Password Network Share (Opsional)</span>
                    {isPasswordSet && <span className="text-[10px] text-emerald-400 font-semibold">✓ Tersimpan di Enkripsi</span>}
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                      placeholder={isPasswordSet ? "••••••••" : "Masukkan kata sandi jika diproteksi"}
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
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button 
                  type="button" 
                  onClick={testConnection}
                  disabled={testing || !path}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-sky-500/30 text-sky-400 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Activity className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Menguji Koneksi Node...' : 'Uji Koneksi Router (Ping Node)'}</span>
                </button>

                <button 
                  type="submit" 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Konfigurasi Router</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
