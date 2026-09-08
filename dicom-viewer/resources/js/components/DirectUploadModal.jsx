import { useState, useRef } from 'react';
import axios from 'axios';
import { 
  X, UploadCloud, FileText, CheckCircle2, AlertCircle, 
  Activity, ShieldCheck, User, Calendar, Hash, Stethoscope, Clock
} from 'lucide-react';

export default function DirectUploadModal({ patient, onClose, onUploadSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [priority, setPriority] = useState('regular');
  const [modality, setModality] = useState('DX');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  if (!patient) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setErrorMsg(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setErrorMsg(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMsg('Silakan pilih minimal 1 berkas DICOM (.dcm atau .zip).');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('patient_id', patient.id);
    formData.append('patient_name', patient.name);
    formData.append('medical_record_number', patient.medical_record_number);
    formData.append('birth_date', patient.birth_date || '1990-01-01');
    formData.append('priority', priority);
    formData.append('modality', modality);

    selectedFiles.forEach((file) => {
      formData.append('files[]', file);
    });

    try {
      const res = await axios.post('/dicom/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      setSuccessMsg(res.data.message || 'Berkas DICOM berhasil diunggah dan ditautkan ke pasien!');
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal mengunggah berkas DICOM. Pastikan format berkas valid.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Unggah Berkas DICOM Pasien
              </h2>
              <p className="text-xs text-slate-400">
                Berkas akan langsung tertaut pada order dan identitas rekam medis pasien.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">

          {/* Locked Patient Context Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold text-white">{patient.name}</span>
                {patient.gender && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                    {patient.gender === 'L' || patient.gender === 'male' ? 'Laki-Laki' : 'Perempuan'}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-lg">
                RM: {patient.medical_record_number}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-400">
              <div>
                <span className="block text-slate-500 text-[10px]">Tgl Lahir:</span>
                <span className="text-slate-200 font-medium">{patient.birth_date || '-'}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">NIK KTP:</span>
                <span className="text-slate-200 font-mono font-medium">{patient.nik || '-'}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px]">IHS SATUSEHAT:</span>
                <span className="text-emerald-400 font-mono font-bold">{patient.satusehat_ihs_id || 'Belum Terdaftar'}</span>
              </div>
            </div>

            {(patient.requested_procedure || patient.order_number) && (
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
                {patient.order_number && (
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                    Order: {patient.order_number}
                  </span>
                )}
                {patient.requested_procedure && (
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> {patient.requested_procedure}
                  </span>
                )}
                {patient.referring_physician && (
                  <span className="text-[10px] text-slate-400">
                    Perujuk: <strong className="text-slate-300">{patient.referring_physician}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Configuration: Priority & Modality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Modalitas Pemeriksaan
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                <option value="DX">DX - Digital Radiography (X-Ray)</option>
                <option value="CR">CR - Computed Radiography</option>
                <option value="CT">CT - Computed Tomography</option>
                <option value="MR">MR - Magnetic Resonance Imaging</option>
                <option value="US">US - Ultrasound (USG)</option>
                <option value="PX">PX - Panoramic / Dental X-Ray</option>
                <option value="OT">OT - Other Modality</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tingkat Prioritas (Triage)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('regular')}
                  className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    priority === 'regular'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Regular
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('cito')}
                  className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    priority === 'cito'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🚨 CITO / Emergency
                </button>
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Berkas Citra DICOM (.dcm / .zip)
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".dcm,.zip,application/dicom"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white mb-0.5">
                Klik untuk memilih berkas atau seret (drag &amp; drop) ke sini
              </p>
              <p className="text-[11px] text-slate-500">
                Mendukung satu atau beberapa berkas citra DICOM (.dcm)
              </p>
            </div>
          </div>

          {/* File Selection List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-400 mb-1">
                {selectedFiles.length} berkas siap diunggah:
              </div>
              {selectedFiles.map((file, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{file.name}</span>
                    <span className="text-[10px] text-slate-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  Mengunggah dan memproses metadata DICOM...
                </span>
                <span className="font-mono text-sky-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || selectedFiles.length === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Mengunggah...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Mulai Unggah ({selectedFiles.length} Berkas)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
