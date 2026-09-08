import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { Users, FileText, Monitor, ChevronRight, Activity, Calendar, Search, Filter, SearchX, Download, Server, Trash2, ShieldCheck } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import PdfTemplate from '../components/PdfTemplate';
import RouterImportModal from '../components/RouterImportModal';

export default function PatientList() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { appLogo } = useAppContext();
  
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

  const [showRouterModal, setShowRouterModal] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/patients');
      setPatients(response.data);
    } catch (err) {
      setError('Failed to fetch patients.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete patient ${name} and all their DICOM studies? This cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`/patients/${id}`);
      fetchPatients();
    } catch (err) {
      alert('Failed to delete patient.');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

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

        // Wait for React to render the hidden template
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

  const filteredPatients = patients.filter(patient => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      patient.name.toLowerCase().includes(query) || 
      patient.medical_record_number.toLowerCase().includes(query);

    let matchesFilter = true;
    const studyCount = patient.dicom_files?.length || 0;
    
    if (filterType === 'has_studies') {
      matchesFilter = studyCount > 0;
    } else if (filterType === 'empty') {
      matchesFilter = studyCount === 0;
    }

    return matchesSearch && matchesFilter;
  });

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
          capturedImage={pdfData.capturedImage}
          relatedFiles={pdfData.relatedFiles}
        />
      )}

      {showRouterModal && (
        <RouterImportModal 
          onClose={() => setShowRouterModal(false)} 
          onImportSuccess={fetchPatients} 
        />
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Daftar Kerja Pasien &bull; Radiologi</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Worklist Pasien Radiologi
            </h1>
            <p className="text-slate-400 mt-1 text-xs md:text-sm">
              Pilih pasien untuk membuka citra DICOM, menulis hasil ekspertise, atau mengunduh salinan resmi.
            </p>
          </div>
          
          {(can('dicom.upload') || can('dicom.import_router')) && (
            <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
              {can('dicom.import_router') && (
                <button 
                  onClick={() => setShowRouterModal(true)}
                  className="w-full md:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex justify-center items-center shadow-sm cursor-pointer"
                >
                  <Server className="w-4 h-4 mr-2 text-sky-400" /> Import Router PACS
                </button>
              )}
              {can('dicom.upload') && (
                <button 
                  onClick={() => navigate('/upload')}
                  className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-[0_4px_20px_rgba(14,165,233,0.3)] transition-all flex justify-center items-center cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" /> Unggah Studi Baru
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan Nama Pasien atau Nomor Rekam Medis (No. RM)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#111827] border border-[#1e293b] rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="relative w-full md:w-64 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#111827] border border-[#1e293b] rounded-xl text-xs md:text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm"
            >
              <option value="all" className="bg-[#111827] text-white">Semua Pasien</option>
              <option value="has_studies" className="bg-[#111827] text-white">Memiliki Citra DICOM</option>
              <option value="empty" className="bg-[#111827] text-white">Belum Ada Citra</option>
            </select>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl mb-6 shadow-sm text-xs">
            {error}
          </div>
        )}

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-[#111827] border border-[#1e293b] rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#0e1424] border-b border-[#1e293b]">
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">Nama Pasien</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">No. RM</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">Tanggal Lahir</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">Status Hasil</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">Studi DICOM</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500 text-xs">Memuat data pasien...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-semibold text-slate-400">Tidak ada pasien yang cocok dengan kriteria pencarian.</p>
                      <button onClick={() => {setSearchQuery(''); setFilterType('all');}} className="mt-3 text-sky-400 hover:underline text-xs font-bold">Reset Pencarian</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const hasStudies = patient.dicom_files?.length > 0;
                  const firstReport = hasStudies ? patient.dicom_files.find(f => f.report)?.report : null;
                  const hasReport = Boolean(firstReport);
                  const isVerified = Boolean(firstReport?.is_verified);
                  
                  return (
                    <tr key={patient.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="p-4 align-middle">
                        <div className="text-white font-bold text-sm max-w-[250px] truncate" title={patient.name}>{patient.name}</div>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="font-mono text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md inline-block whitespace-nowrap">
                          {patient.medical_record_number}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 text-xs align-middle whitespace-nowrap">{patient.birth_date}</td>
                      <td className="p-4 align-middle">
                        {!hasStudies ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-400 bg-slate-800/60 whitespace-nowrap">Belum Ada Citra</span>
                        ) : isVerified ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/15 whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Terverifikasi
                          </span>
                        ) : hasReport ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/10 whitespace-nowrap">
                            Draft Ekspertise
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 whitespace-nowrap">
                            Menunggu Bacaan
                          </span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 whitespace-nowrap">
                          <Activity className={`w-3.5 h-3.5 mr-1.5 ${hasStudies ? 'text-sky-400' : 'text-slate-500'}`} />
                          {patient.dicom_files?.length || 0} Studi
                        </span>
                      </td>
                      <td className="p-4 text-right align-middle">
                        <div className="flex justify-end gap-2 items-center">
                        {hasStudies ? (
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
                          </>
                        ) : (
                          <span className="text-xs font-medium text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 whitespace-nowrap">Kosong</span>
                        )}
                        {can('patients.delete') && (
                          <button
                            onClick={() => handleDeletePatient(patient.id, patient.name)}
                            className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all ml-1 cursor-pointer"
                            title="Hapus Pasien & Arsip Studi"
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
            <div className="p-8 text-center text-slate-500 bg-[#111827] rounded-2xl border border-[#1e293b]">Memuat data pasien...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-[#111827] rounded-2xl border border-[#1e293b] flex flex-col items-center">
              <SearchX className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-xs font-semibold">Tidak ada pasien yang cocok.</p>
              <button onClick={() => {setSearchQuery(''); setFilterType('all');}} className="mt-3 text-sky-400 text-xs font-bold">Reset</button>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const hasStudies = patient.dicom_files?.length > 0;
              const firstReport = hasStudies ? patient.dicom_files.find(f => f.report)?.report : null;
              const hasReport = Boolean(firstReport);
              const isVerified = Boolean(firstReport?.is_verified);
              
              return (
                <div key={patient.id} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <h3 className="text-white font-bold text-sm">{patient.name}</h3>
                      <div className="text-sky-400 font-mono text-xs mt-1 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded inline-block">{patient.medical_record_number}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center text-xs font-medium text-slate-400">
                        <Calendar className="w-3 h-3 mr-1" /> {patient.birth_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#1e293b]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {patient.dicom_files?.length || 0} Studi
                      </span>
                      {!hasStudies ? (
                        <span className="text-[10px] font-bold text-slate-500">BELUM ADA STUDI</span>
                      ) : isVerified ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> TERVERIFIKASI
                        </span>
                      ) : hasReport ? (
                        <span className="text-[10px] font-bold text-sky-400">DRAFT</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400">PENDING</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {hasReport && (
                        <button
                          onClick={() => handleDownloadPdf(patient)}
                          disabled={downloadingId === patient.id}
                          className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center transition-all disabled:opacity-50 ${
                            isVerified 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                          }`}
                          title={isVerified ? 'Cetak PDF Sah Terverifikasi' : 'Cetak Draft PDF'}
                        >
                          {downloadingId === patient.id ? (
                            <Activity className="w-3.5 h-3.5 animate-spin" />
                          ) : isVerified ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      
                      {hasStudies ? (
                        <button
                          onClick={() => navigate(`/viewer/${patient.dicom_files[0].uuid}`)}
                          className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold flex items-center ${
                            hasReport 
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                              : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                          }`}
                        >
                          Buka <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Kosong</span>
                      )}
                      
                      {can('patients.delete') && (
                        <button
                          onClick={() => handleDeletePatient(patient.id, patient.name)}
                          className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center active:scale-95 transition-transform cursor-pointer"
                          title="Hapus Pasien & Arsip Studi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  );
}
