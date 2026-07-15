import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Folder, CheckCircle, AlertCircle, FilePlus, ArrowLeft, RefreshCw, HardDrive, Search, Server, Shield, Filter, SearchX } from 'lucide-react';

export default function RouterIntegration() {
  const [activeTab, setActiveTab] = useState('import'); // 'import' or 'setup'
  
  // Setup State
  const [path, setPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [setupMessage, setSetupMessage] = useState({ type: '', text: '' });
  const [testing, setTesting] = useState(false);

  // Import State
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState({ type: '', text: '' });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'folder', 'file'

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
      setSetupMessage({ type: 'success', text: 'Settings saved successfully.' });
      if (password) setIsPasswordSet(true);
      setPassword(''); // Clear password field after saving for security
    } catch (err) {
      setSetupMessage({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setSetupMessage({ type: '', text: '' });
    try {
      const res = await axios.post('/dicom-router/test');
      if (res.data.success) {
        setSetupMessage({ type: 'success', text: 'Connection successful! Router is online.' });
      } else {
        setSetupMessage({ type: 'error', text: res.data.message || 'Connection failed.' });
      }
    } catch (err) {
      setSetupMessage({ type: 'error', text: err.response?.data?.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const browse = async (subPath = '') => {
    setLoading(true);
    setImportMessage({ type: '', text: '' });
    // Reset search when browsing a new directory
    setSearchQuery('');
    
    try {
      const res = await axios.get('/dicom-router/browse', { params: { path: subPath } });
      setContents(res.data.contents);
    } catch (err) {
      setImportMessage({ type: 'error', text: err.response?.data?.error || 'Failed to browse directory. Check setup.' });
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (filePath) => {
    setLoading(true);
    setImportMessage({ type: '', text: '' });
    try {
      await axios.post('/dicom-router/import', { path: filePath });
      setImportMessage({ type: 'success', text: 'File imported and processed successfully!' });
    } catch (err) {
      setImportMessage({ type: 'error', text: err.response?.data?.error || 'Failed to import file.' });
    } finally {
      setLoading(false);
    }
  };

  const goUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('\\');
    parts.pop();
    setCurrentPath(parts.join('\\'));
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

  return (
    <div className="p-4 md:p-8 h-full bg-[#050505] overflow-auto relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0077ff]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center tracking-tight">
              <Server className="w-8 h-8 mr-3 text-[#00e5ff]" />
              DICOM Router
            </h1>
            <p className="text-[#888] mt-2 text-sm font-medium">Connect and pull studies directly from network nodes.</p>
          </div>
          
          {/* Pill Tabs */}
          <div className="flex bg-[#111] p-1.5 rounded-full border border-white/10 w-full md:w-auto">
            <button
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center ${activeTab === 'import' ? 'bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'text-[#888] hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('import')}
            >
              <Search className="w-4 h-4 mr-2" /> Browse
            </button>
            <button
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center ${activeTab === 'setup' ? 'bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'text-[#888] hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('setup')}
            >
              <Settings className="w-4 h-4 mr-2" /> Setup
            </button>
          </div>
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00e5ff]/5 to-transparent pointer-events-none" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center relative z-10">
              <Shield className="w-6 h-6 mr-3 text-[#00e5ff]" /> Connection Security
            </h2>
            
            {setupMessage.text && (
              <div className={`relative z-10 p-4 rounded-xl mb-8 flex items-center text-sm font-medium ${setupMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {setupMessage.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 shrink-0" />}
                {setupMessage.text}
              </div>
            )}

            <form onSubmit={saveSettings} className="flex flex-col gap-6 relative z-10">
              <div className="group">
                <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">Shared Folder Path (UNC)</label>
                <input 
                  type="text" 
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20 font-mono text-sm"
                  placeholder="\\192.168.1.100\DicomShare"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">Username (Optional)</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                    placeholder="Router User"
                  />
                </div>
                <div className="group">
                  <label className="flex items-center text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">
                    Password (Optional) {isPasswordSet && <span className="text-emerald-400 ml-2 normal-case tracking-normal">(Saved)</span>}
                  </label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                    placeholder={isPasswordSet ? "********" : "Enter to set new"}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={testConnection}
                  disabled={testing || !path}
                  className="flex-1 px-6 py-4 bg-transparent border-2 border-[#00e5ff] text-[#00e5ff] font-bold rounded-xl hover:bg-[#00e5ff] hover:text-black transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#00e5ff] flex justify-center items-center"
                >
                  {testing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : 'Ping Router'}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white font-bold rounded-xl hover:opacity-90 transition-all flex justify-center items-center shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col h-[75vh] shadow-2xl relative overflow-hidden">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Folder className="w-6 h-6 mr-3 text-yellow-500" /> File Explorer
              </h2>
              <div className="flex items-center text-[#888] bg-black/50 px-4 py-2 rounded-xl border border-white/5 font-mono text-xs w-full md:w-auto overflow-hidden">
                <HardDrive className="w-4 h-4 mr-2 text-[#00e5ff] shrink-0" />
                <span className="truncate">{path}{currentPath ? '\\' + currentPath : ''}</span>
              </div>
            </div>

            {importMessage.text && (
              <div className={`p-4 rounded-xl mb-4 flex items-center text-sm font-medium ${importMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {importMessage.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 shrink-0" />}
                {importMessage.text}
              </div>
            )}

            {/* SEARCH & FILTER UI */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-[#888] group-focus-within:text-[#00e5ff] transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search file or folder name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all text-sm"
                />
              </div>
              
              <div className="relative w-full md:w-48 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Filter className="w-4 h-4 text-[#888] group-focus-within:text-[#00e5ff] transition-colors" />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all text-sm"
                >
                  <option value="all" className="bg-[#111] text-white">All Files & Folders</option>
                  <option value="folder" className="bg-[#111] text-white">Folders Only</option>
                  <option value="file" className="bg-[#111] text-white">Files Only</option>
                </select>
              </div>
            </div>

            <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative flex flex-col">
              {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 flex-col">
                  <div className="w-12 h-12 border-4 border-white/10 border-t-[#00e5ff] rounded-full animate-spin mb-4" />
                  <span className="text-sm font-bold text-[#888] tracking-widest uppercase">Scanning Network...</span>
                </div>
              )}
              
              <div className="bg-white/5 border-b border-white/10 p-3 flex text-xs font-bold text-[#888] uppercase tracking-wider">
                <div className="flex-1">Name</div>
                <div className="w-24 text-right hidden md:block">Type</div>
                <div className="w-24 text-right">Action</div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {/* UP button should always be visible regardless of filter, if we are in a subdirectory */}
                {currentPath && (
                  <div 
                    className="flex items-center p-3 hover:bg-white/5 cursor-pointer rounded-xl text-[#ccc] group transition-all mb-1"
                    onClick={goUp}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mr-4 group-hover:bg-[#00e5ff] group-hover:text-black transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-bold">.. (Go Up)</span>
                  </div>
                )}
                
                {filteredContents.length === 0 && !loading && contents.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-[#666]">
                    <SearchX className="w-12 h-12 mb-4 opacity-20" />
                    <p>No results found for your search.</p>
                  </div>
                )}

                {contents.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-full text-[#666] italic">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>Directory is empty</p>
                  </div>
                )}

                {filteredContents.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center p-2 hover:bg-white/5 rounded-xl group transition-all mb-1"
                  >
                    <div 
                      className="flex items-center flex-1 cursor-pointer py-2"
                      onClick={() => item.isDir ? setCurrentPath(item.path) : null}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 transition-transform ${item.isDir ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-[#00e5ff]'}`}>
                        {item.isDir ? <Folder className="w-5 h-5" /> : <FilePlus className="w-5 h-5" />}
                      </div>
                      <span className={`text-sm md:text-base text-white ${item.isDir ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                    </div>
                    
                    <div className="w-24 text-right hidden md:block text-xs font-medium text-[#666]">
                      {item.isDir ? 'Folder' : 'DICOM File'}
                    </div>

                    <div className="w-24 flex justify-end">
                      {!item.isDir && (
                        <button 
                          onClick={() => handleImport(item.path)}
                          className="bg-white/10 hover:bg-[#00e5ff] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.6)] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                          Import
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
