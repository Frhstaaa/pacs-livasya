import React, { useState, useEffect } from 'react';
import { 
  Network, Server, ShieldCheck, CheckCircle2, AlertTriangle, 
  RefreshCw, Save, Eye, EyeOff, ExternalLink, ArrowRight, ArrowLeftRight,
  Activity, Database, Globe, Layers, Copy, Check, FileText,
  Clock, Send, Code, AlertCircle, Search, Sliders, ChevronRight,
  User, CheckCircle, UploadCloud, FileCheck, X
} from 'lucide-react';
import axios from 'axios';

export default function IntegrationPanel() {
  const [activeTab, setActiveTab] = useState('satusehat'); // 'satusehat', 'dispatcher', 'simrs', 'mapping', 'logs'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Testing States
  const [testingFhir, setTestingFhir] = useState(false);
  const [fhirTestResult, setFhirTestResult] = useState(null);
  const [testingSimrs, setTestingSimrs] = useState(false);
  const [simrsTestResult, setSimrsTestResult] = useState(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // SIMRS 2-Way Bridging Test & Webhook states
  const [testingPushResult, setTestingPushResult] = useState(false);
  const [pushTestResult, setPushTestResult] = useState(null);
  const [showWebhookDoc, setShowWebhookDoc] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSampleJson, setCopiedSampleJson] = useState(false);

  // Dispatcher & DICOM SatuSehat State
  const [dispatcherPatients, setDispatcherPatients] = useState([]);
  const [loadingDispatcherPatients, setLoadingDispatcherPatients] = useState(false);
  const [nikSearchInput, setNikSearchInput] = useState('');
  const [searchingNik, setSearchingNik] = useState(false);
  const [nikSearchResult, setNikSearchResult] = useState(null);
  const [nikSearchError, setNikSearchError] = useState(null);
  const [selectedPatientForNik, setSelectedPatientForNik] = useState(null);

  // Preview & Dispatch States
  const [previewPayload, setPreviewPayload] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sendingStudyPatientId, setSendingStudyPatientId] = useState(null);
  const [sendingReportPatientId, setSendingReportPatientId] = useState(null);
  const [dispatchStatusAlert, setDispatchStatusAlert] = useState(null);

  // Form Configuration State
  const [form, setForm] = useState({
    // SatuSehat / FHIR R4
    fhir_satusehat_enabled: false,
    fhir_environment: 'sandbox',
    fhir_organization_id: '',
    fhir_client_id: '',
    fhir_client_secret: '',
    fhir_client_secret_set: false,
    fhir_auth_url: '',
    fhir_base_url: '',
    fhir_location_id: '',
    fhir_practitioner_ihs: '',
    fhir_auto_sync_imaging_study: true,
    fhir_auto_sync_diagnostic_report: true,

    // SIMRS Gateway
    simrs_enabled: false,
    simrs_mode: 'rest',
    simrs_base_url: '',
    simrs_auth_type: 'bearer',
    simrs_api_key: '',
    simrs_api_key_set: false,
    simrs_custom_header_name: 'X-Hospital-API-Key',
    simrs_endpoint_orders: '/api/radiology/orders',
    simrs_endpoint_results: '/api/radiology/results',
    simrs_push_viewer_url: true,
    simrs_auto_sync_results: true,

    // SIMRS Database
    simrs_db_connection: 'mysql',
    simrs_db_host: '127.0.0.1',
    simrs_db_port: '3306',
    simrs_db_database: 'sik',
    simrs_db_username: 'root',
    simrs_db_password: '',
    simrs_db_password_set: false,

    // Mappings
    loinc_mapping: []
  });

  // UI helpers
  const [showFhirSecret, setShowFhirSecret] = useState(false);
  const [showSimrsKey, setShowSimrsKey] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logSummary, setLogSummary] = useState({});
  const [logFilterSystem, setLogFilterSystem] = useState('all');
  const [logFilterStatus, setLogFilterStatus] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedPayloadModal, setSelectedPayloadModal] = useState(null);
  const [resendingLogId, setResendingLogId] = useState(null);

  // Fetch Settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/integration/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = res.data;
      setForm(prev => ({
        ...prev,
        ...data,
        fhir_client_secret: data.fhir_client_secret_set ? '••••••••' : '',
        simrs_api_key: data.simrs_api_key_set ? '••••••••' : '',
        simrs_db_password: data.simrs_db_password_set ? '••••••••' : '',
      }));
    } catch (err) {
      console.error('Failed to load integration settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (logFilterSystem !== 'all') params.system = logFilterSystem;
      if (logFilterStatus !== 'all') params.status = logFilterStatus;
      if (logSearch) params.search = logSearch;

      const res = await axios.get('/integration/logs', {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = res.data;
      setLogs(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setLogSummary(data?.summary || {});
    } catch (err) {
      console.error('Failed to load integration logs:', err);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, logFilterSystem, logFilterStatus]);

  // Environment Selector change
  const handleEnvironmentChange = (env) => {
    let authUrl = form.fhir_auth_url;
    let baseUrl = form.fhir_base_url;

    if (env === 'sandbox') {
      authUrl = 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1';
      baseUrl = 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1';
    } else if (env === 'production') {
      authUrl = 'https://api-satusehat.dto.kemkes.go.id/oauth2/v1';
      baseUrl = 'https://api-satusehat.dto.kemkes.go.id/fhir-r4/v1';
    }

    setForm(prev => ({
      ...prev,
      fhir_environment: env,
      fhir_auth_url: authUrl,
      fhir_base_url: baseUrl
    }));
  };

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/integration/settings', form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      fetchSettings();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Gagal menyimpan pengaturan integrasi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Test FHIR SatuSehat
  const handleTestFhir = async () => {
    setTestingFhir(true);
    setFhirTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/integration/test-fhir', {
        client_id: form.fhir_client_id,
        client_secret: form.fhir_client_secret,
        auth_url: form.fhir_auth_url
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setFhirTestResult({ success: true, data: res.data });
    } catch (err) {
      setFhirTestResult({ 
        success: false, 
        data: err.response?.data || { message: err.message, status_code: 500 } 
      });
    } finally {
      setTestingFhir(false);
    }
  };

  // Test SIMRS
  const handleTestSimrs = async () => {
    setTestingSimrs(true);
    setSimrsTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/integration/test-simrs', {
        mode: form.simrs_mode,
        base_url: form.simrs_base_url,
        auth_type: form.simrs_auth_type,
        api_key: form.simrs_api_key,
        custom_header_name: form.simrs_custom_header_name,
        db_host: form.simrs_db_host,
        db_port: form.simrs_db_port,
        db_database: form.simrs_db_database,
        db_username: form.simrs_db_username,
        db_password: form.simrs_db_password
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSimrsTestResult({ success: true, data: res.data });
    } catch (err) {
      setSimrsTestResult({ 
        success: false, 
        data: err.response?.data || { message: err.message } 
      });
    } finally {
      setTestingSimrs(false);
    }
  };

  // Manual Order Sync
  const handleSyncOrders = async () => {
    setSyncingOrders(true);
    setSyncResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/integration/sync-orders', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSyncResult({ success: true, message: res.data.message });
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      setSyncResult({ success: false, message: 'Gagal sinkronisasi order: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSyncingOrders(false);
    }
  };

  // Test Push Outbound Result to SIMRS
  const handleTestSimrsPush = async () => {
    setTestingPushResult(true);
    setPushTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/integration/simrs/test-push', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPushTestResult({ success: true, data: res.data });
    } catch (err) {
      setPushTestResult({ 
        success: false, 
        data: err.response?.data || { message: err.message } 
      });
    } finally {
      setTestingPushResult(false);
    }
  };

  // Resend Failed Log
  const handleResendLog = async (id) => {
    setResendingLogId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/integration/logs/${id}/resend`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchLogs();
    } catch (err) {
      alert('Gagal mengirim ulang data: ' + (err.response?.data?.message || err.message));
    } finally {
      setResendingLogId(null);
    }
  };

  // Fetch Patients for Dispatcher
  const fetchDispatcherPatients = async () => {
    setLoadingDispatcherPatients(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/patients', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setDispatcherPatients(data);
    } catch (err) {
      console.error('Failed to load patients for dispatcher:', err);
      setDispatcherPatients([]);
    } finally {
      setLoadingDispatcherPatients(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dispatcher') {
      fetchDispatcherPatients();
    }
  }, [activeTab]);

  // Lookup NIK
  const handleLookupNik = async (nikToSearch, patientIdToLink = null) => {
    if (!nikToSearch || nikToSearch.length < 16) {
      setNikSearchError('Harap masukkan 16 digit NIK KTP yang valid.');
      return;
    }
    setSearchingNik(true);
    setNikSearchError(null);
    setNikSearchResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/integration/satusehat/lookup-patient', {
        nik: nikToSearch,
        patient_id: patientIdToLink || undefined,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNikSearchResult(res.data);
      if (patientIdToLink) {
        fetchDispatcherPatients();
        setSelectedPatientForNik(null);
      }
    } catch (err) {
      setNikSearchError(err.response?.data?.message || 'Gagal mencari identitas pasien di SatuSehat.');
    } finally {
      setSearchingNik(false);
    }
  };

  // Preview ImagingStudy
  const handlePreviewImagingStudy = async (patientId) => {
    setLoadingPreview(true);
    setPreviewPayload(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/integration/satusehat/preview-imaging-study/${patientId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPreviewPayload(res.data);
      setShowPreviewModal(true);
    } catch (err) {
      alert('Gagal membuat preview payload: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingPreview(false);
    }
  };

  // Send ImagingStudy
  const handleSendImagingStudy = async (patientId) => {
    setSendingStudyPatientId(patientId);
    setDispatchStatusAlert(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/integration/satusehat/send-imaging-study/${patientId}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setDispatchStatusAlert({
        success: true,
        type: 'imaging_study',
        message: res.data.message,
        id: res.data.imaging_study_id,
        simulated: res.data.simulated
      });
      fetchDispatcherPatients();
    } catch (err) {
      setDispatchStatusAlert({
        success: false,
        type: 'imaging_study',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setSendingStudyPatientId(null);
    }
  };

  // Send DiagnosticReport
  const handleSendDiagnosticReport = async (patientId) => {
    setSendingReportPatientId(patientId);
    setDispatchStatusAlert(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/integration/satusehat/send-diagnostic-report/${patientId}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setDispatchStatusAlert({
        success: true,
        type: 'diagnostic_report',
        message: res.data.message,
        id: res.data.report_id,
        simulated: res.data.simulated
      });
      fetchDispatcherPatients();
    } catch (err) {
      setDispatchStatusAlert({
        success: false,
        type: 'diagnostic_report',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setSendingReportPatientId(null);
    }
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0f19] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Memuat Konfigurasi Integrasi...
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-100 overflow-y-auto font-sans">
      
      {/* Top Banner / Header */}
      <div className="border-b border-slate-800 bg-[#0e1424]/90 backdrop-blur-xl px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Network className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Integrasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">FHIR & SIMRS Gateway</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider uppercase">
                  Interoperabilitas RS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bridging data radiologi ke Rekam Medis Elektronik (RME) SIMRS dan SatuSehat Kemenkes RI (HL7 FHIR R4)
              </p>
            </div>
          </div>

          {/* Save Settings & Status Badges */}
          <div className="flex items-center gap-2.5">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl animate-fade-in">
                <Check className="w-4 h-4" /> Pengaturan Tersimpan!
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex items-center gap-1 border-b border-slate-800/80 -mb-5 pb-px overflow-x-auto">
          {[
            { id: 'satusehat', label: '🌐 SatuSehat (HL7 FHIR R4)', activeIcon: Globe },
            { id: 'dispatcher', label: '📡 Dispatcher DICOM & ImagingStudy', activeIcon: Send },
            { id: 'simrs', label: '🏥 SIMRS Gateway', activeIcon: Server },
            { id: 'mapping', label: '📑 Pemetaan Kode (LOINC)', activeIcon: Layers },
            { id: 'logs', label: '📊 Log Transmisi & Outbox', activeIcon: Clock },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive 
                    ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/5' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 flex-1 max-w-6xl w-full mx-auto space-y-6">
        
        {/* TAB 1: SatuSehat Kemkes (HL7 FHIR R4) */}
        {activeTab === 'satusehat' && (
          <div className="space-y-6">
            
            {/* Activation Banner */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
              form.fhir_satusehat_enabled 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  form.fhir_satusehat_enabled 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Koneksi SatuSehat DTO Kemenkes RI (HL7 FHIR R4)
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                      form.fhir_satusehat_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {form.fhir_satusehat_enabled ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mengirim metadata ImagingStudy dan DiagnosticReport hasil verifikasi ekspertise radiologi ke ekosistem SatuSehat.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.fhir_satusehat_enabled} 
                  onChange={(e) => setForm({ ...form, fhir_satusehat_enabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Test Results Alert */}
            {fhirTestResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                fhirTestResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {fhirTestResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    <div>
                      <div className="text-xs font-bold">{fhirTestResult.data.message}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        HTTP Status: <span className="font-mono font-bold text-white">{fhirTestResult.data.status_code || 200}</span> • Latency: <span className="font-mono text-white">{fhirTestResult.data.latency_ms} ms</span>
                        {fhirTestResult.data.token_preview && (
                          <span className="ml-2 font-mono text-emerald-400">Token: {fhirTestResult.data.token_preview}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setFhirTestResult(null)} className="text-xs opacity-60 hover:opacity-100 text-white">✕</button>
                </div>
              </div>
            )}

            {/* Credentials Card */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Kredensial & Lingkungan SatuSehat (Kemenkes DTO)
                </h3>
                
                {/* Environment Pill Selector */}
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  {[
                    { id: 'sandbox', label: 'Staging / Sandbox' },
                    { id: 'production', label: 'Production (Live)' },
                    { id: 'custom', label: 'Custom Server' },
                  ].map(env => (
                    <button
                      key={env.id}
                      onClick={() => handleEnvironmentChange(env.id)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        form.fhir_environment === env.id
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Organization ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Organization ID (Fasilitas Pelayanan Kesehatan / Faskes) *
                  </label>
                  <input
                    type="text"
                    value={form.fhir_organization_id}
                    onChange={(e) => setForm({ ...form, fhir_organization_id: e.target.value })}
                    placeholder="e.g. 10000004 (RSIA Livasya UUID)"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">ID Organisasi resmi dari portal registrasi SatuSehat DTO.</p>
                </div>

                {/* Location ID (Instalasi Radiologi) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Location ID (Instalasi Radiologi)
                  </label>
                  <input
                    type="text"
                    value={form.fhir_location_id}
                    onChange={(e) => setForm({ ...form, fhir_location_id: e.target.value })}
                    placeholder="e.g. b017571c-7f21-4870-984e-24e5db8b0d33"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">ID Ruangan Radiologi yang terdaftar di master sarana SatuSehat.</p>
                </div>

                {/* Client ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Client ID (OAuth 2.0) *
                  </label>
                  <input
                    type="text"
                    value={form.fhir_client_id}
                    onChange={(e) => setForm({ ...form, fhir_client_id: e.target.value })}
                    placeholder="e.g. o7XyWz..."
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                  />
                </div>

                {/* Client Secret */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Client Secret *</span>
                    {form.fhir_client_secret_set && (
                      <span className="text-[10px] text-emerald-400 font-semibold">✓ Kredensial Terpasang</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showFhirSecret ? 'text' : 'password'}
                      value={form.fhir_client_secret}
                      onChange={(e) => setForm({ ...form, fhir_client_secret: e.target.value })}
                      placeholder={form.fhir_client_secret_set ? '••••••••' : 'Masukkan Client Secret'}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFhirSecret(!showFhirSecret)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showFhirSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* OAuth Auth URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">OAuth 2.0 Auth URL</label>
                  <input
                    type="text"
                    value={form.fhir_auth_url}
                    onChange={(e) => setForm({ ...form, fhir_auth_url: e.target.value })}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>

                {/* FHIR Base URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">FHIR API Base URL (R4)</label>
                  <input
                    type="text"
                    value={form.fhir_base_url}
                    onChange={(e) => setForm({ ...form, fhir_base_url: e.target.value })}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>

                {/* Practitioner IHS (Dokter Radiologi) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Default Practitioner IHS Number (Dokter Spesialis Radiologi)
                  </label>
                  <input
                    type="text"
                    value={form.fhir_practitioner_ihs}
                    onChange={(e) => setForm({ ...form, fhir_practitioner_ihs: e.target.value })}
                    placeholder="e.g. 100019827461 (Nomor IHS Practitioner Kemenkes)"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Digunakan sebagai fallback identifier dokter jika akun dokter radiologi belum ditautkan dengan NIK/IHS Practitioner.
                  </p>
                </div>
              </div>

              {/* Automation Toggles */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Automasi Sinkronisasi SatuSehat
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-all">
                    <input
                      type="checkbox"
                      checked={form.fhir_auto_sync_imaging_study}
                      onChange={(e) => setForm({ ...form, fhir_auto_sync_imaging_study: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Auto-Push ImagingStudy</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Otomatis mengirim resource <code>ImagingStudy</code> saat radiografer selesai mengunggah file DICOM.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-all">
                    <input
                      type="checkbox"
                      checked={form.fhir_auto_sync_diagnostic_report}
                      onChange={(e) => setForm({ ...form, fhir_auto_sync_diagnostic_report: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Auto-Push DiagnosticReport</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Otomatis mengirim resource <code>DiagnosticReport</code> saat dokter memverifikasi ekspertise resmi.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestFhir}
                  disabled={testingFhir}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {testingFhir ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  <span>{testingFhir ? 'Menguji Handshake OAuth2...' : 'Uji Koneksi SatuSehat (Ping OAuth)'}</span>
                </button>

                <div className="text-[11px] text-slate-500">
                  Didukung penuh standar HL7 FHIR Release 4 (R4)
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: Dispatcher DICOM & ImagingStudy */}
        {activeTab === 'dispatcher' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    Dispatcher Radiologi SatuSehat Kemenkes RI
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 tracking-wider uppercase">
                      Direct Native API
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Merangkai metadata berkas DICOM lokal menjadi standar HL7 FHIR R4 (<code>ImagingStudy</code> &amp; <code>DiagnosticReport</code>) dan mengirimkannya langsung ke SATUSEHAT API Gateway.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchDispatcherPatients}
                  disabled={loadingDispatcherPatients}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDispatcherPatients ? 'animate-spin' : ''}`} />
                  <span>Segarkan Data</span>
                </button>
              </div>
            </div>

            {/* Status Alert if any action triggered */}
            {dispatchStatusAlert && (
              <div className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                dispatchStatusAlert.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  {dispatchStatusAlert.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold">{dispatchStatusAlert.message}</div>
                    {dispatchStatusAlert.id && (
                      <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                        ID Terdaftar: <span className="text-emerald-400 font-bold">{dispatchStatusAlert.id}</span>
                        {dispatchStatusAlert.simulated && (
                          <span className="ml-2 text-amber-400 text-[10px] font-sans font-semibold">(Mode Simulasi)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchStatusAlert(null)}
                  className="text-xs opacity-60 hover:opacity-100 text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* NIK KTP to SatuSehat IHS Lookup Card */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-400" />
                    Pencarian IHS Pasien Berdasarkan NIK KTP (Identity Resolver)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    SatuSehat mewajibkan nomor IHS nasional (<code>Patient/&#123;id&#125;</code>) pada setiap pengiriman pemeriksaan radiologi.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    maxLength={16}
                    value={nikSearchInput}
                    onChange={(e) => setNikSearchInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 16 digit NIK KTP Pasien (e.g. 3201123456780001)..."
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 transition-all"
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">
                    {nikSearchInput.length}/16
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLookupNik(nikSearchInput)}
                  disabled={searchingNik || nikSearchInput.length !== 16}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {searchingNik ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{searchingNik ? 'Mencari ke SatuSehat...' : 'Cari IHS Pasien'}</span>
                </button>
              </div>

              {nikSearchError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{nikSearchError}</span>
                </div>
              )}

              {nikSearchResult && nikSearchResult.data && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {nikSearchResult.data.name}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-mono">
                          IHS Terverifikasi
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-3 font-mono">
                        <span>IHS Number: <strong className="text-emerald-400">{nikSearchResult.data.ihs_number}</strong></span>
                        <span>NIK: {nikSearchResult.data.nik}</span>
                        <span>Gender: {nikSearchResult.data.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</span>
                        <span>Tgl Lahir: {nikSearchResult.data.birth_date}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(nikSearchResult.data.ihs_number, 'ihs_quick')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'ihs_quick' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'ihs_quick' ? 'Tersalin' : 'Salin IHS'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Patients Worklist & Dispatch Table */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    Daftar Pemeriksaan Radiologi &amp; Status Transmisi SATUSEHAT
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih pasien untuk meninjau struktur FHIR R4 atau mengirimkan berkas langsung ke SATUSEHAT.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {Array.isArray(dispatcherPatients) ? dispatcherPatients.length : 0} Pasien Terdaftar
                </span>
              </div>

              {loadingDispatcherPatients ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mb-2" />
                  <span className="text-xs">Memuat daftar pasien radiologi...</span>
                </div>
              ) : (!Array.isArray(dispatcherPatients) || dispatcherPatients.length === 0) ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  Belum ada data pasien atau berkas pemeriksaan radiologi.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Pasien &amp; No. RM</th>
                        <th className="px-4 py-3">Identitas SATUSEHAT (IHS)</th>
                        <th className="px-4 py-3">Modalitas &amp; Citra</th>
                        <th className="px-4 py-3">Status ImagingStudy</th>
                        <th className="px-4 py-3 text-right">Aksi Dispatcher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {(Array.isArray(dispatcherPatients) ? dispatcherPatients : []).map((patient) => {
                        const files = patient.dicom_files || patient.dicomFiles || [];
                        const hasFiles = files.length > 0;
                        const hasIhs = Boolean(patient.satusehat_ihs_id);
                        const isStudySynced = Boolean(patient.satusehat_imaging_study_id);
                        const primaryDicom = hasFiles ? files[0] : null;
                        const report = hasFiles ? files.find(f => f.report)?.report : null;
                        const isReportVerified = Boolean(report?.is_verified);
                        const isReportSynced = Boolean(report?.satusehat_report_id);

                        return (
                          <tr key={patient.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-white font-bold text-xs">{patient.name}</div>
                              <div className="text-[11px] text-sky-400 font-mono mt-0.5">{patient.medical_record_number}</div>
                            </td>

                            <td className="px-4 py-3">
                              {hasIhs ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                    {patient.satusehat_ihs_id}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                    IHS Belum Ditautkan
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defaultNik = patient.nik || '';
                                      const promptNik = window.prompt(`Masukkan 16 digit NIK untuk ${patient.name}:`, defaultNik);
                                      if (promptNik) {
                                        handleLookupNik(promptNik, patient.id);
                                      }
                                    }}
                                    className="text-[10px] text-sky-400 hover:text-sky-300 underline font-bold cursor-pointer"
                                  >
                                    + Input NIK
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {hasFiles ? (
                                <div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono">
                                    {primaryDicom?.modality || 'DX'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 ml-2">
                                    {patient.dicom_files.length} Berkas DICOM
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Tidak ada berkas</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {isStudySynced ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    Terkirim
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]" title={patient.satusehat_imaging_study_id}>
                                    {patient.satusehat_imaging_study_id}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                  Belum Dikirim
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {hasFiles && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewImagingStudy(patient.id)}
                                      disabled={loadingPreview}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                      title="Preview Payload FHIR R4 JSON"
                                    >
                                      <Code className="w-3.5 h-3.5" />
                                      <span className="hidden lg:inline">JSON</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSendImagingStudy(patient.id)}
                                      disabled={sendingStudyPatientId === patient.id}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                        isStudySynced
                                          ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                          : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
                                      }`}
                                      title="Kirim ImagingStudy ke SATUSEHAT"
                                    >
                                      {sendingStudyPatientId === patient.id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Send className="w-3.5 h-3.5" />
                                      )}
                                      <span>{isStudySynced ? 'Kirim Ulang' : 'Kirim Study'}</span>
                                    </button>

                                    {report && (
                                      <button
                                        type="button"
                                        onClick={() => handleSendDiagnosticReport(patient.id)}
                                        disabled={sendingReportPatientId === patient.id || !isReportVerified}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                          !isReportVerified
                                            ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                                            : isReportSynced
                                            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                        }`}
                                        title={isReportVerified ? 'Kirim Hasil Ekspertise Dokter (DiagnosticReport)' : 'Ekspertise Belum Diverifikasi'}
                                      >
                                        {sendingReportPatientId === patient.id ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <FileCheck className="w-3.5 h-3.5" />
                                        )}
                                        <span>{isReportSynced ? 'Report OK' : 'Kirim Ekspertise'}</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: SIMRS Gateway */}
        {activeTab === 'simrs' && (
          <div className="space-y-6">
            
            {/* Activation Banner */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
              form.simrs_enabled 
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  form.simrs_enabled 
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Gateway SIMRS (Sistem Informasi Manajemen Rumah Sakit)
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                      form.simrs_enabled ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {form.simrs_enabled ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Menghubungkan PACS/RIS dengan SIMRS untuk penarikan order pemeriksaan dan pengiriman hasil ekspertise langsung ke RME.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.simrs_enabled} 
                  onChange={(e) => setForm({ ...form, simrs_enabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* Architecture Card: Two-Way Bridging (SIMRS <-> PACS/RIS) */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Topologi Interoperabilitas 2 Arah (Two-Way Bridging)
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        Bi-Directional Sync
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Alur pertukaran data otomatis antara SIMRS Rumah Sakit dan PACS/RIS Radiologi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Protokol:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[11px] border border-slate-700">REST API</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700">Khanza SQL</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Arah 1: SIMRS -> RIS (Inbound Orders) */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        Arah 1: SIMRS &rarr; PACS/RIS (Inbound Order)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        Order &amp; Pasien
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Penerimaan order radiologi langsung dari SIMRS tanpa input ulang di meja radiologi:
                    </p>
                    <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>Data demografi pasien lengkap (No. RM, NIK KTP, Nama, Tgl Lahir)</li>
                      <li>Nomor order, dokter perujuk, dan unit/poli asal</li>
                      <li><strong>Diagnosa klinis &amp; kode ICD-10</strong> sebagai acuan dokter radiolog</li>
                      <li>Tersedia via <strong>Polling Terjadwal</strong> atau <strong>Webhook Realtime</strong></li>
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Kesiapan Citra:</span>
                    <span className="text-sky-300 font-medium">Unggah DICOM / DICOM Router</span>
                  </div>
                </div>

                {/* Arah 2: RIS -> SIMRS (Outbound Results) */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Arah 2: PACS/RIS &rarr; SIMRS (Outbound Hasil)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Ekspertise &amp; OHIF Link
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Pengiriman hasil ekspertise dokter radiolog kembali ke Rekam Medis Elektronik (RME):
                    </p>
                    <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>Deskripsi temuan klinis &amp; kesimpulan akhir dokter radiolog</li>
                      <li>Token tanda tangan digital resmi &amp; verifikasi keabsahan</li>
                      <li><strong>Tautan OHIF Web Viewer</strong> (dokter klinisi SIMRS dapat melihat citra 1-klik)</li>
                      <li>Status order otomatis diperbarui menjadi &lsquo;Selesai / Sudah&rsquo;</li>
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Pemicu Kirim:</span>
                    <span className="text-emerald-300 font-medium">Otomatis saat TTD &amp; Manual Push</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inbound Webhook Endpoint Box (For Hospital IT Integration) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#111827] border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Code className="w-4 h-4 text-sky-400" />
                    <span>Inbound Webhook SIMRS (Push Order Radiologi Real-time)</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300">
                      POST Endpoint
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Berikan URL endpoint ini kepada tim IT / Vendor SIMRS agar SIMRS dapat mengirimkan order secara langsung seketika pasien didaftarkan.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/simrs/orders`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Tersalin!' : 'Salin Webhook URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWebhookDoc(!showWebhookDoc)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{showWebhookDoc ? 'Tutup Spesifikasi' : 'Spesifikasi JSON'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 font-mono text-xs text-sky-300 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800/80 select-all break-all">
                {window.location.origin}/api/simrs/orders
              </div>

              {/* Collapsible JSON Specification */}
              {showWebhookDoc && (
                <div className="mt-4 p-4 rounded-xl bg-black/50 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Contoh Format Payload JSON Request dari SIMRS:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = JSON.stringify({
                          "order_number": "ORD-2026-0098",
                          "medical_record_number": "RM-44210",
                          "patient_name": "Ny. Siti Rahmawati",
                          "nik": "3201234567890001",
                          "birth_date": "1988-04-12",
                          "gender": "female",
                          "address": "Jl. Flamboyan No. 12",
                          "phone": "081234567890",
                          "modality": "DX",
                          "procedure_name": "Thorax AP/PA",
                          "referring_doctor": "dr. Bambang Sp.P",
                          "clinical_diagnosis": "Batuk kronis berdahak, suspect TB Paru",
                          "icd10_code": "A15.0",
                          "notes": "Foto rontgen dada posisi PA tegak"
                        }, null, 2);
                        navigator.clipboard.writeText(sample);
                        setCopiedSampleJson(true);
                        setTimeout(() => setCopiedSampleJson(false), 2500);
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSampleJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSampleJson ? 'Tersalin!' : 'Salin JSON Sample'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800/80 leading-relaxed">
{`{
  "order_number": "ORD-2026-0098",
  "medical_record_number": "RM-44210",
  "patient_name": "Ny. Siti Rahmawati",
  "nik": "3201234567890001",
  "birth_date": "1988-04-12",
  "gender": "female",
  "address": "Jl. Flamboyan No. 12",
  "phone": "081234567890",
  "modality": "DX",
  "procedure_name": "Thorax AP/PA",
  "referring_doctor": "dr. Bambang Sp.P",
  "referring_unit": "Poli Paru",
  "clinical_diagnosis": "Batuk kronis berdahak, suspect TB Paru",
  "icd10_code": "A15.0",
  "notes": "Foto rontgen dada posisi PA tegak"
}`}
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    &bull; Response yang dikembalikan oleh PACS/RIS: <code>{`{ "success": true, "message": "Order berhasil diterima...", "patient_id": 12 }`}</code> (HTTP 200/201).
                  </p>
                </div>
              )}
            </div>

            {/* Test Results Alert (Ping Gateway) */}
            {simrsTestResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                simrsTestResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {simrsTestResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    <div>
                      <div className="text-xs font-bold">{simrsTestResult.data.message}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Latency: <span className="font-mono text-white">{simrsTestResult.data.latency_ms} ms</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSimrsTestResult(null)} className="text-xs opacity-60 hover:opacity-100 text-white">✕</button>
                </div>
              </div>
            )}

            {/* Test Results Alert (Push Outbound Ekspertise) */}
            {pushTestResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                pushTestResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    {pushTestResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                    <div className="space-y-1">
                      <div className="text-xs font-bold">{pushTestResult.data.message}</div>
                      {pushTestResult.data.patient_name && (
                        <div className="text-[11px] text-slate-300">
                          Pasien: <strong className="text-white">{pushTestResult.data.patient_name}</strong> &bull; Order: <span className="font-mono text-sky-300">{pushTestResult.data.order_number || '-'}</span>
                        </div>
                      )}
                      {pushTestResult.data.viewer_url && (
                        <div className="text-[11px] text-slate-400 break-all">
                          Link Viewer RME: <a href={pushTestResult.data.viewer_url} target="_blank" rel="noreferrer" className="text-sky-400 underline font-mono">{pushTestResult.data.viewer_url}</a>
                        </div>
                      )}
                      {pushTestResult.data.destination && (
                        <div className="text-[10px] text-slate-500">
                          Tujuan: <span className="font-mono text-slate-400">{pushTestResult.data.destination}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setPushTestResult(null)} className="text-xs opacity-60 hover:opacity-100 text-white">✕</button>
                </div>
              </div>
            )}

            {syncResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                syncResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {syncResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {syncResult.message}
                </div>
              </div>
            )}

            {/* Mode Selector */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  Mode Bridging SIMRS
                </h3>

                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    onClick={() => setForm({ ...form, simrs_mode: 'rest' })}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      form.simrs_mode === 'rest' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    REST API Gateway (Modern)
                  </button>
                  <button
                    onClick={() => setForm({ ...form, simrs_mode: 'database' })}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      form.simrs_mode === 'database' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Database Direct (Khanza / SQL)
                  </button>
                </div>
              </div>

              {/* REST API Form */}
              {form.simrs_mode === 'rest' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Base URL API SIMRS *
                      </label>
                      <input
                        type="text"
                        value={form.simrs_base_url}
                        onChange={(e) => setForm({ ...form, simrs_base_url: e.target.value })}
                        placeholder="e.g. http://simrs.rsialivasya.com/api/radiologi"
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Tipe Autentikasi</label>
                      <select
                        value={form.simrs_auth_type}
                        onChange={(e) => setForm({ ...form, simrs_auth_type: e.target.value })}
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-all"
                      >
                        <option value="bearer">Bearer Token (Header: Authorization)</option>
                        <option value="custom_header">Custom Header (e.g. X-Hospital-API-Key)</option>
                        <option value="none">Tanpa Autentikasi (Internal Network)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>API Key / Token Rahasia</span>
                        {form.simrs_api_key_set && <span className="text-[10px] text-emerald-400 font-semibold">✓ Terpasang</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={showSimrsKey ? 'text' : 'password'}
                          value={form.simrs_api_key}
                          onChange={(e) => setForm({ ...form, simrs_api_key: e.target.value })}
                          placeholder={form.simrs_api_key_set ? '••••••••' : 'Masukkan API Key SIMRS'}
                          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSimrsKey(!showSimrsKey)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showSimrsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {form.simrs_auth_type === 'custom_header' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Nama Header Kustom</label>
                        <input
                          type="text"
                          value={form.simrs_custom_header_name}
                          onChange={(e) => setForm({ ...form, simrs_custom_header_name: e.target.value })}
                          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Endpoint Penarikan Order</label>
                      <input
                        type="text"
                        value={form.simrs_endpoint_orders}
                        onChange={(e) => setForm({ ...form, simrs_endpoint_orders: e.target.value })}
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Endpoint Pengiriman Hasil</label>
                      <input
                        type="text"
                        value={form.simrs_endpoint_results}
                        onChange={(e) => setForm({ ...form, simrs_endpoint_results: e.target.value })}
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.simrs_push_viewer_url}
                        onChange={(e) => setForm({ ...form, simrs_push_viewer_url: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                      />
                      <span>Sertakan link <strong>OHIF Web Radiology Viewer</strong> dalam payload hasil ekspertise ke RME SIMRS</span>
                    </label>

                    <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.simrs_auto_sync_results}
                        onChange={(e) => setForm({ ...form, simrs_auto_sync_results: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                      />
                      <span>Otomatis kirim hasil ekspertise ke SIMRS saat dokter menekan <strong>Verifikasi & TTD</strong></span>
                    </label>
                  </div>
                </div>
              ) : (
                /* Database Direct Form */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Driver Database</label>
                    <select
                      value={form.simrs_db_connection}
                      onChange={(e) => setForm({ ...form, simrs_db_connection: e.target.value })}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-all"
                    >
                      <option value="mysql">MySQL / MariaDB (Standar Khanza)</option>
                      <option value="pgsql">PostgreSQL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Host Database</label>
                    <input
                      type="text"
                      value={form.simrs_db_host}
                      onChange={(e) => setForm({ ...form, simrs_db_host: e.target.value })}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Port</label>
                    <input
                      type="text"
                      value={form.simrs_db_port}
                      onChange={(e) => setForm({ ...form, simrs_db_port: e.target.value })}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Nama Database SIMRS</label>
                    <input
                      type="text"
                      value={form.simrs_db_database}
                      onChange={(e) => setForm({ ...form, simrs_db_database: e.target.value })}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Username Database</label>
                    <input
                      type="text"
                      value={form.simrs_db_username}
                      onChange={(e) => setForm({ ...form, simrs_db_username: e.target.value })}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Password Database</span>
                      {form.simrs_db_password_set && <span className="text-[10px] text-emerald-400 font-semibold">✓ Terpasang</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showDbPassword ? 'text' : 'password'}
                        value={form.simrs_db_password}
                        onChange={(e) => setForm({ ...form, simrs_db_password: e.target.value })}
                        placeholder={form.simrs_db_password_set ? '••••••••' : 'Password DB'}
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDbPassword(!showDbPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                      >
                        {showDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions: Ping & Sync */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSimrs}
                    disabled={testingSimrs}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {testingSimrs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    <span>{testingSimrs ? 'Menguji Koneksi...' : 'Uji Koneksi SIMRS (Ping Gateway)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncOrders}
                    disabled={syncingOrders}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {syncingOrders ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>{syncingOrders ? 'Menarik Order...' : 'Tarik Order Baru dari SIMRS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSimrsPush}
                    disabled={testingPushResult}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Simulasikan pengiriman hasil ekspertise radiologi + link OHIF viewer ke endpoint SIMRS"
                  >
                    {testingPushResult ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{testingPushResult ? 'Mengirim Hasil...' : 'Uji Kirim Hasil ke SIMRS (Outbound)'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500">
                  Kompatibel dengan SIMRS Khanza, Medinfras, Denta, & Custom REST API
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: Pemetaan Kode (LOINC & SNOMED CT) */}
        {activeTab === 'mapping' && (
          <div className="space-y-5">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Kamus Pemetaan Kode Medis (Terminology Mapping)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Standar kode internasional LOINC dan SNOMED-CT yang dicantumkan pada resource <code>DiagnosticReport</code> SatuSehat Kemenkes.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const newRow = { modality: 'DX', exam_name: 'Pemeriksaan Baru', loinc_code: '36643-5', snomed_code: '168731009' };
                    setForm({ ...form, loinc_mapping: [...form.loinc_mapping, newRow] });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  + Tambah Baris Pemetaan
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Modalitas</th>
                      <th className="px-4 py-3">Nama Pemeriksaan Radiologi</th>
                      <th className="px-4 py-3">Kode LOINC (Kemkes Standard)</th>
                      <th className="px-4 py-3">Kode SNOMED-CT</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {form.loinc_mapping?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <select
                            value={item.modality}
                            onChange={(e) => {
                              const updated = [...form.loinc_mapping];
                              updated[idx].modality = e.target.value;
                              setForm({ ...form, loinc_mapping: updated });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-sky-400 font-bold focus:outline-none"
                          >
                            <option value="DX">DX (X-Ray)</option>
                            <option value="CT">CT (CT Scan)</option>
                            <option value="MR">MR (MRI)</option>
                            <option value="US">US (USG)</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={item.exam_name}
                            onChange={(e) => {
                              const updated = [...form.loinc_mapping];
                              updated[idx].exam_name = e.target.value;
                              setForm({ ...form, loinc_mapping: updated });
                            }}
                            className="w-full bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={item.loinc_code}
                            onChange={(e) => {
                              const updated = [...form.loinc_mapping];
                              updated[idx].loinc_code = e.target.value;
                              setForm({ ...form, loinc_mapping: updated });
                            }}
                            className="w-full bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-400 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={item.snomed_code}
                            onChange={(e) => {
                              const updated = [...form.loinc_mapping];
                              updated[idx].snomed_code = e.target.value;
                              setForm({ ...form, loinc_mapping: updated });
                            }}
                            className="w-full bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-indigo-400 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              const updated = form.loinc_mapping.filter((_, i) => i !== idx);
                              setForm({ ...form, loinc_mapping: updated });
                            }}
                            className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded hover:bg-rose-500/10 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Log Transmisi & Outbox */}
        {activeTab === 'logs' && (
          <div className="space-y-5">
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Total Transmisi</div>
                <div className="text-2xl font-black text-white font-mono mt-1">{logSummary.total || 0}</div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-emerald-400 uppercase">Sukses (2xx)</div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{logSummary.success_count || 0}</div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-rose-400 uppercase">Gagal / Error</div>
                <div className="text-2xl font-black text-rose-400 font-mono mt-1">{logSummary.failed_count || 0}</div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-sky-400 uppercase">SatuSehat : SIMRS</div>
                <div className="text-2xl font-black text-white font-mono mt-1">
                  {logSummary.satusehat_count || 0} <span className="text-slate-500 text-base font-normal">/</span> {logSummary.simrs_count || 0}
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={logFilterSystem}
                  onChange={(e) => setLogFilterSystem(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">Semua Sistem</option>
                  <option value="satusehat">🌐 SatuSehat Kemenkes</option>
                  <option value="simrs">🏥 SIMRS Gateway</option>
                </select>

                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="success">🟢 Berhasil</option>
                  <option value="failed">🔴 Gagal</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    placeholder="Cari pasien / endpoint..."
                    className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>

                <button
                  onClick={fetchLogs}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  title="Segarkan Log"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-sky-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Tipe Resource</th>
                      <th className="px-4 py-3">Pasien / No. RM</th>
                      <th className="px-4 py-3">Status HTTP</th>
                      <th className="px-4 py-3">Latency</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-10 text-center text-slate-500 text-xs">
                          Belum ada catatan log transmisi integrasi.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              log.system === 'satusehat' 
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {log.system === 'satusehat' ? 'SatuSehat' : 'SIMRS'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            {log.resource_type}
                          </td>
                          <td className="px-4 py-3">
                            {log.patient_name ? (
                              <div>
                                <div className="text-white font-medium">{log.patient_name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{log.patient_mrn}</div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">- (System Handshake)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                              log.status === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {log.status === 'success' ? '✓' : '✗'} {log.status_code || (log.status === 'success' ? 200 : 500)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {log.latency_ms ? `${log.latency_ms} ms` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(log.request_payload || log.response_payload) && (
                                <button
                                  onClick={() => setSelectedPayloadModal(log)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Code className="w-3 h-3 text-sky-400" />
                                  JSON
                                </button>
                              )}

                              {log.status === 'failed' && (
                                <button
                                  onClick={() => handleResendLog(log.id)}
                                  disabled={resendingLogId === log.id}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  {resendingLogId === log.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  Resend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* JSON Payload Modal */}
      {selectedPayloadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Inspeksi Payload JSON: {selectedPayloadModal.resource_type} ({selectedPayloadModal.system.toUpperCase()})
                </span>
              </div>
              <button
                onClick={() => setSelectedPayloadModal(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
              {selectedPayloadModal.endpoint && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 font-sans">Endpoint Target</div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-300 break-all text-[11px]">
                    {selectedPayloadModal.endpoint}
                  </div>
                </div>
              )}

              {selectedPayloadModal.request_payload && (
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1 font-sans">
                    <span>Request Body (Outbound Payload)</span>
                    <button
                      onClick={() => handleCopy(selectedPayloadModal.request_payload, 'req')}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'req' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Salin
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-60">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedPayloadModal.request_payload), null, 2);
                      } catch {
                        return selectedPayloadModal.request_payload;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {selectedPayloadModal.response_payload && (
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1 font-sans">
                    <span>Response Body (Inbound Acknowledgment)</span>
                    <button
                      onClick={() => handleCopy(selectedPayloadModal.response_payload, 'res')}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'res' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Salin
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 overflow-x-auto text-[11px] leading-relaxed max-h-60">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedPayloadModal.response_payload), null, 2);
                      } catch {
                        return selectedPayloadModal.response_payload;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {selectedPayloadModal.error_message && (
                <div>
                  <div className="text-[10px] font-bold text-rose-400 uppercase mb-1 font-sans">Error Message</div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                    {selectedPayloadModal.error_message}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedPayloadModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview FHIR ImagingStudy Payload */}
      {showPreviewModal && previewPayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Code className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Preview Payload FHIR R4: <code>ImagingStudy</code>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Pasien: {previewPayload.patient_name} • Accession: {previewPayload.accession_number}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: JSON Code */}
            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs bg-[#0b0f19] text-sky-300">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(previewPayload.payload, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
              <span className="text-[11px] text-slate-500">
                Format resmi SATUSEHAT Kemenkes RI No. HK.01.07/MENKES/1423/2022
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(previewPayload.payload, null, 2), 'payload_json')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'payload_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'payload_json' ? 'Tersalin' : 'Salin JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
