import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { 
  Users, FileText, Monitor, ChevronRight, Activity, Calendar, Search, 
  Filter, SearchX, Download, Server, Trash2, ShieldCheck, Globe, 
  UploadCloud, RefreshCw, Stethoscope, PlusCircle, CheckCircle2, UserCheck, AlertCircle
} from 'lucide-react';
import PdfTemplate from '../components/PdfTemplate';
import RouterImportModal from '../components/RouterImportModal';
import DirectUploadModal from '../components/DirectUploadModal';

export default function PatientList() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { appLogo, appName, hospitalName } = useAppContext();
  
  // Data State
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // PDF Export States
  const [downloadingId, setDownloadingId] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const pdfRef = useRef(null);

  // Modals & Synchronization States
  const [showRouterModal, setShowRouterModal] = useState(false);
  const [selectedPatientForRouter, setSelectedPatientForRouter] = useState(null);
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState(null);
  const [syncingSimrs, setSyncingSimrs] = useState(false);
  const [syncAlert, setSyncAlert] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/patients');
      setPatients(Array.isArray(response.data) ? response.data : (response.data?.data || []));
    } catch (err) {
      setError('Gagal memuat daftar pasien radiologi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Sync SIMRS Orders
  const handleSyncSimrsOrders = async () => {
    setSyncingSimrs(true);
    setSyncAlert(null);
    try {
      const res = await axios.post('/integration/sync-orders');
      setSyncAlert({ 
        type: 'success', 
        text: res.data.message || 'Sinkronisasi order radiologi dari SIMRS berhasil!' 
      });
      fetchPatients();
      setTimeout(() => setSyncAlert(null), 5000);
    } catch (err) {
      setSyncAlert({ 
        type: 'error', 
        text: 'Gagal sinkronisasi order SIMRS: ' + (err.response?.data?.message || err.message) 
      });
    } finally {
      setSyncingSimrs(false);
    }
  };

  const handleDeletePatient = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus pasien ${name} dan seluruh berkas DICOM-nya? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    
    try {
      await axios.delete(`/patients/${id}`);
      fetchPatients();
    } catch (err) {
      alert('Gagal menghapus pasien.');
    }
  };

  const handleDownloadPdf = async (patient) => {
    if (!patient.dicom_files || patient.dicom_files.length === 0) return;
    
    setDownloadingId(patient.id);
    try {
      const response = await axios.get(`/report/${patient.dicom_files[0].uuid}`);
      if (response.data.report) {
        setPdfData({
          report: response.data.report,
          dicomFile: response.data.dicom_file,
          patient: response.data.dicom_file.patient,
          doctor: response.data.report.doctor,
          capturedImage: response.data.report.snapshot_url || null,
          relatedFiles: response.data.related_files || patient.dicom_files
        });

        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;

        setTimeout(() => {
          const element = pdfRef.current;
          const opt = {
            margin:       0,
            filename:     `Hasil_Radiologi_${patient.name}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          html2pdf().set(opt).from(element).save().then(() => {
            setDownloadingId(null);
          }).catch(() => {
            setDownloadingId(null);
          });
        }, 500);
      } else {
        setDownloadingId(null);
      }
    } catch (err) {
      console.error('Failed to download PDF', err);
      setDownloadingId(null);
    }
  };

  // Filter and Summary Counts
  const counts = useMemo(() => {
    let pending = 0;
    let ready = 0;
    let verified = 0;

    patients.forEach(p => {
      const hasStudies = p.dicom_files && p.dicom_files.length > 0;
      const isVerified = Boolean(p.dicom_files?.find(f => f.report)?.report?.is_verified);

      if (!hasStudies || p.order_status === 'pending_image') {
        pending++;
      } else if (isVerified) {
        verified++;
      } else {
        ready++;
      }
    });

    return { total: patients.length, pending, ready, verified };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        (patient.name && patient.name.toLowerCase().includes(query)) || 
        (patient.medical_record_number && patient.medical_record_number.toLowerCase().includes(query)) ||
        (patient.nik && patient.nik.toLowerCase().includes(query)) ||
        (patient.order_number && patient.order_number.toLowerCase().includes(query)) ||
        (patient.requested_procedure && patient.requested_procedure.toLowerCase().includes(query));

      const studyCount = patient.dicom_files?.length || 0;
      const hasStudies = studyCount > 0;
      const isVerified = Boolean(patient.dicom_files?.find(f => f.report)?.report?.is_verified);

      let matchesFilter = true;
      if (filterType === 'pending_image') {
        matchesFilter = !hasStudies || patient.order_status === 'pending_image';
      } else if (filterType === 'ready') {
        matchesFilter = hasStudies && !isVerified;
      } else if (filterType === 'verified') {
        matchesFilter = isVerified;
      } else if (filterType === 'has_studies') {
        matchesFilter = hasStudies;
      }

      return matchesSearch && matchesFilter;
    });
  }, [patients, searchQuery, filterType]);

  return (
    <div className="p-4 md:p-8 h-full bg-[#0b0f19] overflow-auto relative text-slate-100">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Hidden PDF Template */}
      {pdfData && (
        <PdfTemplate 
          ref={pdfRef}
          report={pdfData.report}
          dicomFile={pdfData.dicomFile}
          patient={pdfData.patient}
          doctor={pdfData.doctor}
          appLogo={appLogo}
          appName={appName}
          hospitalName={hospitalName}
          capturedImage={pdfData.capturedImage}
          relatedFiles={pdfData.relatedFiles}
        />
      )}

      {/* DICOM Router Browser Modal */}
      {showRouterModal && (
        <RouterImportModal 
          selectedPatient={selectedPatientForRouter}
          onClose={() => {
            setShowRouterModal(false);
            setSelectedPatientForRouter(null);
          }} 
          onImportSuccess={fetchPatients} 
        />
      )}

      {/* Direct Upload per Patient Modal */}
      {selectedPatientForUpload && (
        <DirectUploadModal
          patient={selectedPatientForUpload}
          onClose={() => setSelectedPatientForUpload(null)}
          onUploadSuccess={fetchPatients}
        />
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Top Header & Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Worklist Radiologi &bull; Terhubung SIMRS &amp; SATUSEHAT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Daftar Kerja Pasien Radiologi
            </h1>
            <p className="text-slate-400 mt-1 text-xs md:text-sm">
              Antrean pasien dari SIMRS, penerimaan citra DICOM (Upload / Router), dan ekspertise radiologi terstandar.
            </p>
          </div>
          
          <div className="w-full md:w-auto flex flex-wrap gap-2.5">
            {/* Sync SIMRS Button */}
            {can('integration.manage') && (
              <button
                onClick={handleSyncSimrsOrders}
                disabled={syncingSimrs}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-all flex items-center shadow-sm disabled:opacity-50 cursor-pointer"
                title="Tarik antrean order radiologi terbaru dari SIMRS"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncingSimrs ? 'animate-spin text-sky-400' : 'text-sky-400'}`} />
                {syncingSimrs ? 'Menarik Order...' : 'Tarik Order SIMRS'}
              </button>
            )}

            {can('dicom.import_router') && (
              <button 
                onClick={() => {
                  setSelectedPatientForRouter(null);
                  setShowRouterModal(true);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center shadow-sm cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 mr-2 text-sky-400" /> Router PACS
              </button>
            )}

            {can('dicom.upload') && (
              <button 
                onClick={() => navigate('/upload')}
                className="px-4 py-2.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 mr-2" /> Unggah Baru
              </button>
            )}
          </div>
        </div>

        {/* Sync Alert Banner */}
        {syncAlert && (
          <div className={`p-3.5 rounded-xl text-xs mb-6 flex items-center gap-2 border transition-all animate-in fade-in ${
            syncAlert.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {syncAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{syncAlert.text}</span>
          </div>
        )}

        {/* Status Chips Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 text-xs font-medium">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Semua Pasien ({counts.total})
          </button>

          <button
            onClick={() => setFilterType('pending_image')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'pending_image'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Menunggu Citra DICOM ({counts.pending})
          </button>

          <button
            onClick={() => setFilterType('ready')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'ready'
                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-sky-300'
            }`}
          >
            Citra Tersedia ({counts.ready})
          </button>

          <button
            onClick={() => setFilterType('verified')}
            className={`px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'verified'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-emerald-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Terverifikasi Sah ({counts.verified})
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan Nama Pasien, No. RM, NIK, No. Order, atau Tindakan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#111827] border border-[#1e293b] rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm"
            />
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl mb-6 shadow-sm text-xs">
            {error}
          </div>
        )}

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-[#111827] border border-[#1e293b] rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-[#0e1424] border-b border-[#1e293b] text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="p-4">Identitas Pasien &amp; NIK</th>
                <th className="p-4">Pemeriksaan &amp; Order SIMRS</th>
                <th className="p-4">Status Pemeriksaan</th>
                <th className="p-4">Studi DICOM</th>
                <th className="p-4 text-right">Aksi Worklist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                    Memuat antrean kerja radiologi...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-semibold text-slate-400">Tidak ada pasien yang cocok dengan kriteria filter.</p>
                      <button 
                        onClick={() => {setSearchQuery(''); setFilterType('all');}} 
                        className="mt-3 text-sky-400 hover:underline text-xs font-bold"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const hasStudies = patient.dicom_files?.length > 0;
                  const firstReport = hasStudies ? patient.dicom_files.find(f => f.report)?.report : null;
                  const hasReport = Boolean(firstReport);
                  const isVerified = Boolean(firstReport?.is_verified);
                  const isPendingImage = !hasStudies || patient.order_status === 'pending_image';
                  
                  return (
                    <tr key={patient.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Pasien & NIK */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm" title={patient.name}>
                            {patient.name}
                          </span>
                          {patient.gender && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">
                              {patient.gender === 'L' || patient.gender === 'male' ? 'L' : 'P'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded font-bold">
                            {patient.medical_record_number}
                          </span>
                          {patient.birth_date && (
                            <span className="text-[11px] text-slate-400">
                              {patient.birth_date}
                            </span>
                          )}
                        </div>

                        {patient.nik && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">
                              NIK: {patient.nik}
                            </span>
                            {patient.satusehat_ihs_id && (
                              <span 
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold"
                                title={`IHS SATUSEHAT Terverifikasi: ${patient.satusehat_ihs_id}`}
                              >
                                IHS: {patient.satusehat_ihs_id}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Order & Tindakan */}
                      <td className="p-4 align-middle">
                        {patient.requested_procedure ? (
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>{patient.requested_procedure}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Pemeriksaan Radiologi Umum</span>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                          {patient.order_number && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                              {patient.order_number}
                            </span>
                          )}
                          {patient.referring_physician && (
                            <span>Dr. {patient.referring_physician}</span>
                          )}
                        </div>

                        {(patient.clinical_diagnosis || patient.icd10_code) ? (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {patient.icd10_code && (
                              <span 
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                title={patient.icd10_name || 'Kode ICD-10'}
                              >
                                {patient.icd10_code}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-300 line-clamp-1" title={patient.clinical_diagnosis || patient.icd10_name}>
                              {patient.clinical_diagnosis || patient.icd10_name}
                            </span>
                          </div>
                        ) : patient.clinical_notes ? (
                          <div className="mt-1 text-[10px] text-slate-400 line-clamp-1 italic" title={patient.clinical_notes}>
                            &ldquo;{patient.clinical_notes}&rdquo;
                          </div>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td className="p-4 align-middle">
                        {isPendingImage ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-300 bg-amber-500/15 whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Menunggu Citra
                          </span>
                        ) : isVerified ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/15 whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Terverifikasi Sah
                          </span>
                        ) : hasReport ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/10 whitespace-nowrap">
                            Draft Ekspertise
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-500/30 text-blue-300 bg-blue-500/10 whitespace-nowrap">
                            Siap Ekspertise
                          </span>
                        )}

                        <div className="mt-1.5 flex flex-col gap-1">
                          {patient.dicom_files?.some(f => f.report?.simrs_sync_status === 'synced') && (
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/15 inline-flex items-center gap-1 shadow-sm w-fit"
                              title="Hasil ekspertise telah dikirim & tersinkron ke SIMRS (RME Terhubung)"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> SIMRS Terhubung
                            </span>
                          )}

                          {patient.satusehat_imaging_study_id && (
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/15 inline-flex items-center gap-1 shadow-sm w-fit"
                              title={`SATUSEHAT ImagingStudy ID: ${patient.satusehat_imaging_study_id}`}
                            >
                              <Globe className="w-3 h-3 text-sky-400 shrink-0" /> SATUSEHAT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Studi Count */}
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                          hasStudies 
                            ? 'bg-slate-800/80 text-slate-300 border-slate-700' 
                            : 'bg-slate-900/60 text-slate-500 border-slate-800'
                        }`}>
                          <Activity className={`w-3.5 h-3.5 mr-1.5 ${hasStudies ? 'text-sky-400' : 'text-slate-600'}`} />
                          {patient.dicom_files?.length || 0} Citra
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="p-4 text-right align-middle">
                        <div className="flex justify-end gap-1.5 items-center">
                          
                          {/* Case 1: Pasien Belum Punya Citra (Menunggu Citra) */}
                          {isPendingImage ? (
                            <>
                              <button
                                onClick={() => setSelectedPatientForUpload(patient)}
                                className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center shadow-md shadow-sky-500/20 cursor-pointer"
                                title="Unggah berkas DICOM langsung untuk pasien ini"
                              >
                                <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Unggah DICOM
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedPatientForRouter(patient);
                                  setShowRouterModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer"
                                title="Cari berkas dari server DICOM Router berdasarkan No. RM"
                              >
                                <Server className="w-3.5 h-3.5 mr-1 text-sky-400" /> Router
                              </button>
                            </>
                          ) : (
                            /* Case 2: Pasien Sudah Memiliki Citra DICOM */
                            <>
                              {hasReport && (
                                <button
                                  onClick={() => handleDownloadPdf(patient)}
                                  disabled={downloadingId === patient.id}
                                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-50 shadow-sm ${
                                    isVerified 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500 hover:text-white'
                                  }`}
                                  title={isVerified ? 'Cetak PDF Terverifikasi Sah' : 'Cetak Draft PDF'}
                                >
                                  {downloadingId === patient.id ? (
                                    <Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  ) : isVerified ? (
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  PDF
                                </button>
                              )}

                              <button
                                onClick={() => navigate(`/viewer/${patient.dicom_files[0].uuid}`)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-sm ${
                                  hasReport 
                                    ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30' 
                                    : 'bg-sky-500/15 hover:bg-sky-500 hover:text-white text-sky-400 border border-sky-500/30'
                                }`}
                              >
                                <Monitor className="w-3.5 h-3.5 mr-1.5" /> Viewer
                              </button>

                              {/* Tambah Citra Tambahan */}
                              <button
                                onClick={() => setSelectedPatientForUpload(patient)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-400 border border-slate-700 rounded-xl transition-all"
                                title="Tambah berkas citra DICOM untuk pasien ini"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {can('patients.delete') && (
                            <button
                              onClick={() => handleDeletePatient(patient.id, patient.name)}
                              className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all ml-1 cursor-pointer"
                              title="Hapus Pasien &amp; Arsip Studi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LAYOUT */}
        <div className="md:hidden flex flex-col gap-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500 bg-[#111827] rounded-2xl border border-[#1e293b]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
              Memuat data pasien...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-[#111827] rounded-2xl border border-[#1e293b] flex flex-col items-center">
              <SearchX className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-xs font-semibold">Tidak ada pasien yang cocok.</p>
              <button 
                onClick={() => {setSearchQuery(''); setFilterType('all');}} 
                className="mt-3 text-sky-400 text-xs font-bold"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const hasStudies = patient.dicom_files?.length > 0;
              const firstReport = hasStudies ? patient.dicom_files.find(f => f.report)?.report : null;
              const hasReport = Boolean(firstReport);
              const isVerified = Boolean(firstReport?.is_verified);
              const isPendingImage = !hasStudies || patient.order_status === 'pending_image';
              
              return (
                <div key={patient.id} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 shadow-lg relative overflow-hidden space-y-3">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                        {patient.name}
                        {patient.gender && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">
                            {patient.gender === 'L' || patient.gender === 'male' ? 'L' : 'P'}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sky-400 font-mono text-xs bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded font-bold">
                          {patient.medical_record_number}
                        </span>
                        {patient.birth_date && (
                          <span className="text-[11px] text-slate-400">
                            {patient.birth_date}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      {isPendingImage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300 bg-amber-500/15">
                          Menunggu Citra
                        </span>
                      ) : isVerified ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/15 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Sah
                        </span>
                      ) : hasReport ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/10">
                          Draft
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-300 bg-blue-500/10">
                          Siap Ekspertise
                        </span>
                      )}
                    </div>
                  </div>

                  {patient.requested_procedure && (
                    <div className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                      <Stethoscope className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{patient.requested_procedure}</span>
                    </div>
                  )}

                  {(patient.clinical_diagnosis || patient.icd10_code) && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      {patient.icd10_code && (
                        <span className="font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                          {patient.icd10_code}
                        </span>
                      )}
                      <span className="text-slate-300 line-clamp-1">
                        {patient.clinical_diagnosis || patient.icd10_name}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-[#1e293b]">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {patient.dicom_files?.length || 0} Berkas DICOM
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isPendingImage ? (
                        <>
                          <button
                            onClick={() => setSelectedPatientForUpload(patient)}
                            className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center"
                          >
                            <UploadCloud className="w-3.5 h-3.5 mr-1" /> Unggah
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPatientForRouter(patient);
                              setShowRouterModal(true);
                            }}
                            className="p-1.5 bg-slate-800 text-sky-400 border border-slate-700 rounded-xl"
                            title="Cari di Router"
                          >
                            <Server className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {hasReport && (
                            <button
                              onClick={() => handleDownloadPdf(patient)}
                              disabled={downloadingId === patient.id}
                              className="px-2.5 py-1.5 border rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border-slate-700"
                            >
                              PDF
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/viewer/${patient.dicom_files[0].uuid}`)}
                            className="px-3 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center"
                          >
                            Buka <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        </>
                      )}

                      {can('patients.delete') && (
                        <button
                          onClick={() => handleDeletePatient(patient.id, patient.name)}
                          className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
