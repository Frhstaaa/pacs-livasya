import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Globe, HelpCircle, Check, Sparkles, X } from 'lucide-react';

export default function VoiceDictation({ 
  onTranscript, 
  onFinal, 
  onInterim, 
  onListeningChange, 
  resetKey = 0, 
  disabled = false 
}) {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('id-ID'); // 'id-ID' or 'en-US'
  const [interimText, setInterimText] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [audioLevel, setAudioLevel] = useState([1, 1, 1, 1]); // for sound wave animation

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const currentInterimRef = useRef('');

  // Keep callback refs synchronized to prevent recreating SpeechRecognition on parent re-renders
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onTranscriptRef = useRef(onTranscript);
  const onListeningChangeRef = useRef(onListeningChange);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
    onTranscriptRef.current = onTranscript;
    onListeningChangeRef.current = onListeningChange;
  });

  // Notify parent of listening state change
  const setListeningState = (val) => {
    setIsListening(val);
    isListeningRef.current = val;
    if (onListeningChangeRef.current) {
      onListeningChangeRef.current(val);
    }
  };

  // Handle external reset of speech buffer (e.g. when user types manually during dictation)
  const resetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (resetKey !== resetKeyRef.current) {
      resetKeyRef.current = resetKey;
      currentInterimRef.current = '';
      setInterimText('');
      if (onInterimRef.current) onInterimRef.current('');
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [resetKey]);

  // Check browser SpeechRecognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalChunk) {
        currentInterimRef.current = '';
        setInterimText('');
        // Apply smart Indonesian punctuation & medical formatting
        const formatted = formatSpeechPunctuation(finalChunk.trim(), language);
        if (formatted) {
          // IMPORTANT: Call only onFinal if provided, fallback to onTranscript (never both)
          if (onFinalRef.current) {
            onFinalRef.current(formatted);
          } else if (onTranscriptRef.current) {
            onTranscriptRef.current(formatted);
          }
        }
      }

      if (interim) {
        // Stream real-time interim speech as it is being spoken
        const formattedInterim = formatSpeechPunctuation(interim.trim(), language);
        currentInterimRef.current = formattedInterim;
        setInterimText(formattedInterim);
        if (onInterimRef.current) {
          onInterimRef.current(formattedInterim);
        }
      } else if (!finalChunk) {
        currentInterimRef.current = '';
        setInterimText('');
        if (onInterimRef.current) {
          onInterimRef.current('');
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setListeningState(false);
        alert('Izin mikrofon diblokir. Harap izinkan akses mikrofon di pengaturan browser untuk menggunakan Dikte Suara.');
      }
    };

    recognition.onend = () => {
      // Auto-restart if user didn't explicitly stop (handles browser silence timeouts)
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              if (e.name !== 'InvalidStateError') {
                setListeningState(false);
              }
            }
          }
        }, 150);
      } else {
        setListeningState(false);
        setInterimText('');
        if (onInterimRef.current) onInterimRef.current('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [language]);

  // Animated wave effect while listening
  useEffect(() => {
    let interval;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel([
          Math.floor(Math.random() * 16) + 4,
          Math.floor(Math.random() * 24) + 6,
          Math.floor(Math.random() * 20) + 4,
          Math.floor(Math.random() * 14) + 4,
        ]);
      }, 120);
    } else {
      setAudioLevel([4, 4, 4, 4]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Toggle listening
  const toggleListening = () => {
    if (disabled || !isSupported) return;

    if (isListening) {
      setListeningState(false);

      // Finalize any lingering interim so spoken words right before clicking stop aren't lost
      if (currentInterimRef.current) {
        const formatted = formatSpeechPunctuation(currentInterimRef.current.trim(), language);
        if (formatted) {
          if (onFinalRef.current) {
            onFinalRef.current(formatted);
          } else if (onTranscriptRef.current) {
            onTranscriptRef.current(formatted);
          }
        }
        currentInterimRef.current = '';
      }
      setInterimText('');
      if (onInterimRef.current) onInterimRef.current('');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = language;
          recognitionRef.current.start();
          setListeningState(true);
        } catch (e) {
          console.error('Failed to start speech recognition:', e);
        }
      }
    }
  };

  /**
   * Smart Punctuation & Medical Formatting for Indonesian Speech
   * Converts verbal commands like "titik", "koma", "baris baru", "kesan", "saran" into actual punctuation.
   */
  const formatSpeechPunctuation = (text, lang) => {
    if (!text) return '';
    let res = text;

    if (lang === 'id-ID') {
      // Punctuation replacements (case-insensitive)
      res = res
        .replace(/\bbaris baru\b/gi, '\n')
        .replace(/\bganti baris\b/gi, '\n')
        .replace(/\bparagraf baru\b/gi, '\n\n')
        .replace(/\btitik dua\b/gi, ': ')
        .replace(/\btitik koma\b/gi, '; ')
        .replace(/\btitik\b/gi, '. ')
        .replace(/\bkoma\b/gi, ', ')
        .replace(/\btanda tanya\b/gi, '? ')
        .replace(/\btanda seru\b/gi, '! ')
        .replace(/\bbuka kurung\b/gi, ' (')
        .replace(/\btutup kurung\b/gi, ') ')
        .replace(/\bgaris miring\b/gi, '/')
        .replace(/\bstrip\b|\bgaris datar\b/gi, '- ')
        .replace(/\bnomor satu\b/gi, '\n1. ')
        .replace(/\bnomor dua\b/gi, '\n2. ')
        .replace(/\bnomor tiga\b/gi, '\n3. ')
        .replace(/\bkesimpulan\b/gi, '\n\nKesimpulan: ')
        .replace(/\bkesan\b/gi, '\n\nKesan: ')
        .replace(/\bsaran\b/gi, '\n\nSaran: ')
        .replace(/\btemuan\b/gi, '\n\nTemuan: ')
        .replace(/\bdiagnosa\b|\bdiagnosis\b/gi, '\n\nDiagnosis: ');
    } else {
      res = res
        .replace(/\bnew line\b|\bnext line\b/gi, '\n')
        .replace(/\bnew paragraph\b/gi, '\n\n')
        .replace(/\bcolon\b/gi, ': ')
        .replace(/\bsemicolon\b/gi, '; ')
        .replace(/\bperiod\b|\bfull stop\b|\bdot\b/gi, '. ')
        .replace(/\bcomma\b/gi, ', ')
        .replace(/\bquestion mark\b/gi, '? ')
        .replace(/\bexclamation mark\b/gi, '! ')
        .replace(/\bopen parenthesis\b/gi, ' (')
        .replace(/\bclose parenthesis\b/gi, ') ')
        .replace(/\bslash\b/gi, '/')
        .replace(/\bhyphen\b|\bdash\b/gi, '- ')
        .replace(/\bconclusion\b/gi, '\n\nConclusion: ')
        .replace(/\bimpression\b/gi, '\n\nImpression: ')
        .replace(/\bfindings\b/gi, '\n\nFindings: ')
        .replace(/\brecommendation\b/gi, '\n\nRecommendation: ');
    }

    // Capitalize first character if lowercase
    res = res.replace(/^[a-z]/, char => char.toUpperCase());

    // Capitalize first letter after newline or dot
    res = res.replace(/([.!?\n]\s*)([a-z])/g, (match, prefix, char) => prefix + char.toUpperCase());

    return res;
  };

  if (!isSupported) {
    return (
      <div className="text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl mb-2 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Browser ini belum mendukung Web Speech API. Gunakan Google Chrome atau Microsoft Edge untuk fitur Dikte Suara.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-2.5">
      {/* Main Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-[#121824] border border-white/10 rounded-xl">
        
        {/* Left: Microphone Trigger & Listening Wave */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              isListening
                ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-white/5 hover:bg-[#00e5ff]/20 text-gray-300 hover:text-[#00e5ff] border border-white/10 hover:border-[#00e5ff]/40'
            } disabled:opacity-40 disabled:pointer-events-none`}
            title={isListening ? "Hentikan Dikte Suara" : "Mulai Dikte Suara"}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
                <span>Mendengarkan...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Dikte Suara</span>
              </>
            )}
          </button>

          {/* Sound Wave Bars when active */}
          {isListening && (
            <div className="flex items-center gap-1 h-5 px-2 bg-black/40 rounded-md border border-rose-500/30">
              {audioLevel.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-rose-400 rounded-full transition-all duration-100"
                  style={{ height: `${height}px` }}
                />
              ))}
              <span className="text-[10px] text-rose-300 font-mono ml-1 font-semibold">REC</span>
            </div>
          )}
        </div>

        {/* Right: Language Selector & Help Tooltip */}
        <div className="flex items-center gap-1.5">
          {/* Language Toggle */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLanguage('id-ID')}
              className={`px-2 py-0.5 rounded transition-all ${
                language === 'id-ID' 
                  ? 'bg-[#00e5ff] text-black font-extrabold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Bahasa Indonesia"
            >
              🇮🇩 ID
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en-US')}
              className={`px-2 py-0.5 rounded transition-all ${
                language === 'en-US' 
                  ? 'bg-[#00e5ff] text-black font-extrabold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="English (US)"
            >
              🇺🇸 EN
            </button>
          </div>

          {/* Command Help Trigger */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1.5 rounded-lg border transition-all text-gray-400 hover:text-white ${
              showHelp ? 'bg-[#00e5ff]/20 border-[#00e5ff]/40 text-[#00e5ff]' : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            title="Bantuan Perintah Suara"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realtime Interim Transcript Stream (Floating words while speaking) */}
      {isListening && interimText && (
        <div className="mt-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500/10 to-[#00e5ff]/10 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-pulse">
          <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="italic truncate font-mono">"{interimText}"</span>
        </div>
      )}

      {/* Help Modal / Popover */}
      {showHelp && (
        <div className="mt-2 p-3 bg-[#0d131f] border border-[#00e5ff]/30 rounded-xl text-[11px] text-gray-300 shadow-xl space-y-2 relative animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-[#00e5ff] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00e5ff]" />
              Panduan Perintah Suara (Voice Commands)
            </span>
            <button 
              type="button" 
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-gray-400">
            Sistem secara cerdas mengubah kata ucapan tanda baca menjadi simbol teks otomatis:
          </p>

          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"titik"</strong> → <span className="text-[#00e5ff]">.</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"koma"</strong> → <span className="text-[#00e5ff]">,</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"titik dua"</strong> → <span className="text-[#00e5ff]">:</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"baris baru"</strong> → <span className="text-[#00e5ff]">[Enter]</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"kesan"</strong> → <span className="text-[#00e5ff]">Kesan:</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"saran"</strong> → <span className="text-[#00e5ff]">Saran:</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"nomor satu"</strong> → <span className="text-[#00e5ff]">1.</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded border border-white/5">
              <strong className="text-white">"kesimpulan"</strong> → <span className="text-[#00e5ff]">Kesimpulan:</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 italic">
            Contoh: Ucapkan <em>"Cor normal titik Pulmo bersih titik baris baru Kesan tidak tampak kardiomegali titik"</em>
          </p>
        </div>
      )}
    </div>
  );
}
