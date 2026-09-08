import { useState, useEffect } from 'react';
import axios from 'axios';
import { Folder, CheckCircle, AlertCircle, FilePlus, ArrowLeft, HardDrive, Search, Filter, SearchX, X } from 'lucide-react';

export default function RouterImportModal({ onClose, onImportSuccess, selectedPatient = null }) {
  const [rootPath, setRootPath] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState({ type: '', text: '' });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(selectedPatient?.medical_record_number || '');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (rootPath) {
      browse(currentPath);
    }
  }, [rootPath, currentPath]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/dicom-router/settings');
      setRootPath(res.data.dicom_router_path || '');
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const browse = async (subPath = '') => {
    setLoading(true);
    setImportMessage({ type: '', text: '' });
    if (!selectedPatient) {
      setSearchQuery('');
    }
    
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
      setImportMessage({ type: 'success', text: 'File imported successfully!' });
      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 1500);
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

  const filteredContents = contents.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(query);
    
    let matchesType = true;
    if (typeFilter === 'folder') matchesType = item.isDir;
    if (typeFilter === 'file') matchesType = !item.isDir;

    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[85vh] animate-in fade-in zoom-in duration-300 relative">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#0077ff]/10 blur-[100px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 relative z-10 bg-black/20">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/20 border border-[#00e5ff]/30 flex items-center justify-center mr-3">
                <Folder className="w-5 h-5 text-[#00e5ff]" />
              </div>
              {selectedPatient ? `Cari Citra: ${selectedPatient.name}` : 'Import from DICOM Server'}
            </h2>
            {selectedPatient && (
              <p className="text-xs text-sky-400 mt-1 ml-13 font-mono">
                No. RM: {selectedPatient.medical_record_number} {selectedPatient.requested_procedure ? `• ${selectedPatient.requested_procedure}` : ''}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-[#888] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden relative z-10">
          <div className="flex items-center text-[#888] bg-black/50 px-4 py-2 rounded-xl border border-white/5 font-mono text-xs w-full mb-6 overflow-hidden">
            <HardDrive className="w-4 h-4 mr-2 text-[#00e5ff] shrink-0" />
            <span className="truncate">{rootPath}{currentPath ? '\\' + currentPath : ''}</span>
          </div>

          {importMessage.text && (
            <div className={`p-4 rounded-xl mb-4 flex items-center text-sm font-medium ${importMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {importMessage.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 shrink-0" />}
              {importMessage.text}
            </div>
          )}

          {/* SEARCH & FILTER UI */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 shrink-0">
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

          <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative flex flex-col min-h-0">
            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 flex-col">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#00e5ff] rounded-full animate-spin mb-4" />
                <span className="text-sm font-bold text-[#888] tracking-widest uppercase">Processing...</span>
              </div>
            )}
            
            <div className="bg-white/5 border-b border-white/10 p-3 flex text-xs font-bold text-[#888] uppercase tracking-wider shrink-0">
              <div className="flex-1">Name</div>
              <div className="w-24 text-right hidden md:block">Type</div>
              <div className="w-24 text-right">Action</div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
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
                <div className="flex flex-col items-center justify-center py-12 text-[#666] italic">
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
                        disabled={loading}
                        className="bg-white/10 hover:bg-[#00e5ff] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.6)] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
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
      </div>
    </div>
  );
}
