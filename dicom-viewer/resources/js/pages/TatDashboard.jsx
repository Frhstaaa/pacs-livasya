import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, AlertTriangle, AlertCircle, 
  Download, Printer, Search, RefreshCw, Calendar, 
  Filter, User, ExternalLink, ShieldCheck, Activity,
  ChevronRight, Award, FileText, Check, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

export default function TatDashboard() {
  const { appName } = useAppContext();
  
  // Filter States
  const [datePreset, setDatePreset] = useState('7days'); // 'today', '7days', '30days', 'this_month', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'cito', 'regular'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'on_time', 'delayed', 'pending'
  const [modalityFilter, setModalityFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data & Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    summary: {
      total_studies: 0,
      completed_studies: 0,
      pending_studies: 0,
      pending_overdue: 0,
      on_time_studies: 0,
      delayed_studies: 0,
      avg_tat_minutes: 0,
      avg_tat_formatted: '-',
      on_time_percentage: 0,
      cito: { total: 0, completed: 0, on_time_rate: 0, target_minutes: 60 },
      regular: { total: 0, completed: 0, on_time_rate: 0, target_minutes: 180 },
      benchmarks: { cito_target_minutes: 60, regular_target_minutes: 180, quality_target_percentage: 80 }
    },
    daily_trends: [],
    doctor_performance: [],
    modality_breakdown: [],
    doctors_list: [],
    details: []
  });

  // Calculate Dates on Preset Change
  useEffect(() => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const dStr = formatDate(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (datePreset === '7days') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setStartDate(formatDate(past7));
      setEndDate(formatDate(today));
    } else if (datePreset === '30days') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setStartDate(formatDate(past30));
      setEndDate(formatDate(today));
    } else if (datePreset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (datePreset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  // Fetch Dashboard Data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        priority: priorityFilter,
        status: statusFilter,
        modality: modalityFilter,
        doctor_id: doctorFilter,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const token = localStorage.getItem('token');
      const response = await axios.get('/api/tat/dashboard', {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setData(response.data);
    } catch (err) {
      console.error('Failed to load TAT dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, priorityFilter, statusFilter, modalityFilter, doctorFilter]);

  // Client-side Search Filtering for Details Table
  const filteredDetails = useMemo(() => {
    if (!data.details) return [];
    if (!searchQuery.trim()) return data.details;
    const q = searchQuery.toLowerCase();
    return data.details.filter(item => 
      item.patient?.name?.toLowerCase().includes(q) ||
      item.patient?.mrn?.toLowerCase().includes(q) ||
      item.file_name?.toLowerCase().includes(q) ||
      item.doctor_name?.toLowerCase().includes(q)
    );
  }, [data.details, searchQuery]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      priority: priorityFilter,
      status: statusFilter,
      modality: modalityFilter,
      doctor_id: doctorFilter,
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const url = `/api/tat/export?${params.toString()}`;
    
    // Trigger download via anchor
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laporan_tat_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Native Print
  const handlePrint = () => {
    window.print();
  };

  const summary = data.summary || {};
  const isTargetMet = summary.on_time_percentage >= (summary.benchmarks?.quality_target_percentage || 80);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-100 overflow-y-auto font-sans print:bg-white print:text-black">
      
      {/* Top Banner / Page Header */}
      <div className="border-b border-slate-800 bg-[#0e1424]/90 backdrop-blur-xl px-6 py-5 shrink-0 print:border-none print:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Activity className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Dashboard Kinerja <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-200">Turnaround Time (TAT)</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider uppercase">
                  Indikator Mutu RS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pemantauan Waktu Tunggu Pelayanan Radiologi sejak foto diambil hingga ekspertise diverifikasi dokter Sp.Rad
              </p>
            </div>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all shadow-sm flex items-center justify-center cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 print:hidden">
          
          {/* Quick Date Range Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: '30days', label: '30 Hari' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  datePreset === p.id 
                    ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Picker Range + Modality / Doctor dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              />
              <span className="text-gray-500">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00e5ff] transition-all cursor-pointer"
            >
              <option value="all" className="bg-[#111] text-gray-200">Semua Prioritas</option>
              <option value="cito" className="bg-[#111] text-fuchsia-400">CITO (Emergency / IGD)</option>
              <option value="regular" className="bg-[#111] text-gray-200">Reguler (Elektif)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00e5ff] transition-all cursor-pointer"
            >
              <option value="all" className="bg-[#111] text-gray-200">Semua Status Mutu</option>
              <option value="on_time" className="bg-[#111] text-emerald-400">🟢 Memenuhi Standar</option>
              <option value="delayed" className="bg-[#111] text-rose-400">🔴 Melebihi Standar</option>
              <option value="pending" className="bg-[#111] text-amber-400">🟡 Sedang Menunggu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 space-y-6 flex-1 print:p-0">
        
        {/* Printable Hospital Header (Only visible on paper print) */}
        <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wider">{appName || 'RUMAH SAKIT LIVASYA'}</h2>
          <h3 className="text-lg font-semibold uppercase">LAPORAN INDIKATOR MUTU PELAYANAN RADIOLOGI</h3>
          <p className="text-xs text-gray-600">Pemantauan Waktu Tanggap / Turnaround Time (TAT) Hasil Pemeriksaan Radiologi</p>
          <div className="text-xs text-gray-600 mt-2 flex justify-between px-4">
            <span>Periode: {startDate ? `${startDate} s/d ${endDate}` : 'Semua Periode'}</span>
            <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Rata-Rata Waktu Tunggu (Avg TAT) */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl group hover:border-sky-500/40 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/10 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata TAT</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-black text-white tracking-tight font-mono">
                {summary.avg_tat_formatted || '-'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Target: Reguler ≤ 3j • Cito ≤ 1j</span>
              <span className="text-sky-400 font-semibold">{summary.completed_studies} Selesai</span>
            </div>
          </div>

          {/* Card 2: Kepatuhan Standar Mutu RS (% On-Time) */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl group hover:border-emerald-500/40 transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${isTargetMet ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kepatuhan Standar Mutu</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isTargetMet 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl md:text-4xl font-black tracking-tight font-mono ${
                isTargetMet ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {summary.on_time_percentage}%
              </span>
              <span className="text-xs text-slate-400 font-medium">Tepat Waktu</span>
            </div>
            {/* Progress bar towards target 80% */}
            <div className="mt-3 w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  isTargetMet ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-amber-400'
                }`}
                style={{ width: `${Math.min(100, summary.on_time_percentage || 0)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Standar Akreditasi: ≥ 80%</span>
              <span className={isTargetMet ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {isTargetMet ? '✓ Memenuhi Target' : '⚠ Di Bawah Target'}
              </span>
            </div>
          </div>

          {/* Card 3: Total Pemeriksaan Selesai & Breakdown */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl group hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hasil Ekspertise</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-black text-white tracking-tight font-mono">
                {summary.completed_studies}
              </span>
              <span className="text-xs text-slate-400">/ {summary.total_studies} Pasien</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-medium">✓ {summary.on_time_studies} Tepat Waktu</span>
              <span className="text-rose-400 font-medium">✗ {summary.delayed_studies} Terlambat</span>
            </div>
          </div>

          {/* Card 4: Antrean Belum Dibaca (Pending Queue) */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menunggu Ekspertise</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-black text-amber-400 tracking-tight font-mono">
                {summary.pending_studies}
              </span>
              <span className="text-xs text-slate-400">Foto Siap Dibaca</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Antrean Aktif</span>
              {summary.pending_overdue > 0 ? (
                <span className="text-rose-400 font-bold animate-pulse">
                  ⚠ {summary.pending_overdue} Overdue
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">Semua dalam batas</span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Analytics Charts (Daily Performance & Doctor Benchmark) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* Chart 1: Tren TAT Harian & Kepatuhan (2 Columns) */}
          <div className="lg:col-span-2 bg-[#0c111a] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#00e5ff]" />
                  Tren Waktu Tunggu Harian & Kepatuhan Mutu
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Rata-rata menit TAT per hari dibandingkan garis target standar (≤ 180 menit)
                </p>
              </div>
              <span className="text-[11px] text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                Unit: Menit
              </span>
            </div>

            {/* Daily Trend Bars */}
            {data.daily_trends && data.daily_trends.length > 0 ? (
              <div className="space-y-3 pt-2">
                {data.daily_trends.slice(-7).map((day, idx) => {
                  const maxMinutes = Math.max(200, ...data.daily_trends.map(d => d.avg_tat_minutes || 0));
                  const barWidth = Math.min(100, Math.round((day.avg_tat_minutes / maxMinutes) * 100));
                  const isGood = day.avg_tat_minutes <= 180;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-300 w-16">{day.display_date}</span>
                          <span className="text-[11px] text-gray-400">({day.total} Pemeriksaan)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white">{day.avg_tat_minutes} Menit</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            day.on_time_rate >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {day.on_time_rate}% Tepat
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden flex items-center relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGood ? 'bg-gradient-to-r from-[#00e5ff] to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-rose-500'
                          }`}
                          style={{ width: `${Math.max(5, barWidth)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                <Clock className="w-8 h-8 mb-2 opacity-30 text-[#00e5ff]" />
                <p>Belum ada data pemeriksaan selesai pada periode ini.</p>
                <p className="text-[11px] text-gray-600 mt-1">Data grafik akan muncul setelah dokter menyelesaikan ekspertise.</p>
              </div>
            )}
          </div>

          {/* Chart 2: Kinerja Dokter Spesialis Radiologi (1 Column) */}
          <div className="bg-[#0c111a] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Performa Dokter Spesialis Radiologi
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Volume ekspertise dan rata-rata kecepatan verifikasi per dokter
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {data.doctor_performance && data.doctor_performance.length > 0 ? (
                data.doctor_performance.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-[#00e5ff]/30 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00e5ff] to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {doc.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">{doc.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#00e5ff] font-bold">
                        {doc.total_reports} Kasus
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Rata-Rata TAT:</span>
                      <span className="font-mono text-white font-medium">{doc.avg_tat_formatted}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                      <span>Kepatuhan Standar:</span>
                      <span className={`font-bold ${doc.on_time_rate >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {doc.on_time_rate}% Tepat Waktu
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                  <User className="w-7 h-7 mb-2 opacity-30 text-gray-400" />
                  <p>Belum ada aktivitas verifikasi dokter pada filter ini.</p>
                </div>
              )}
            </div>

            {/* Modalitas Quick Chips */}
            {data.modality_breakdown && data.modality_breakdown.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                  Modalitas Terbanyak:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.modality_breakdown.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-300 border border-white/10 font-mono">
                      {m.modality}: <strong className="text-white">{m.total}</strong> ({m.avg_tat_formatted})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Live Worklist & Detailed TAT Table */}
        <div className="bg-[#0c111a] border border-white/10 rounded-2xl shadow-xl overflow-hidden print:border-none print:shadow-none">
          
          {/* Table Header Controls */}
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Rincian Waktu Tanggap & Kepatuhan Pasien</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/10 text-gray-300">
                  {filteredDetails.length} Data
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Daftar per-pemeriksaan untuk audit mutu, pelaporan komite medik, dan monitoring antrean
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Nama / No. RM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00e5ff] transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-bold uppercase tracking-wider text-[10px] print:text-black print:border-b-2 print:border-black">
                  <th className="py-3.5 px-4">No. RM & Pasien</th>
                  <th className="py-3.5 px-4">Modalitas / Foto</th>
                  <th className="py-3.5 px-4 text-center">Prioritas</th>
                  <th className="py-3.5 px-4">Waktu Selesai Foto</th>
                  <th className="py-3.5 px-4">Waktu Verifikasi</th>
                  <th className="py-3.5 px-4">Durasi TAT</th>
                  <th className="py-3.5 px-4 text-center">Status Mutu</th>
                  <th className="py-3.5 px-4">Dokter Sp.Rad</th>
                  <th className="py-3.5 px-4 text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium print:divide-gray-300">
                {filteredDetails.length > 0 ? (
                  filteredDetails.map((item) => {
                    const isCito = item.priority === 'cito';
                    const isOnTime = item.status === 'on_time';
                    const isDelayed = item.status === 'delayed';
                    const isPending = item.status === 'pending';

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors print:text-black">
                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white print:text-black truncate max-w-[180px]">
                            {item.patient?.name || 'Unknown'}
                          </div>
                          <div className="text-[11px] font-mono text-[#00e5ff] print:text-black mt-0.5">
                            {item.patient?.mrn || '-'}
                          </div>
                        </td>

                        {/* Modality / File */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold text-white print:border print:border-black print:text-black">
                              {item.modality}
                            </span>
                            <span className="truncate max-w-[160px] text-gray-300 print:text-black" title={item.file_name}>
                              {item.file_name}
                            </span>
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 text-center">
                          {isCito ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 shadow-[0_0_8px_rgba(217,70,239,0.3)]">
                              CITO
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              Reguler
                            </span>
                          )}
                        </td>

                        {/* Photographed Time */}
                        <td className="py-3.5 px-4 font-mono text-gray-300 print:text-black">
                          {item.created_at_display}
                        </td>

                        {/* Verified Time */}
                        <td className="py-3.5 px-4 font-mono text-gray-300 print:text-black">
                          {item.verified_at_display}
                        </td>

                        {/* TAT Duration */}
                        <td className="py-3.5 px-4 font-mono">
                          {item.is_completed ? (
                            <span className={`font-bold ${isOnTime ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.tat_formatted}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Menunggu {item.elapsed_formatted}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 block">
                            (Target: ≤ {item.target_minutes}m)
                          </span>
                        </td>

                        {/* Mutu Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isOnTime && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Tepat Waktu
                            </span>
                          )}
                          {isDelayed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" />
                              Terlambat
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Menunggu Baca
                            </span>
                          )}
                        </td>

                        {/* Doctor */}
                        <td className="py-3.5 px-4 text-gray-300 print:text-black">
                          {item.doctor_name !== '-' ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                              <span>{item.doctor_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Belum dibaca</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right print:hidden">
                          <Link
                            to={`/viewer/${item.uuid}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#00e5ff]/20 text-gray-300 hover:text-[#00e5ff] border border-white/10 hover:border-[#00e5ff]/40 text-[11px] font-medium transition-all"
                          >
                            <span>Viewer</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#00e5ff]" />
                      <p className="text-sm font-medium">Tidak ada data pemeriksaan yang cocok dengan filter.</p>
                      <p className="text-xs text-gray-600 mt-1">Coba sesuaikan tanggal atau pilihan filter prioritas di atas.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Printable Signature Section */}
          <div className="hidden print:grid grid-cols-2 gap-12 mt-12 px-6 pb-6 text-center text-xs text-black">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Instalasi Radiologi</p>
              <div className="h-20" />
              <p className="border-t border-black inline-block px-12 pt-1 font-bold">
                (dr. Sp.Rad)
              </p>
            </div>
            <div>
              <p>Divalidasi oleh,</p>
              <p className="font-bold">Komite Mutu & Keselamatan Pasien (KMKP)</p>
              <div className="h-20" />
              <p className="border-t border-black inline-block px-12 pt-1 font-bold">
                (Tim Indikator Mutu RS)
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
