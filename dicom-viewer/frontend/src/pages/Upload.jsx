import { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertCircle, FilePlus, User, Hash, Calendar } from 'lucide-react';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !patientName || !mrn || !dob) {
      setMessage({ type: 'error', text: 'Please fill all fields and select a file.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_name', patientName);
    formData.append('medical_record_number', mrn);
    formData.append('birth_date', dob);

    try {
      await axios.post('/dicom/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'DICOM study uploaded successfully!' });
      
      // Reset form
      setFile(null);
      setPatientName('');
      setMrn('');
      setDob('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload file.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full bg-[#050505] overflow-auto relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#00e5ff]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        
        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00e5ff]/5 to-transparent pointer-events-none" />
          
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 flex items-center relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#0077ff]/20 flex items-center justify-center mr-4 border border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <UploadCloud className="w-6 h-6 text-[#00e5ff]" />
            </div>
            Upload DICOM Study
          </h1>
          <p className="text-[#888] mb-8 ml-16 relative z-10">Manually ingest new patient imaging data into the PACS.</p>

          {message.text && (
            <div className={`relative z-10 p-4 rounded-xl mb-8 flex items-center text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 shrink-0" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpload} className="flex flex-col gap-6 relative z-10">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="flex items-center text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">
                  <User className="w-4 h-4 mr-2" /> Patient Name
                </label>
                <input 
                  type="text" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>
              <div className="group">
                <label className="flex items-center text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">
                  <Hash className="w-4 h-4 mr-2" /> Medical Record Number
                </label>
                <input 
                  type="text" 
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                  placeholder="e.g. MRN-987654"
                  required
                />
              </div>
            </div>
            
            <div className="group">
              <label className="flex items-center text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">
                <Calendar className="w-4 h-4 mr-2" /> Date of Birth
              </label>
              <input 
                type="date" 
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full md:w-[calc(50%-12px)] bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all group-hover:border-white/20"
                required
              />
            </div>

            <div className="mt-2">
              <label className="flex items-center text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">
                <FilePlus className="w-4 h-4 mr-2" /> DICOM File (.dcm)
              </label>
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                  dragActive ? 'border-[#00e5ff] bg-[#00e5ff]/5' : 
                  file ? 'border-emerald-500/50 bg-emerald-500/5' : 
                  'border-white/20 hover:border-[#00e5ff]/50 bg-black/40'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".dcm" 
                  onChange={handleFileChange}
                  className="hidden" 
                  id="dicom-file"
                  required={!file}
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <span className="text-white font-bold text-lg mb-1">{file.name}</span>
                    <span className="text-sm text-[#888] mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button 
                      type="button" 
                      onClick={() => setFile(null)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider px-3 py-1 rounded bg-red-500/10 transition-colors"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <label htmlFor="dicom-file" className="cursor-pointer flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${dragActive ? 'bg-[#00e5ff]/20 scale-110' : 'bg-white/5'}`}>
                      <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-[#00e5ff]' : 'text-[#888]'}`} />
                    </div>
                    <span className="text-white font-bold text-lg mb-2">
                      Drag & Drop DICOM file here
                    </span>
                    <span className="text-sm text-[#888] mb-4">or click to browse from your computer</span>
                    <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest border border-[#333] px-3 py-1 rounded-full">Max size: 50MB</span>
                  </label>
                )}
                
                {/* Drag overlay to catch drops easily */}
                {dragActive && (
                  <div className="absolute inset-0 z-50 w-full h-full" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} />
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white font-bold py-4 rounded-xl mt-4 hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center shadow-[0_0_20px_rgba(0,229,255,0.3)] text-lg tracking-wide"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  Processing Upload...
                </>
              ) : (
                'Upload and Process DICOM'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
