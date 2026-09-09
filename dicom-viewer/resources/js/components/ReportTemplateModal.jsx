import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Search, 
  Star, 
  Plus, 
  X, 
  Check, 
  Copy, 
  Trash2, 
  Sparkles, 
  Tag, 
  Layers, 
  AlertCircle,
  Clock,
  ArrowRight,
  Bookmark
} from 'lucide-react';

export default function ReportTemplateModal({ 
  isOpen, 
  onClose, 
  onSelectTemplate, 
  currentReportText = '',
  defaultModality = 'ALL'
}) {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'create'
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState(defaultModality || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // New Template Form State
  const [formData, setFormData] = useState({
    title: '',
    modality: 'DX',
    category: 'Thorax',
    findings: '',
    conclusion: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      // Pre-fill form if current report has content
      if (currentReportText && currentReportText.trim().length > 0) {
        setFormData(prev => ({
          ...prev,
          findings: currentReportText,
          modality: defaultModality !== 'ALL' ? defaultModality : 'DX'
        }));
      }
    }
  }, [isOpen, defaultModality]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/report-templates');
      setTemplates(res.data.templates || []);
      if (res.data.templates && res.data.templates.length > 0) {
        setSelectedTemplate(res.data.templates[0]);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`/report-templates/${id}/favorite`);
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_favorite: res.data.is_favorite } : t));
      if (selectedTemplate && selectedTemplate.id === id) {
        setSelectedTemplate(prev => ({ ...prev, is_favorite: res.data.is_favorite }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Hapus template ini secara permanen?')) return;
    try {
      await axios.delete(`/report-templates/${id}`);
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      if (selectedTemplate && selectedTemplate.id === id) {
        setSelectedTemplate(updated[0] || null);
      }
      setStatusMessage({ type: 'success', text: 'Template berhasil dihapus.' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Gagal menghapus template sistem/bukan milik Anda.' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleSaveNewTemplate = async (e) => {
    e.preventDefault();
    const rawContent = (formData.content || formData.findings || '').trim();
    if (!formData.title.trim() || !rawContent) {
      setStatusMessage({ type: 'error', text: 'Judul dan uraian temuan template wajib diisi.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage({ type: '', text: '' });
    try {
      let finalContent = rawContent;
      if (formData.conclusion && formData.conclusion.trim() && !finalContent.includes(formData.conclusion.trim())) {
        finalContent += `\n\nKESIMPULAN:\n${formData.conclusion.trim()}`;
      }

      const res = await axios.post('/report-templates', {
        title: formData.title.trim(),
        modality: formData.modality,
        category: formData.category ? formData.category.trim() : 'Umum',
        content: finalContent,
        findings: rawContent,
        conclusion: formData.conclusion ? formData.conclusion.trim() : ''
      });

      const newT = res.data.template;
      setTemplates(prev => [newT, ...prev]);
      setSelectedTemplate(newT);
      setActiveTab('browse');
      setStatusMessage({ type: 'success', text: 'Template baru berhasil disimpan!' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Gagal menyimpan template: ' + (err.response?.data?.message || err.message) });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = (mode = 'replace') => {
    if (!selectedTemplate) return;
    
    // Combine content or findings + conclusion if present
    let formattedText = '';
    if (selectedTemplate.content && selectedTemplate.content.trim()) {
      formattedText = selectedTemplate.content.trim();
    } else if (selectedTemplate.findings && selectedTemplate.findings.trim()) {
      formattedText = selectedTemplate.findings.trim();
      if (selectedTemplate.conclusion && selectedTemplate.conclusion.trim() && !formattedText.includes(selectedTemplate.conclusion.trim())) {
        formattedText += `\n\nKESIMPULAN:\n${selectedTemplate.conclusion.trim()}`;
      }
    }

    if (!formattedText) {
      setStatusMessage({ type: 'error', text: 'Isi format template kosong.' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
      return;
    }

    onSelectTemplate(formattedText, mode);
    onClose();
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const q = (searchQuery || '').toLowerCase();
    const textContent = (t.content || t.findings || '').toLowerCase();
    const conclusionText = (t.conclusion || '').toLowerCase();
    const titleText = (t.title || '').toLowerCase();
    const categoryText = (t.category || '').toLowerCase();

    const matchesQuery = !q || 
      titleText.includes(q) ||
      categoryText.includes(q) ||
      textContent.includes(q) ||
      conclusionText.includes(q);

    const matchesModality = selectedModality === 'ALL' || t.modality === selectedModality;
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;

    return matchesQuery && matchesModality && matchesCategory;
  });

  // Extract unique categories for pill filters
  const categories = ['ALL', ...new Set(templates.map(t => t.category).filter(Boolean))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] max-h-[850px] bg-[#111] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative text-white">
        
        {/* Glow Header Accent */}
        <div className="absolute -top-24 left-1/4 w-96 h-48 bg-[#00e5ff]/10 blur-[90px] pointer-events-none" />
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00e5ff]/20 to-blue-500/20 border border-[#00e5ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <FileText className="w-5 h-5 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Template Ekspertise Medis
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20">
                  Macros
                </span>
              </h2>
              <p className="text-xs text-[#888]">Format baku standar radiologi untuk mempercepat pengisian hasil ekspertise</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'browse'
                    ? 'bg-[#00e5ff] text-black shadow-md'
                    : 'text-[#aaa] hover:text-white'
                }`}
              >
                Pilih Template
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-[#00e5ff] text-black shadow-md'
                    : 'text-[#aaa] hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Baru
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#888] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMessage.text && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
            statusMessage.type === 'error' 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Browse Templates */}
        {activeTab === 'browse' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Column: Filters & Template List */}
            <div className="w-full md:w-[45%] border-b md:border-b-0 md:border-r border-white/10 flex flex-col h-full bg-[#0d0d0d]">
              
              {/* Search & Modality Bar */}
              <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama template, organ, atau diagnosis..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#666] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Modality Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {['ALL', 'DX', 'CT', 'MR', 'US'].map(mod => (
                    <button
                      key={mod}
                      onClick={() => setSelectedModality(mod)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 ${
                        selectedModality === mod
                          ? 'bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black shadow-sm'
                          : 'bg-white/5 text-[#888] hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      {mod === 'ALL' ? 'Semua Modalitas' : mod}
                    </button>
                  ))}
                </div>

                {/* Category Pills */}
                {categories.length > 2 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all shrink-0 ${
                          selectedCategory === cat
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-[#777] hover:text-[#bbb]'
                        }`}
                      >
                        {cat === 'ALL' ? 'Semua Organ' : cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Templates List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="p-12 text-center text-xs text-[#777]">Memuat template medis...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#777] space-y-2">
                    <FileText className="w-8 h-8 mx-auto opacity-30 text-[#888]" />
                    <p>Tidak ada template yang cocok.</p>
                  </div>
                ) : (
                  filteredTemplates.map(t => {
                    const isSelected = selectedTemplate?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer group relative ${
                          isSelected
                            ? 'bg-[#00e5ff]/10 border-[#00e5ff]/50 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                              {t.modality}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-[#aaa] border border-white/10">
                              {t.category}
                            </span>
                            {(t.is_system || !t.doctor_id) && (
                              <span className="text-[9px] font-semibold text-[#666] uppercase tracking-wider">
                                Standar
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleToggleFavorite(e, t.id)}
                              className={`p-1 rounded-lg transition-colors ${
                                t.is_favorite 
                                  ? 'text-amber-400 hover:text-amber-300' 
                                  : 'text-[#555] hover:text-[#888] opacity-60 group-hover:opacity-100'
                              }`}
                              title={t.is_favorite ? 'Hapus dari favorit' : 'Tandai favorit'}
                            >
                              <Star className="w-4 h-4" fill={t.is_favorite ? 'currentColor' : 'none'} />
                            </button>

                            {(!t.is_system && Boolean(t.doctor_id)) && (
                              <button
                                onClick={(e) => handleDeleteTemplate(e, t.id)}
                                className="p-1 rounded-lg text-[#555] hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-colors"
                                title="Hapus template kustom"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className={`text-sm font-semibold mb-1 line-clamp-1 ${
                          isSelected ? 'text-[#00e5ff]' : 'text-white'
                        }`}>
                          {t.title}
                        </h4>

                        <p className="text-[11px] text-[#777] line-clamp-2 leading-relaxed font-mono">
                          {t.content || t.findings || '-'}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Template Preview & Apply Actions */}
            <div className="flex-1 flex flex-col h-full bg-[#141414]">
              {selectedTemplate ? (
                <>
                  {/* Preview Header */}
                  <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.01]">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                          {selectedTemplate.modality}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {selectedTemplate.category}
                        </span>
                        {(selectedTemplate.is_system || !selectedTemplate.doctor_id) ? (
                          <span className="text-xs text-[#777]">Template Standar RSIA Livasya</span>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Bookmark className="w-3 h-3" /> Template Pribadi
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white">{selectedTemplate.title}</h3>
                    </div>

                    <button
                      onClick={(e) => handleToggleFavorite(e, selectedTemplate.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        selectedTemplate.is_favorite
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-white/5 border-white/10 text-[#888] hover:text-white'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={selectedTemplate.is_favorite ? 'currentColor' : 'none'} />
                      {selectedTemplate.is_favorite ? 'Favorit' : 'Jadikan Favorit'}
                    </button>
                  </div>

                  {/* Preview Body */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm">
                    <div>
                      <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                        Format Teks Ekspertise Baku (Findings &amp; Kesan)
                      </label>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs leading-relaxed text-[#ddd] whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto">
                        {selectedTemplate.content || selectedTemplate.findings || 'Template tidak memiliki teks temuan.'}
                      </div>
                    </div>

                    {selectedTemplate.conclusion && !selectedTemplate.content?.includes(selectedTemplate.conclusion) && (
                      <div>
                        <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                          Kesimpulan (Conclusion)
                        </label>
                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 font-mono text-xs leading-relaxed text-amber-200 whitespace-pre-wrap select-text">
                          {selectedTemplate.conclusion}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apply Actions Footer */}
                  <div className="p-5 border-t border-white/10 bg-[#0e0e0e] flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-[#777]">
                      Pilih cara memasukkan template ke lembar ekspertise:
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApply('append')}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-2"
                        title="Tambahkan teks template ini di bagian akhir teks yang sudah ada"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#00e5ff]" />
                        Sisipkan di Akhir (Append)
                      </button>

                      <button
                        onClick={() => handleApply('replace')}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00e5ff] to-blue-600 hover:opacity-95 text-black font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                        title="Ganti seluruh teks ekspertise dengan template ini"
                      >
                        <Check className="w-4 h-4" />
                        Ganti Seluruh Teks
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#666]">
                  <FileText className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Pilih salah satu template di sebelah kiri untuk melihat isi dan menerapkannya.</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Tab 2: Create New Custom Template */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0e0e0e]">
            <form onSubmit={handleSaveNewTemplate} className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Simpan Template Ekspertise Baru</h3>
                <p className="text-xs text-[#888]">
                  Buat template baru untuk mempercepat pembacaan kasus sejenis di kemudian hari.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                    Judul / Nama Template <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Thorax Normal Dewasa (PA)"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                      Modalitas
                    </label>
                    <select
                      value={formData.modality}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00e5ff]"
                    >
                      <option value="DX">DX (X-Ray)</option>
                      <option value="CT">CT Scan</option>
                      <option value="MR">MRI</option>
                      <option value="US">USG</option>
                      <option value="CR">CR</option>
                      <option value="OTHER">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                      Kategori / Organ
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Thorax, Abdomen, dll"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#00e5ff]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                  Uraian Temuan Klinis (Findings) <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  value={formData.findings}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  placeholder="Masukkan teks baku hasil pemeriksaan radiologi..."
                  className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">
                  Kesimpulan (Conclusion) - <span className="text-[#666] font-normal">Opsional</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.conclusion}
                  onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                  placeholder="Contoh: Cor dan Pulmo dalam batas normal."
                  className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#aaa] hover:text-white text-xs font-bold transition-all"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00e5ff] to-blue-600 hover:opacity-95 text-black font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Template Medis'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
