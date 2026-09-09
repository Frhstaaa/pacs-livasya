import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import OHIFViewerComponent from '../components/OHIFViewerComponent';
import { 
  CheckCircle, 
  AlertCircle, 
  Save, 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  X, 
  Activity, 
  Download, 
  Maximize, 
  Minimize, 
  Layers, 
  Film,
  ShieldCheck,
  Lock,
  Unlock,
  Printer,
  Users,
  ArrowRight,
  Monitor,
  Stethoscope,
  ClipboardPlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PdfTemplate from '../components/PdfTemplate';
import VoiceDictation from '../components/VoiceDictation';
import ReportTemplateModal from '../components/ReportTemplateModal';

export default function Viewer() {
  const { uuid } = useParams();
  const { user, can } = useAuth();
  const { appLogo, appName, hospitalName } = useAppContext();
  
  const [report, setReport] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // Verification & Digital Signature State
  const [isLocked, setIsLocked] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Multi-study / Examination States
  const [relatedFiles, setRelatedFiles] = useState([]);
  const [activeUuid, setActiveUuid] = useState(uuid);

  // Lifecycle flags
  const [isReportLoaded, setIsReportLoaded] = useState(false);
  const [isStateRestored, setIsStateRestored] = useState(false);

  // Voice Dictation & Real-time Typing States
  const [interimVoice, setInterimVoice] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceResetKey, setVoiceResetKey] = useState(0);
  const textareaRef = useRef(null);

  const lastFinalTranscriptRef = useRef({ text: '', time: 0 });

  // Handle final speech transcript with deduplication guard
  const handleVoiceFinal = useCallback((finalText) => {
    if (!finalText || !finalText.trim()) return;
    const cleanText = finalText.trim();
    const now = Date.now();

    // Prevent duplicate emissions for the same spoken utterance within 500ms
    if (lastFinalTranscriptRef.current.text === cleanText && (now - lastFinalTranscriptRef.current.time) < 500) {
      return;
    }
    lastFinalTranscriptRef.current = { text: cleanText, time: now };

    setReport(prev => {
      if (!prev || !prev.trim()) {
        return cleanText;
      }
      const separator = prev.endsWith('\n') || prev.endsWith(' ') ? '' : (cleanText.startsWith('\n') ? '' : ' ');
      return prev + separator + cleanText;
    });
    setInterimVoice('');
  }, []);

  // Handle real-time interim speech transcript (words streaming live as spoken)
  const handleVoiceInterim = useCallback((interim) => {
    setInterimVoice(interim ? interim.trim() : '');
  }, []);

  // Handle manual typing in textarea (seamless typing while dictating)
  const handleReportChange = (e) => {
    const val = e.target.value;
    setReport(val);
    if (interimVoice) {
      setInterimVoice('');
      setVoiceResetKey(prev => prev + 1); // Reset recognition buffer so it doesn't duplicate
    }
  };

  // Compute real-time display text combining committed report + live voice interim
  const displayReport = interimVoice 
    ? (report 
        ? (report.endsWith('\n') || report.endsWith(' ') ? `${report}${interimVoice}` : `${report} ${interimVoice}`) 
        : interimVoice)
    : report;

  // Auto-scroll textarea as real-time voice typing flows in
  useEffect(() => {
    if (isVoiceListening && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [displayReport, isVoiceListening]);

  // PDF Export States
  const [patientData, setPatientData] = useState(null);
  const [dicomFileData, setDicomFileData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const pdfRef = useRef();

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerContainerRef = useRef(null);

  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    if (uuid) {
      setActiveUuid(uuid);
      const fetchReport = async () => {
        try {
          const response = await axios.get(`/report/${uuid}`);
          if (response.data.dicom_file) {
            setDicomFileData(response.data.dicom_file);
            setPatientData(response.data.dicom_file.patient);
          }
          if (response.data.related_files) {
            setRelatedFiles(response.data.related_files);
          }
          if (response.data.report) {
            setReport(response.data.report.content);
            setDoctorData(response.data.report.doctor);
            setReportData(response.data.report);
            if (response.data.report.is_verified) {
              setIsLocked(true);
            }
          }
        } catch (err) {
          console.log('No existing report found.');
        } finally {
          setIsReportLoaded(true);
        }
      };
      fetchReport();
    }
  }, [uuid]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (uuid && isReportLoaded) {
      if (!reportData?.annotation_state && !reportData?.viewport_state) {
        setIsStateRestored(true);
        return;
      }

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        try {
          const iframe = document.querySelector('iframe[title="OHIF DICOM Viewer"]');
          if (iframe && iframe.contentWindow && iframe.contentWindow.cornerstoneTools && iframe.contentWindow.cornerstone) {
            
            const elements = iframe.contentWindow.cornerstone.getEnabledElements();
            const isImageLoaded = elements && elements.length > 0 && elements[0].image;

            if (!isImageLoaded) return; // Wait for image to load

            // Restore Tool State
            const stateManager = iframe.contentWindow.cornerstoneTools.globalImageIdSpecificToolStateManager;
            if (stateManager && reportData.annotation_state) {
              const state = JSON.parse(reportData.annotation_state);
              stateManager.restoreToolState(state);
            }

            // Restore Viewport State
            if (reportData.viewport_state) {
              const savedViewport = JSON.parse(reportData.viewport_state);
              const currentViewport = iframe.contentWindow.cornerstone.getViewport(elements[0].element);
              
              if (currentViewport) {
                // Merge saved viewport state, BUT preserve the current screen-specific scale and translation
                const newViewport = Object.assign({}, currentViewport, savedViewport);
                newViewport.scale = currentViewport.scale;
                newViewport.translation = currentViewport.translation;
                
                iframe.contentWindow.cornerstone.setViewport(elements[0].element, newViewport);
              }
            }
            
            // Force redraw
            elements.forEach(e => {
                iframe.contentWindow.cornerstone.updateImage(e.element);
            });
            
            // Prevent OHIF from resetting viewport on resize
            if (!iframe.contentWindow.cornerstone._isResizePatched) {
              const originalResize = iframe.contentWindow.cornerstone.resize;
              iframe.contentWindow.cornerstone.resize = function(element, fitToWindow) {
                  // Force fitToWindow to false so it doesn't reset zoom/pan on mobile resize
                  return originalResize.call(iframe.contentWindow.cornerstone, element, false);
              };
              iframe.contentWindow.cornerstone._isResizePatched = true;
            }
            
            setIsStateRestored(true);
            clearInterval(interval);
          }
        } catch (e) {
          console.warn("Error restoring state:", e);
        }
        if (attempts > 40) {
          setIsStateRestored(true);
          clearInterval(interval); // Stop trying after 20 seconds
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [uuid, isReportLoaded, reportData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const getCanvasImage = () => {
    try {
      const iframe = document.querySelector('iframe[title="OHIF DICOM Viewer"]');
      if (!iframe) return null;
      const canvas = iframe.contentWindow.document.querySelector('canvas');
      if (!canvas) return null;
      return canvas.toDataURL('image/jpeg', 1.0);
    } catch (e) {
      console.warn("Could not capture canvas image:", e);
      return null;
    }
  };

  const getAnnotationState = () => {
    try {
      const iframe = document.querySelector('iframe[title="OHIF DICOM Viewer"]');
      if (!iframe || !iframe.contentWindow.cornerstoneTools) return null;
      const stateManager = iframe.contentWindow.cornerstoneTools.globalImageIdSpecificToolStateManager;
      if (stateManager) {
          const state = stateManager.saveToolState();
          return JSON.stringify(state);
      }
      return null;
    } catch (e) {
      // Ignore errors for autosave background polling
      return null;
    }
  };

  const getViewportState = () => {
    try {
      const iframe = document.querySelector('iframe[title="OHIF DICOM Viewer"]');
      if (!iframe || !iframe.contentWindow.cornerstone) return null;
      const elements = iframe.contentWindow.cornerstone.getEnabledElements();
      if (elements && elements.length > 0 && elements[0].image) {
        const viewport = iframe.contentWindow.cornerstone.getViewport(elements[0].element);
        return JSON.stringify(viewport);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Auto-Save Loop (only when not verified or unlocked)
  const autoSaveTimerRef = useRef(null);
  const lastSavedStateRef = useRef({ annotation: null, viewport: null, text: null });

  useEffect(() => {
    if (uuid && isStateRestored && can('reports.create') && (!reportData?.is_verified || !isLocked)) {
      autoSaveTimerRef.current = setInterval(async () => {
         const annotationState = getAnnotationState();
         const viewportState = getViewportState();
         
         const hasAnnotationChanged = annotationState !== lastSavedStateRef.current.annotation;
         const hasViewportChanged = viewportState !== lastSavedStateRef.current.viewport;
         const hasTextChanged = report !== lastSavedStateRef.current.text;

         // Initialize refs if this is the first tick, but don't save yet to avoid immediate save
         if (lastSavedStateRef.current.annotation === null && lastSavedStateRef.current.viewport === null) {
            lastSavedStateRef.current = { annotation: annotationState, viewport: viewportState, text: report };
            return;
         }

         if (hasAnnotationChanged || hasViewportChanged || hasTextChanged) {
            lastSavedStateRef.current = { annotation: annotationState, viewport: viewportState, text: report };
            try {
                await axios.post('/report', { 
                  uuid, 
                  content: report || '',
                  annotation_state: annotationState,
                  viewport_state: viewportState
                });
            } catch (err) {}
         }
      }, 1500); 

      return () => clearInterval(autoSaveTimerRef.current);
    }
  }, [uuid, user, report, isStateRestored, reportData?.is_verified, isLocked]);

  const handleSaveReport = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const base64Image = getCanvasImage();
      const annotationState = getAnnotationState();
      const viewportState = getViewportState();
      
      const contentToSave = displayReport || '';
      const res = await axios.post('/report', { 
        uuid, 
        content: contentToSave,
        image: base64Image,
        annotation_state: annotationState,
        viewport_state: viewportState
      });
      setReport(contentToSave);
      setInterimVoice('');
      if (res.data.report) {
        setReportData(res.data.report);
      }
      setMessage({ type: 'success', text: 'Ekspertise berhasil disimpan!' });
      if (!doctorData && res.data.report?.doctor) {
         setDoctorData(res.data.report.doctor);
      } else if (!doctorData) {
         setDoctorData(user);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menyimpan ekspertise.' });
    } finally {
      setLoading(false);
    }
  };

  // Digital Signature & Verification Handlers
  const handleVerifyReport = async () => {
    if (!uuid) return;
    const contentToVerify = displayReport || report || '';
    if (!contentToVerify.trim()) {
      setMessage({ type: 'error', text: 'Ekspertise tidak boleh kosong sebelum diverifikasi & disahkan.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // 1. Ensure latest content and canvas image are committed first
      const base64Image = getCanvasImage();
      const annotationState = getAnnotationState();
      const viewportState = getViewportState();
      
      await axios.post('/report', { 
        uuid, 
        content: contentToVerify,
        image: base64Image,
        annotation_state: annotationState,
        viewport_state: viewportState
      });
      setReport(contentToVerify);
      setInterimVoice('');

      // 2. Officially sign & verify report
      const res = await axios.post('/report/verify', { uuid });
      setReportData(res.data.report);
      setIsLocked(true);
      if (res.data.report?.doctor) {
        setDoctorData(res.data.report.doctor);
      }
      setMessage({ type: 'success', text: 'Ekspertise berhasil diverifikasi dan disahkan dengan tanda tangan digital resmi!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal memverifikasi ekspertise.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnverifyReport = async () => {
    if (!window.confirm('Buka kunci verifikasi untuk merevisi ekspertise ini? Status verifikasi akan direset hingga Anda mengesahkan ulang.')) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post('/report/unverify', { uuid });
      setReportData(res.data.report);
      setIsLocked(false);
      setMessage({ type: 'success', text: 'Kunci verifikasi dibuka. Silakan lakukan revisi ekspertise lalu klik Verifikasi ulang.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal membuka kunci verifikasi.' });
    } finally {
      setLoading(false);
    }
  };

  // PDF Export Directly in Viewer (Dynamic Import for Optimal Bundle Performance)
  const handleExportPdf = async () => {
    if (!pdfRef.current) return;
    setPdfLoading(true);
    
    // Capture latest snapshot if not present
    const base64Image = getCanvasImage();
    if (base64Image) {
      setCapturedImage(base64Image);
    }

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      setTimeout(() => {
        const element = pdfRef.current;
        const patientName = patientData?.name ? patientData.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Pasien';
        const opt = {
          margin: 0,
          filename: `Hasil_Radiologi_${patientName}_${uuid?.substring(0, 8)}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
          setPdfLoading(false);
        }).catch(err => {
          console.error('PDF export error:', err);
          setPdfLoading(false);
        });
      }, 400);
    } catch (err) {
      console.error('Failed to load PDF engine:', err);
      setPdfLoading(false);
    }
  };

  // Structured Template Selection
  const handleSelectTemplate = (templateContent, mode = 'replace') => {
    if (!templateContent) return;
    if (mode === 'replace') {
      setReport(templateContent);
    } else {
      setReport(prev => prev ? (prev.trim() + '\n\n' + templateContent.trim()) : templateContent);
    }
    setInterimVoice('');
    setMessage({ type: 'success', text: `Template ekspertise medis berhasil ${mode === 'replace' ? 'diterapkan' : 'disisipkan'}!` });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };



  const handleAnalyzeWithAI = async () => {
    try {
      const base64Image = getCanvasImage();
      if (!base64Image) {
        setMessage({ type: 'error', text: 'No image is currently visible on the viewer. Please load an image first.' });
        return;
      }

      setAiLoading(true);
      setShowAiModal(true);
      setAiResult(''); 

      const response = await axios.post('/ai/analyze', { image: base64Image });
      
      if (response.data.analysis) {
        setAiResult(response.data.analysis);
      } else {
        setAiResult('AI failed to return an analysis.');
      }

    } catch (error) {
      console.warn('AI analysis error:', error);
      const errMsg = error.response?.data?.error || error.response?.data?.message || 'Gagal berkomunikasi dengan server AI.';
      setAiResult(`### ⚠️ Layanan AI Memerlukan Konfigurasi API Key\n\n${errMsg}\n\n---\n\n**Panduan Aktivasi Asisten AI Radiologi:**\n1. Buka file \`.env\` pada server aplikasi\n2. Tambahkan baris: \`OPENAI_API_KEY=sk-or-v1-...\` *(dapatkan API key gratis atau berbayar di openrouter.ai / openai.com)*\n3. Muat ulang halaman, maka fitur analisis radiologi AI akan langsung bekerja.`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiResult = () => {
    const cleanText = aiResult
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/### /g, '')
      .replace(/## /g, '')
      .replace(/# /g, '');
      
    setReport(prev => prev ? prev + '\n\n---\nAI Diagnosis:\n' + cleanText : cleanText);
    setShowAiModal(false);
  };

  const handleInsertClinicalDiagnosis = () => {
    if (!patientData) return;
    const diagText = patientData.clinical_diagnosis || patientData.clinical_notes || '';
    const icdText = patientData.icd10_code ? ` (ICD-10: ${patientData.icd10_code}${patientData.icd10_name ? ' - ' + patientData.icd10_name : ''})` : '';
    const refDoc = patientData.referring_physician ? `Dokter Perujuk: ${patientData.referring_physician}` : '';

    let snippet = `INDIKASI KLINIS / DIAGNOSA:\n- ${diagText}${icdText}`;
    if (refDoc) snippet += `\n- ${refDoc}`;
    snippet += '\n\n';

    if (!report || report.trim() === '') {
      setReport(snippet);
    } else if (!report.includes('INDIKASI KLINIS') && !report.includes(diagText)) {
      setReport(snippet + report);
    } else {
      setMessage({ type: 'success', text: 'Indikasi klinis sudah tercantum dalam ekspertise.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3500);
      return;
    }
    setMessage({ type: 'success', text: 'Diagnosa klinis SIMRS berhasil disisipkan ke lembar ekspertise!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#000] text-white h-full overflow-hidden relative">

      {/* Viewer Main Area */}
      <div className="flex-1 flex flex-col h-[50vh] md:h-full relative z-10 border-b md:border-b-0 md:border-r border-white/10">
        
        {/* Multi-examination Switcher Bar */}
        {relatedFiles && relatedFiles.length > 1 && (
          <div className="bg-[#0b0b0b] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <span className="flex items-center text-xs font-bold text-[#888] uppercase tracking-wider mr-1 shrink-0">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-[#00e5ff]" />
                Pemeriksaan Pasien ({relatedFiles.length}):
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {relatedFiles.map((file, idx) => {
                  const isActive = (activeUuid || uuid) === file.uuid;
                  return (
                    <button
                      key={file.uuid}
                      type="button"
                      onClick={() => setActiveUuid(file.uuid)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isActive 
                          ? 'bg-[#00e5ff] text-black shadow-[0_0_12px_rgba(0,229,255,0.4)] font-bold' 
                          : 'bg-white/5 text-[#aaa] hover:text-white hover:bg-white/10 border border-white/10'
                      }`}
                      title={file.file_name}
                    >
                      <Film className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#888]'}`} />
                      <span>Foto {idx + 1}: {file.file_name?.length > 18 ? file.file_name.substring(0, 15) + '...' : (file.file_name || `Pemeriksaan ${idx + 1}`)}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-black ml-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="hidden xl:flex items-center text-[11px] text-[#888] bg-white/5 px-2.5 py-1 rounded border border-white/10 shrink-0">
              💡 Menu <strong>Layout (1x2 / 1x3)</strong> di toolbar atas untuk melihat berdampingan
            </div>
          </div>
        )}

        <div ref={viewerContainerRef} className="flex-1 bg-black flex items-center justify-center overflow-hidden relative group">
          {uuid ? (
            <>
              <OHIFViewerComponent uuid={activeUuid || uuid} />
              
              {/* Fullscreen Toggle Button - placed at bottom right to avoid covering OHIF toolbar icons */}
              <button 
                onClick={toggleFullscreen}
                className="absolute bottom-4 right-4 z-20 p-2.5 bg-black/70 hover:bg-[#00e5ff]/20 text-[#aaa] hover:text-[#00e5ff] rounded-xl backdrop-blur-md transition-all opacity-60 hover:opacity-100 group-hover:opacity-100 border border-white/10 hover:border-[#00e5ff]/50 shadow-2xl flex items-center justify-center cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <div className="text-center p-8 bg-[#111827] border border-slate-800 rounded-3xl max-w-md shadow-2xl space-y-4">
              <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-sky-500/10">
                <Monitor className="w-8 h-8 text-sky-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest">
                  Radiology Viewer Workstation
                </span>
                <h3 className="text-base font-bold text-white mt-2.5">
                  Belum Ada Pemeriksaan Pasien yang Dipilih
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Untuk memuat citra rontgen/CT/MRI, melihat multi-series, dan mengisi ekspertise dokter, silakan pilih pasien dari Daftar Pasien terlebih dahulu.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-sky-500/20"
                >
                  <Users className="w-4 h-4" />
                  <span>Buka Daftar Pasien (Worklist)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnosis / Reporting Panel */}
      <div className={`w-full md:w-[450px] bg-[#080808] border-l border-white/5 flex flex-col transition-all duration-300 ease-in-out absolute md:relative bottom-0 left-0 z-30 md:z-auto ${isReportOpen ? 'h-[60vh] md:h-full shadow-[0_-20px_50px_rgba(0,0,0,0.8)]' : 'h-[60px] md:h-full'} shadow-2xl`}>
        
        {/* Mobile Toggle Button */}
        <button 
          onClick={() => setIsReportOpen(!isReportOpen)}
          className="md:hidden w-full h-[60px] flex items-center justify-between px-6 bg-[#111] border-b border-white/10"
        >
          <span className="font-bold text-[#00e5ff] flex items-center">
            <FileText className="w-5 h-5 mr-2" /> Clinical Report
          </span>
          {isReportOpen ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronUp className="w-5 h-5 text-white" />}
        </button>

        {/* Panel Content */}
        <div className={`flex-1 flex flex-col p-6 overflow-y-auto ${!isReportOpen ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex flex-col mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="hidden md:flex text-xl font-bold text-white items-center">
                <FileText className="w-6 h-6 mr-3 text-[#00e5ff]" /> 
                Clinical Report
              </h3>
            </div>
            {patientData && (
              <div className="space-y-2.5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-[#aaa]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white truncate max-w-[200px]">{patientData.name}</span>
                    <span className="text-[#00e5ff] font-mono">{patientData.medical_record_number}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#888]">
                    <span>{relatedFiles.length > 1 ? `${relatedFiles.length} Pemeriksaan dalam 1 Ekspertise` : '1 Pemeriksaan DICOM'}</span>
                    <span>{patientData.birth_date}</span>
                  </div>
                </div>

                {/* Acuan Diagnosa SIMRS / Indikasi Klinis Card */}
                {(patientData.clinical_diagnosis || patientData.clinical_notes || patientData.icd10_code) && (
                  <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/40 to-sky-500/5 border border-amber-500/30 rounded-xl p-3 text-xs shadow-md">
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <Stethoscope className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] uppercase tracking-wider">Acuan Diagnosa SIMRS</span>
                      </div>
                      {patientData.icd10_code && (
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold"
                          title={patientData.icd10_name || 'Kode ICD-10'}
                        >
                          ICD-10: {patientData.icd10_code}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-200 font-medium text-[11px] leading-relaxed mb-2 bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <div className="text-white font-semibold">
                        {patientData.clinical_diagnosis || patientData.clinical_notes}
                      </div>
                      {patientData.icd10_name && patientData.icd10_name !== patientData.clinical_diagnosis && (
                        <div className="text-slate-400 text-[10px] mt-1 italic">
                          {patientData.icd10_name}
                        </div>
                      )}
                      {patientData.referring_physician && (
                        <div className="text-[10px] text-sky-300 mt-1.5 flex items-center gap-1">
                          <span className="text-slate-400">Dokter Perujuk:</span>
                          <span className="font-semibold">{patientData.referring_physician}</span>
                        </div>
                      )}
                    </div>

                    {can('reports.create') && uuid && (!reportData?.is_verified || !isLocked) && (
                      <button
                        type="button"
                        onClick={handleInsertClinicalDiagnosis}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                        title="Sisipkan diagnosa dan indikasi klinis ini langsung ke bagian atas ekspertise dokter"
                      >
                        <ClipboardPlus className="w-3.5 h-3.5" />
                        <span>📋 Sisipkan ke Lembar Ekspertise</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {message.text && (
            <div className={`p-4 rounded-xl mb-6 flex items-center text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-2 shrink-0" />}
              {message.text}
            </div>
          )}

          {!uuid ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3 my-auto">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-sky-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-white">Lembar Ekspertise Belum Aktif</div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
                Pilih salah satu pemeriksaan pasien dari Worklist untuk mengaktifkan lembar ekspertise klinis, template medis, dikte suara AI, dan tanda tangan digital.
              </p>
              <Link
                to="/"
                className="mt-2 text-xs font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-lg"
              >
                <span>Pilih Pasien di Daftar Pasien</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <label className="block text-xs font-bold text-[#888] uppercase tracking-wider">Findings & Diagnosis</label>
                
                {can('reports.create') && uuid && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Structured Medical Template Button */}
                    {can('reports.templates') && (
                      <button 
                        onClick={() => setShowTemplateModal(true)}
                        disabled={reportData?.is_verified && isLocked}
                        className="flex items-center text-xs font-bold px-3 py-1.5 bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 rounded-lg hover:bg-[#00e5ff] hover:text-black transition-all shadow-[0_0_10px_rgba(0,229,255,0.15)] disabled:opacity-40 cursor-pointer"
                        title="Pilih template hasil ekspertise baku"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> Template Medis
                      </button>
                    )}

                    {/* AI Diagnosis Assist */}
                    {can('ai.analyze') && (
                      <button 
                        onClick={handleAnalyzeWithAI}
                        disabled={reportData?.is_verified && isLocked}
                        className="flex items-center text-xs font-bold px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500 hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] disabled:opacity-40 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 mr-1.5" /> AI Assist
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Official Digital Verification Banner */}
              {reportData?.is_verified && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <span>TERVERIFIKASI & TERTANDA TANGAN DIGITAL</span>
                        </div>
                        <div className="text-[11px] text-[#aaa] mt-0.5">
                          Token: <span className="font-mono text-emerald-300 font-semibold">{reportData.verification_token}</span>
                        </div>
                      </div>
                    </div>

                    {can('reports.unverify') && (
                      isLocked ? (
                        <button
                          onClick={handleUnverifyReport}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-amber-300 hover:text-white flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                          title="Buka kunci untuk melakukan revisi ekspertise"
                        >
                          <Unlock className="w-3 h-3 text-amber-400" />
                          Revisi
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          Mode Revisi
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
              
              {can('reports.create') && can('voice.dictation') && uuid && (!reportData?.is_verified || !isLocked) && (
                <VoiceDictation 
                  onFinal={handleVoiceFinal}
                  onInterim={handleVoiceInterim}
                  onListeningChange={setIsVoiceListening}
                  resetKey={voiceResetKey}
                  disabled={loading} 
                />
              )}

              <div className="relative flex-1 flex flex-col mb-5">
                <textarea 
                  ref={textareaRef}
                  value={displayReport}
                  onChange={handleReportChange}
                  readOnly={reportData?.is_verified && isLocked}
                  disabled={!can('reports.create') || !uuid}
                  className={`w-full flex-1 bg-white/5 border rounded-2xl p-4 text-white focus:outline-none resize-none transition-all text-sm md:text-base leading-relaxed ${
                    reportData?.is_verified && isLocked
                      ? 'border-emerald-500/30 bg-emerald-950/10 opacity-90 cursor-not-allowed'
                      : isVoiceListening 
                        ? 'border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/50' 
                        : 'border-white/10 focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]'
                  } disabled:opacity-50`}
                  placeholder={can('reports.create') ? "Ketik temuan klinis, gunakan Template Medis, atau dikte suara..." : "Belum ada ekspertise yang dibuat (Hanya Baca)."}
                />
                
                {/* Real-time Voice Dictation Status Indicator */}
                {isVoiceListening && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1 bg-black/80 border border-rose-500/40 rounded-full text-[11px] text-rose-300 font-mono shadow-lg backdrop-blur-md animate-pulse pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>{interimVoice ? 'Mengetik realtime...' : 'Mendengarkan suara...'}</span>
                  </div>
                )}
              </div>
                       {can('reports.create') && uuid && (
                <div className="space-y-2.5">
                  {reportData?.is_verified ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button 
                        onClick={handleExportPdf}
                        disabled={pdfLoading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:opacity-95 transition-all flex justify-center items-center shadow-[0_0_20px_rgba(16,185,129,0.3)] text-sm cursor-pointer"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        {pdfLoading ? 'Menyiapkan...' : 'Cetak Dokumen Resmi'}
                      </button>

                      {can('reports.unverify') && isLocked && (
                        <button 
                          onClick={handleUnverifyReport}
                          className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all flex justify-center items-center text-sm border border-white/10 cursor-pointer"
                        >
                          <Unlock className="w-4 h-4 mr-2 text-amber-400" />
                          Revisi Hasil
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button 
                          onClick={handleSaveReport}
                          disabled={loading}
                          className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all flex justify-center items-center text-sm border border-white/15 cursor-pointer"
                        >
                          <Save className="w-4 h-4 mr-2 text-sky-400" />
                          {loading ? 'Menyimpan...' : 'Simpan Draft'}
                        </button>

                        {can('reports.verify') && (
                          <button 
                            onClick={handleVerifyReport}
                            disabled={loading || !report?.trim()}
                            className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:opacity-95 transition-all flex justify-center items-center shadow-[0_0_20px_rgba(14,165,233,0.3)] text-sm disabled:opacity-50 cursor-pointer"
                            title="Sahkan dan berikan tanda tangan digital resmi pada dokumen ini"
                          >
                            <ShieldCheck className="w-4 h-4 mr-2 text-white" />
                            {loading ? 'Memproses...' : 'Verifikasi & TTD'}
                          </button>
                        )}
                      </div>

                      {report && (
                        <button
                          onClick={handleExportPdf}
                          disabled={pdfLoading}
                          className="w-full py-1.5 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          {pdfLoading ? 'Membuat Draft...' : 'Pratinjau / Cetak Draft PDF'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
            
          {!can('reports.create') && (
            <div className="text-xs text-[#888] text-center p-4 bg-white/5 border border-white/5 rounded-xl mt-4">
              <span className="font-bold text-sky-400 block mb-1">Mode Hanya Baca (View Only)</span>
              Akun Anda tidak memiliki izin untuk menulis atau menandatangani ekspertise medis.
            </div>
          )}
          </div>
        </div>

      {/* --- AI Pop-up Modal --- */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-full animate-in fade-in zoom-in duration-300 relative">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-purple-500/10 blur-[100px] pointer-events-none" />

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 relative z-10 bg-black/20">
              <h2 className="text-xl font-bold text-white flex items-center">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                AI Diagnosis Assist
              </h2>
              <button 
                onClick={() => setShowAiModal(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-[#888] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 relative z-10 text-sm md:text-base leading-relaxed text-[#ccc]">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Analyzing Image...</h3>
                  <p className="text-[#888] text-center max-w-xs">Our advanced AI model is reading the current view of your DICOM image. This may take a few seconds.</p>
                </div>
              ) : (
                <div className="max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mb-4 mt-6 border-b border-white/10 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mb-3 mt-5" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold text-purple-400 mb-2 mt-4" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 text-[#ccc] leading-relaxed text-sm md:text-base" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-[#ccc]" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-[#ccc]" {...props} />,
                      li: ({node, ...props}) => <li className="text-sm md:text-base" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-[#00e5ff] font-bold tracking-wide" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 italic bg-white/5 rounded-r-lg text-[#aaa]" {...props} />
                    }}
                  >
                    {aiResult}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!aiLoading && (
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 relative z-10 bg-black/20">
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleApplyAiResult}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white rounded-xl font-bold flex items-center transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                  <Activity className="w-4 h-4 mr-2" /> Apply to Findings
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden PDF Template for Direct Printing */}
      <PdfTemplate 
        ref={pdfRef}
        report={reportData || { content: report, is_verified: false }}
        dicomFile={dicomFileData}
        patient={patientData}
        doctor={doctorData || user}
        appLogo={appLogo}
        appName={appName}
        hospitalName={hospitalName}
        capturedImage={capturedImage || reportData?.snapshot_url}
        relatedFiles={relatedFiles}
      />

      {/* Structured Medical Report Template Modal */}
      <ReportTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
        currentReportText={report}
        defaultModality={dicomFileData?.file_name?.includes('CT') ? 'CT' : (dicomFileData?.file_name?.includes('MR') ? 'MR' : 'DX')}
      />
    </div>
  );
}
