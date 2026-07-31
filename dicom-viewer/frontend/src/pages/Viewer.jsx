import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import OHIFViewerComponent from '../components/OHIFViewerComponent';
import { CheckCircle, AlertCircle, Save, FileText, ChevronUp, ChevronDown, Sparkles, X, Activity, Download, Maximize, Minimize } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import PdfTemplate from '../components/PdfTemplate';

export default function Viewer() {
  const { uuid } = useParams();
  const { user } = useAuth();
  const { appLogo } = useAppContext();
  
  const [report, setReport] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // Lifecycle flags
  const [isReportLoaded, setIsReportLoaded] = useState(false);
  const [isStateRestored, setIsStateRestored] = useState(false);

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
      const fetchReport = async () => {
        try {
          const response = await axios.get(`/report/${uuid}`);
          if (response.data.dicom_file) {
            setDicomFileData(response.data.dicom_file);
            setPatientData(response.data.dicom_file.patient);
          }
          if (response.data.report) {
            setReport(response.data.report.content);
            setDoctorData(response.data.report.doctor);
            setReportData(response.data.report);
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

  // Auto-Save Loop
  const autoSaveTimerRef = useRef(null);
  const lastSavedStateRef = useRef({ annotation: null, viewport: null, text: null });

  useEffect(() => {
    if (uuid && isStateRestored && (user?.role === 'doctor' || user?.role === 'superadmin')) {
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
  }, [uuid, user, report, isStateRestored]);

  const handleSaveReport = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const base64Image = getCanvasImage();
      const annotationState = getAnnotationState();
      const viewportState = getViewportState();
      
      const res = await axios.post('/report', { 
        uuid, 
        content: report || '',
        image: base64Image,
        annotation_state: annotationState,
        viewport_state: viewportState
      });
      setMessage({ type: 'success', text: 'Report saved successfully!' });
      if (!doctorData && res.data.report) {
         setDoctorData(user);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save report.' });
    } finally {
      setLoading(false);
    }
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
      console.error(error);
      setAiResult('Error communicating with AI API. Ensure your API key is correct and valid.');
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

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#000] text-white h-full overflow-hidden relative">

      {/* Viewer Main Area */}
      <div className="flex-1 flex flex-col h-[50vh] md:h-full relative z-10 border-b md:border-b-0 md:border-r border-white/10">
        
        <div ref={viewerContainerRef} className="flex-1 bg-black flex items-center justify-center overflow-hidden relative group">
          {uuid ? (
            <>
              <OHIFViewerComponent uuid={uuid} />
              
              {/* Fullscreen Toggle Button */}
              <button 
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 z-[9999] p-2 bg-black/60 hover:bg-[#00e5ff]/20 text-[#888] hover:text-[#00e5ff] rounded-lg backdrop-blur-md transition-all opacity-50 hover:opacity-100 group-hover:opacity-100 border border-white/10 hover:border-[#00e5ff]/50 shadow-lg flex items-center justify-center"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <div className="text-center p-6 bg-[#111] border border-[#333] rounded-2xl max-w-sm shadow-2xl">
              <div className="w-16 h-16 bg-[#00e5ff]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#00e5ff]" />
              </div>
              <p className="text-[#aaa] font-medium">Please select a patient from the Worklist to view their DICOM study.</p>
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
          <div className="flex justify-between items-center mb-6">
            <h3 className="hidden md:flex text-xl font-bold text-white items-center">
              <FileText className="w-6 h-6 mr-3 text-[#00e5ff]" /> 
              Clinical Report
            </h3>
          </div>
          
          {message.text && (
            <div className={`p-4 rounded-xl mb-6 flex items-center text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> : <CheckCircle className="w-5 h-5 mr-2 shrink-0" />}
              {message.text}
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-bold text-[#888] uppercase tracking-wider">Findings & Diagnosis</label>
              {(user?.role === 'doctor' || user?.role === 'superadmin') && uuid && (
                <button 
                  onClick={handleAnalyzeWithAI}
                  className="flex items-center text-xs font-bold px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500 hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                >
                  <Sparkles className="w-3 h-3 mr-1.5" /> Analyze with AI
                </button>
              )}
            </div>
            
            <textarea 
              value={report}
              onChange={(e) => setReport(e.target.value)}
              disabled={(user?.role !== 'doctor' && user?.role !== 'superadmin') || !uuid}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] resize-none mb-6 disabled:opacity-50 transition-all text-sm md:text-base leading-relaxed"
              placeholder={(user?.role === 'doctor' || user?.role === 'superadmin') ? "Type clinical findings, impression, and diagnosis here..." : "No report has been written yet."}
            />
            
            {(user?.role === 'doctor' || user?.role === 'superadmin') && uuid && (
              <button 
                onClick={handleSaveReport}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white font-bold py-4 px-6 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Saving to Database...' : 'Save Final Report'}
              </button>
            )}
            
            {(user?.role === 'nurse') && (
              <div className="text-xs text-[#888] text-center p-4 bg-white/5 border border-white/5 rounded-xl mt-4">
                <span className="font-bold text-yellow-500 block mb-1">View Only Mode</span>
                You are logged in as a Nurse. Only Doctors can write or edit the clinical report.
              </div>
            )}
          </div>
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
    </div>
  );
}
