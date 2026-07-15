import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { Users, FileText, Monitor, ChevronRight, Activity, Calendar, Search, Filter, SearchX, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import PdfTemplate from '../components/PdfTemplate';

export default function PatientList() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get('/patients');
        setPatients(response.data);
      } catch (err) {
        setError('Failed to fetch patients.');
      } finally {
        setLoading(false);
      }
    };
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
          capturedImage: response.data.report.snapshot_url || null
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
    <div className="p-4 md:p-8 h-full bg-[#050505] overflow-auto relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00e5ff]/5 rounded-full blur-[100px] pointer-events-none" />

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
        />
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Users className="w-8 h-8 mr-3 text-[#00e5ff]" />
              Patient Worklist
            </h1>
            <p className="text-[#888] mt-2 text-sm">Select a patient to view their diagnostic imaging studies.</p>
          </div>
          
          {(user?.role === 'nurse' || user?.role === 'superadmin') && (
            <button 
              onClick={() => navigate('/upload')}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:opacity-90 transition-all flex justify-center items-center"
            >
              <FileText className="w-5 h-5 mr-2" /> Upload New DICOM
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#888] group-focus-within:text-[#00e5ff] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by Patient Name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-[#666] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all shadow-xl"
            />
          </div>
          
          <div className="relative w-full md:w-64 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="w-5 h-5 text-[#888] group-focus-within:text-[#00e5ff] transition-colors" />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-white appearance-none cursor-pointer focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all shadow-xl"
            >
              <option value="all" className="bg-[#111] text-white">All Patients</option>
              <option value="has_studies" className="bg-[#111] text-white">Has DICOM Studies</option>
              <option value="empty" className="bg-[#111] text-white">Empty Studies</option>
            </select>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mb-6 shadow-xl">
            {error}
          </div>
        )}

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[#888]">Patient Name</th>
                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[#888]">MRN</th>
                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[#888]">Date of Birth</th>
                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[#888]">Status</th>
                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[#888]">DICOM Studies</th>
                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[#888] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-[#888]">Loading records...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-[#888]">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg">No patients match your search criteria.</p>
                      <button onClick={() => {setSearchQuery(''); setFilterType('all');}} className="mt-4 text-[#00e5ff] hover:underline text-sm font-bold">Clear Filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const hasStudies = patient.dicom_files?.length > 0;
                  const hasReport = hasStudies && patient.dicom_files[0].report;
                  
                  return (
                    <tr key={patient.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5">
                        <div className="text-white font-bold text-base">{patient.name}</div>
                      </td>
                      <td className="p-5 font-mono text-sm text-[#00e5ff] bg-[#00e5ff]/5 px-3 py-1 rounded inline-block mt-4">{patient.medical_record_number}</td>
                      <td className="p-5 text-[#aaa]">{patient.birth_date}</td>
                      <td className="p-5">
                        {!hasStudies ? (
                          <span className="text-xs font-bold px-3 py-1 rounded-full border border-gray-600/30 text-gray-400 bg-gray-500/10">No Studies</span>
                        ) : hasReport ? (
                          <span className="text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Completed</span>
                        ) : (
                          <span className="text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">Pending Diagnosis</span>
                        )}
                      </td>
                      <td className="p-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/10">
                          <Activity className={`w-3 h-3 mr-1 ${hasStudies ? 'text-green-400' : 'text-[#666]'}`} />
                          {patient.dicom_files?.length || 0} Studies
                        </span>
                      </td>
                      <td className="p-5 text-right flex justify-end gap-2 items-center h-full mt-2">
                        {hasStudies ? (
                          <>
                            {hasReport && (
                              <button
                                onClick={() => handleDownloadPdf(patient)}
                                disabled={downloadingId === patient.id}
                                className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
                                title="Download PDF Report"
                              >
                                {downloadingId === patient.id ? (
                                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 mr-2" />
                                )}
                                PDF
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/viewer/${patient.dicom_files[0].uuid}`)}
                              className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center group-hover:bg-opacity-80 ${hasReport ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30' : 'bg-white/10 hover:bg-[#00e5ff] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.6)]'}`}
                            >
                              <Monitor className="w-4 h-4 mr-2" /> Viewer
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-[#666] uppercase tracking-wider bg-black/50 px-3 py-1 rounded border border-[#333]">No Data</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LAYOUT */}
        <div className="md:hidden flex flex-col gap-4">
          {loading ? (
            <div className="p-8 text-center text-[#888] bg-white/5 rounded-2xl border border-white/5 shadow-xl">Loading records...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center text-[#888] bg-white/5 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center">
              <SearchX className="w-12 h-12 mb-4 opacity-20" />
              <p>No matching patients found.</p>
              <button onClick={() => {setSearchQuery(''); setFilterType('all');}} className="mt-4 text-[#00e5ff] hover:underline text-sm font-bold">Clear Filters</button>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const hasStudies = patient.dicom_files?.length > 0;
              const hasReport = hasStudies && patient.dicom_files[0].report;
              
              return (
                <div key={patient.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00e5ff] to-[#0077ff]" />
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{patient.name}</h3>
                      <div className="text-[#00e5ff] font-mono text-xs mt-1 bg-[#00e5ff]/10 px-2 py-0.5 rounded inline-block">{patient.medical_record_number}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center text-xs font-bold text-[#888] mb-1">
                        <Calendar className="w-3 h-3 mr-1" /> {patient.birth_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#aaa] mb-1">
                        {patient.dicom_files?.length || 0} Studies Available
                      </span>
                      {!hasStudies ? (
                        <span className="text-[10px] font-bold text-gray-500">NO STUDIES</span>
                      ) : hasReport ? (
                        <span className="text-[10px] font-bold text-emerald-400">COMPLETED</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400">PENDING DIAGNOSIS</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {hasReport && (
                        <button
                          onClick={() => handleDownloadPdf(patient)}
                          disabled={downloadingId === patient.id}
                          className="px-3 py-2 border rounded-xl text-sm font-bold flex items-center active:scale-95 transition-transform bg-blue-500/10 border-blue-500/30 text-blue-400 disabled:opacity-50"
                        >
                          {downloadingId === patient.id ? (
                            <Activity className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      
                      {hasStudies ? (
                        <button
                          onClick={() => navigate(`/viewer/${patient.dicom_files[0].uuid}`)}
                          className={`px-4 py-2 border rounded-xl text-sm font-bold flex items-center active:scale-95 transition-transform ${hasReport ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gradient-to-r from-[#00e5ff]/20 to-[#0077ff]/20 border-[#00e5ff]/50 text-[#00e5ff]'}`}
                        >
                          View <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#666] uppercase bg-black/50 px-2 py-1 rounded border border-[#333]">Empty</span>
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
