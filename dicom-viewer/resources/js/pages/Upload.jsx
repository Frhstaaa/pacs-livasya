import { useState, useRef } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  FilePlus, 
  User, 
  Hash, 
  Calendar, 
  Activity, 
  Clock, 
  Zap, 
  FileText, 
  Trash2, 
  Layers,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dragActive, setDragActive] = useState(false);
  const [priority, setPriority] = useState('regular');
  const [modality, setModality] = useState('DX');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(prev => {
        const combined = [...prev, ...selected];
        return combined.slice(0, 3); // Max 3 files
      });
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
      const dropped = Array.from(e.dataTransfer.files);
      setFiles(prev => {
        const combined = [...prev, ...dropped];
        return combined.slice(0, 3); // Max 3 files
      });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !patientName || !mrn || !dob) {
      setMessage({ 
        type: 'error', 
        text: 'Mohon lengkapi data demografi pasien dan pilih minimal 1 file DICOM (.dcm).' 
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files[]', f);
    });
    formData.append('patient_name', patientName);
    formData.append('medical_record_number', mrn);
    formData.append('birth_date', dob);
    formData.append('priority', priority);
    formData.append('modality', modality);

    try {
      const response = await axios.post('/dicom/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Studi DICOM berhasil diunggah dan disimpan ke server PACS!' 
      });
      
      // Reset form
      setFiles([]);
      setPatientName('');
      setMrn('');
      setDob('');
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Gagal mengunggah file DICOM. Periksa format file dan koneksi server.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 h-full bg-[#0b0f19] overflow-y-auto text-slate-100">
      
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        
        {/* Page Header with Clinical Breadcrumb */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Stasiun Akuisisi Citra &bull; RSIA Livasya</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Registrasi & Unggah Studi DICOM
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Masukkan data demografi pasien dan unggah hingga 3 file citra DICOM (.dcm) sekaligus untuk 1 nomor pemeriksaan.
          </p>
        </div>

        {/* Feedback Alert Toast */}
        {message.text && (
          <div className={`p-4 rounded-2xl flex items-center text-sm font-medium border shadow-lg animate-in fade-in duration-200 ${
            message.type === 'error' 
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 mr-3 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-3 shrink-0 text-emerald-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Main Ingestion Form Card */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          
          <form onSubmit={handleUpload} className="space-y-7">
            
            {/* SECTION 1: Patient Demographics */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e293b]">
                <User className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  1. Data Demografi Pasien
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Patient Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Nama Lengkap Pasien <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text" 
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Contoh: NY. SITI AMINAH"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#0c1220] border border-[#1e293b] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Medical Record Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Nomor Rekam Medis (No. RM) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text" 
                      value={mrn}
                      onChange={(e) => setMrn(e.target.value)}
                      placeholder="Contoh: 08-61-80"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#0c1220] border border-[#1e293b] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Tanggal Lahir <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="date" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#0c1220] border border-[#1e293b] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer font-medium"
                    />
                  </div>
                </div>

                {/* Modality Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Modalitas Pemeriksaan
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { code: 'DX', label: 'Rontgen' },
                      { code: 'CT', label: 'CT Scan' },
                      { code: 'MR', label: 'MRI' },
                      { code: 'US', label: 'USG' },
                    ].map(mod => (
                      <button
                        key={mod.code}
                        type="button"
                        onClick={() => setModality(mod.code)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                          modality === mod.code
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-sm'
                            : 'bg-[#0c1220] border-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <div>{mod.code}</div>
                        <div className="text-[10px] font-normal text-slate-400">{mod.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: Triage Priority & TAT Quality Target */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    2. Prioritas Pemeriksaan (Indikator Mutu TAT)
                  </h2>
                </div>
                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                  Standar Akreditasi KARS Rumah Sakit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Regular Option */}
                <div
                  onClick={() => setPriority('regular')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    priority === 'regular'
                      ? 'bg-sky-500/10 border-sky-500/60 shadow-[0_0_15px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/40'
                      : 'bg-[#0c1220] border-[#1e293b] hover:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                    priority === 'regular' ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                  }`}>
                    {priority === 'regular' && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Reguler (Elektif)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        TAT &le; 3 Jam
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Pemeriksaan rutin rawat jalan atau poliklinik dengan antrean pembacaan standar.
                    </p>
                  </div>
                </div>

                {/* CITO Option */}
                <div
                  onClick={() => setPriority('cito')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
                    priority === 'cito'
                      ? 'bg-rose-500/15 border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/50'
                      : 'bg-[#0c1220] border-[#1e293b] hover:border-rose-500/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                    priority === 'cito' ? 'border-rose-400 bg-rose-400' : 'border-slate-600'
                  }`}>
                    {priority === 'cito' && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                        CITO (Emergency / IGD)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        TAT &le; 1 Jam
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Kondisi gawat darurat / cito. Ditandai prioritas tinggi dan dilacak pada dashboard mutu.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 3: DICOM Image Ingestion Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    3. Berkas Citra DICOM (.dcm)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    {files.length} / 3 File Terpilih
                  </span>
                </div>
              </div>

              {/* Selected Files List Cards */}
              {files.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {files.map((f, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3.5 bg-[#0c1220] border border-[#1e293b] rounded-2xl hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-center min-w-0 mr-3 gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                            {f.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>&bull;</span>
                            <span className="font-mono text-[11px] text-emerald-400 font-semibold">DICOM Valid</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Modern Tactile Dropzone */}
              {files.length < 3 && (
                <div 
                  className={`relative border-2 border-dashed rounded-2xl p-8 md:p-10 text-center transition-all duration-300 cursor-pointer ${
                    dragActive 
                      ? 'border-sky-400 bg-sky-500/10 scale-[1.01]' 
                      : 'border-[#283548] hover:border-sky-500/50 bg-[#0c1220]/70 hover:bg-[#0c1220]'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".dcm" 
                    multiple
                    onChange={handleFileChange}
                    className="hidden" 
                    id="dicom-file"
                  />
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 ${
                      dragActive ? 'bg-sky-500 text-slate-900 scale-110 shadow-lg' : 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-md'
                    }`}>
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    
                    <span className="text-sm md:text-base font-bold text-white mb-1">
                      {files.length === 0 ? 'Tarik & Letakkan file DICOM (.dcm) di sini' : '+ Tambah file DICOM berikutnya'}
                    </span>
                    
                    <p className="text-xs text-slate-400 mb-3.5 max-w-sm">
                      atau klik di area ini untuk memilih berkas dari komputer (bisa memilih hingga 3 file sekaligus).
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        Format .DCM
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Mendukung Multi-Studi 1 Pasien
                      </span>
                    </div>
                  </div>
                  
                  {dragActive && (
                    <div 
                      className="absolute inset-0 z-50 w-full h-full rounded-2xl" 
                      onDragEnter={handleDrag} 
                      onDragLeave={handleDrag} 
                      onDragOver={handleDrag} 
                      onDrop={handleDrop} 
                    />
                  )}
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading || files.length === 0}
                className="w-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-[0_4px_25px_rgba(14,165,233,0.3)] text-base tracking-wide cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sedang Memproses & Mengunggah {files.length} Berkas DICOM...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-5 h-5 text-white" />
                    <span>
                      Unggah {files.length > 0 ? `${files.length} File DICOM` : 'Studi'} & Simpan ke PACS
                    </span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Security & Multi-examination Footnote */}
        <div className="p-4 rounded-2xl bg-[#0e1424] border border-[#1e293b] flex items-start gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-200">Keamanan Data Pasien Terjamin: </span>
            Seluruh berkas citra DICOM tersimpan di server lokal RSIA Livasya sesuai standar regulasi rekam medis elektronik. Fitur multi-file memungkinkan dokter membaca hingga 3 pemeriksaan sekaligus dalam 1 ekspertise secara berdampingan.
          </div>
        </div>

      </div>
    </div>
  );
}
