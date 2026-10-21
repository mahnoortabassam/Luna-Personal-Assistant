import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MAHNOOR_PROFILE } from './knowledge/mahnoorData';
import { PearlOrb } from './components/PearlOrb';
import { ExperienceSection } from './components/ExperienceSection';
import { SkillsSection } from './components/SkillsSection';
import { ResumeViewerModal } from './components/ResumeViewerModal';
import {
  FileText,
  Mail,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Radio,
} from 'lucide-react';

interface TranscriptMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Synthesizes a soft, pleasant connect chime using Web Audio
function playConnectChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.09, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch {
    // ignore
  }
}

export default function App() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [speakerLabel, setSpeakerLabel] = useState<'Luna' | 'You'>('Luna');
  const [captionText, setCaptionText] = useState<string>(
    '“Hi there! Tap the pearl on me to talk, or select any question below to explore Mahnoor’s Power BI and data analysis work.”'
  );
  const [callDuration, setCallDuration] = useState<number>(0);
  const [messages, setMessages] = useState<TranscriptMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi there! Tap on me to talk, or select any question below to explore Mahnoor's work in Power BI, star schema data modeling, SQL pipelines, and data analytics.",
      timestamp: new Date(),
    },
  ]);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'experience' | 'skills'>('assistant');

  // Audio & Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  // Timer for active call
  useEffect(() => {
    let timer: number | undefined;
    if (status !== 'idle') {
      timer = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  const stopVoiceSession = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    setStatus('idle');
    setSpeakerLabel('Luna');
  }, []);

  // Speak a sentence using Luna's voice (via /api/tts or Web Speech Synthesis)
  const speakLunaText = async (text: string, onEnded?: () => void) => {
    setStatus('speaking');
    setSpeakerLabel('Luna');
    setCaptionText(`“${text}”`);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Aoede' }),
      });

      const data = await res.json();
      if (data.audio) {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
        }
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        ttsAudioRef.current = audio;
        audio.onended = () => {
          onEnded ? onEnded() : startListeningForUser();
        };
        audio.onerror = () => {
          onEnded ? onEnded() : startListeningForUser();
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('Backend TTS fallback to browser speech synthesis:', e);
    }

    // Fallback: Browser Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.15;
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes('Samantha') ||
          v.name.includes('Google US') ||
          v.name.includes('Zira') ||
          (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        onEnded ? onEnded() : startListeningForUser();
      };
      utterance.onerror = () => {
        onEnded ? onEnded() : startListeningForUser();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        onEnded ? onEnded() : startListeningForUser();
      }, 3500);
    }
  };

  // Starts microphone listening for user question
  const startListeningForUser = useCallback(() => {
    if (isMutedRef.current) {
      setStatus('listening');
      setSpeakerLabel('You');
      setCaptionText('“Microphone is muted. Click unmute or tap a pill.”');
      return;
    }

    setStatus('listening');
    setSpeakerLabel('You');
    setCaptionText('“Listening to you... Speak your question about Mahnoor.”');

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setCaptionText('“Listening via microphone... (Or tap any question below to explore!)”');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setStatus('listening');
        setSpeakerLabel('You');
        setCaptionText('“Listening closely... Speak naturally.”');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');

        setCaptionText(`“${transcript}”`);

        if (event.results[0].isFinal) {
          handleUserQuery(transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition warning/error:', e.error);
        if (e.error === 'not-allowed') {
          setCaptionText(
            '“Microphone access was denied. You can still tap any question pill below to hear Luna!”'
          );
          setStatus('idle');
        } else if (e.error !== 'aborted') {
          // Restart listening after brief pause
          setTimeout(() => {
            if (status !== 'idle') {
              startListeningForUser();
            }
          }, 1200);
        }
      };

      recognition.onend = () => {
        // If ended without final, keep waiting unless ended by user
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, [status]);

  // Handle incoming user query
  const handleUserQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setSpeakerLabel('You');
    setCaptionText(`“${queryText}”`);
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        role: 'user',
        text: queryText,
        timestamp: new Date(),
      },
    ]);

    setStatus('connecting');

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText, history }),
      });

      const data = await res.json();
      const reply =
        data.reply ||
        "Mahnoor is a skilled Data Analyst specializing in Power BI KPI dashboards and star schema data modeling!";

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'model',
          text: reply,
          timestamp: new Date(),
        },
      ]);

      // Speak back to user, then resume listening
      await speakLunaText(reply, () => {
        startListeningForUser();
      });
    } catch (err) {
      console.error('Error in chat response:', err);
      speakLunaText(
        "Mahnoor built an end-to-end Power BI dashboard at Ericsson and automated test workflows at Reetro!",
        () => startListeningForUser()
      );
    }
  };

  // Main entrypoint: Click Pearl to Start Voice Conversation
  const handlePearlClick = async () => {
    if (status === 'idle') {
      // 1. Play immediate audio feedback chime
      playConnectChime();

      // 2. Request mic permission immediately during direct user gesture
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
        }
      } catch (err) {
        console.warn('Microphone permission prompt issue:', err);
      }

      // 3. Immediately set connecting and have Luna greet the user
      setStatus('connecting');
      setSpeakerLabel('Luna');
      setCaptionText('“Connecting to Luna...”');

      const greeting =
        "Hi! I'm Luna. It's so nice to meet you! How can I help you explore Mahnoor's Power BI dashboards and data analytics work?";

      // Speak greeting, then immediately start listening for user
      await speakLunaText(greeting, () => {
        startListeningForUser();
      });
    } else if (status === 'speaking') {
      // Interrupt current speech
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      startListeningForUser();
    } else {
      // End call
      stopVoiceSession();
      setCaptionText('“Voice call ended. Tap the pearl anytime to start again!”');
    }
  };

  const handleInterrupt = () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    startListeningForUser();
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      } else if (!next && status === 'listening') {
        startListeningForUser();
      }
      return next;
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden relative text-[#1D1A17] font-sans">
      {/* Editorial Header */}
      <header className="px-6 md:px-14 py-8 flex flex-col sm:flex-row justify-between items-center sm:items-baseline border-b border-[#E6E1D9] gap-4 bg-transparent z-10">
        <div className="flex items-baseline flex-wrap justify-center sm:justify-start">
          <span className="font-serif text-lg tracking-[0.08em] uppercase font-medium text-[#1D1A17]">
            Mahnoor Tabassam
          </span>
          <span className="font-editorial italic text-[#7A746E] text-base ml-2">
            — Data Analyst
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Status badge with glowing dot */}
          <div className="flex items-center gap-2 tracking-[0.12em] uppercase text-[#7A746E] text-[11px] font-medium">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                status === 'speaking' || status === 'listening'
                  ? 'bg-[#E8B4B8] shadow-[0_0_12px_#E8B4B8]'
                  : status === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-[#73C991]'
              }`}
            />
            <span>
              {status === 'speaking'
                ? 'Luna is speaking'
                : status === 'listening'
                ? 'Listening to you...'
                : status === 'connecting'
                ? 'Connecting...'
                : 'Luna is ready'}
            </span>
          </div>

          <span className="text-[#E6E1D9]">|</span>

          <button
            onClick={() => setIsResumeModalOpen(true)}
            className="hover:text-[#E8B4B8] text-[#1D1A17] transition-colors cursor-pointer flex items-center gap-1 font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-[#E8B4B8]" />
            <span>Resume PDF</span>
          </button>
        </div>
      </header>

      {/* Main Assistant Interface */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-4xl mx-auto w-full text-center z-10">
        <div className="font-editorial text-lg sm:text-xl italic text-[#7A746E] mb-2">
          Personal Representative & Voice Concierge
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-tight tracking-tight mb-3 text-[#1D1A17]">
          Meet Luna
        </h1>

        <p className="text-sm sm:text-base text-[#7A746E] font-light leading-relaxed max-w-xl mx-auto mb-8">
          Tap the pearl orb below to converse. Luna speaks with a bright, charming tone to guide you through Mahnoor&rsquo;s work in Power BI, star schema data modeling, SQL pipelines, and data analytics.
        </p>

        {/* Clickable Pearl Orb with Dynamic Working Animation */}
        <div className="mb-4 relative">
          <PearlOrb
            status={status}
            onClick={handlePearlClick}
            isMuted={isMuted}
          />
        </div>

        {/* Visual Call-in-Progress Indicator & Equalizer when active */}
        {status !== 'idle' ? (
          <div className="mb-6 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8B4B8]/20 border border-[#E8B4B8]/50 text-xs text-[#1D1A17] font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#E8B4B8] animate-ping" />
              <Radio className="w-3.5 h-3.5 text-[#2B2623]" />
              <span>LIVE CALL ACTIVE · {formatTimer(callDuration)}</span>
            </div>

            {/* Real-time equalizing sound wave animation */}
            <div className="flex items-center gap-1 h-5 px-3 py-1 bg-white/70 backdrop-blur-xs rounded-full border border-[#E6E1D9]">
              <span className="text-[10px] text-[#7A746E] uppercase tracking-wider mr-1">
                {status === 'speaking' ? 'Voice Active' : 'Microphone Ready'}
              </span>
              {[4, 12, 18, 9, 16, 22, 14, 8, 15, 6].map((h, i) => (
                <span
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-150 ${
                    status === 'speaking' ? 'bg-[#E8B4B8]' : 'bg-[#2F6B5F]'
                  }`}
                  style={{
                    height: `${status === 'speaking' ? h : Math.max(4, h * 0.4)}px`,
                    animation: `eq-bounce 0.${7 + (i % 5)}s infinite ease-in-out`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] uppercase tracking-widest text-[#7A746E] mb-6 flex items-center justify-center gap-1.5 font-medium animate-pulse">
            <Sparkles className="w-3 h-3 text-[#E8B4B8]" />
            <span>Click the pearl to start voice conversation</span>
          </div>
        )}

        {/* Active controls during voice call */}
        {status !== 'idle' && (
          <div className="flex items-center gap-2 mb-6 animate-in fade-in">
            <button
              onClick={handleToggleMute}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer rounded-full ${
                isMuted
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-[#E6E1D9] text-[#1D1A17] hover:bg-[#F3EFEA]'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5 text-amber-700" /> : <Mic className="w-3.5 h-3.5 text-[#2F6B5F]" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {status === 'speaking' && (
              <button
                onClick={handleInterrupt}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-[#E6E1D9] bg-white text-[#1D1A17] hover:bg-[#F3EFEA] transition-colors cursor-pointer rounded-full"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#E8B4B8]" />
                <span>Interrupt</span>
              </button>
            )}

            <button
              onClick={stopVoiceSession}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#8B261E] hover:bg-[#741E17] text-white transition-colors cursor-pointer rounded-full shadow-sm"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          </div>
        )}

        {/* Live Captions Box */}
        <div className="min-h-[85px] flex flex-col items-center justify-center mb-7 w-full max-w-2xl px-4">
          <span className="text-[11px] tracking-[0.15em] uppercase text-[#E8B4B8] font-semibold mb-1.5">
            {speakerLabel}
          </span>
          <p className="font-editorial text-xl sm:text-2xl italic text-[#1D1A17] leading-relaxed transition-opacity duration-300">
            {captionText}
          </p>
        </div>

        {/* Interactive Prompt Pills rooted in Resume & Power BI */}
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mb-8">
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('Who is Mahnoor Tabassam?')}
          >
            Who is Mahnoor?
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('Tell me about Mahnoor’s Power BI dashboard at Ericsson.')}
          >
            Power BI at Ericsson
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('Explain her Star Schema data modeling and DAX measures expertise.')}
          >
            Star Schema & DAX
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('How does she integrate Snowflake, SharePoint, and Excel via SQL?')}
          >
            SQL & Snowflake ETL
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('What did she achieve at Reetro and Wise?')}
          >
            QA at Reetro & Wise
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('What is her academic background at Estonian Business School?')}
          >
            Education (EBS)
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handleUserQuery('How can I get in touch or hire Mahnoor?')}
          >
            Get in Touch
          </button>
        </div>

        {/* Section toggles for detailed dossier */}
        <div className="w-full max-w-3xl pt-6 border-t border-[#E6E1D9]/80 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setActiveTab(activeTab === 'experience' ? 'assistant' : 'experience')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                activeTab === 'experience'
                  ? 'bg-[#1D1A17] text-white border-[#1D1A17]'
                  : 'bg-white border-[#E6E1D9] text-[#7A746E] hover:text-[#1D1A17]'
              }`}
            >
              Career Experience
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'skills' ? 'assistant' : 'skills')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-[#1D1A17] text-white border-[#1D1A17]'
                  : 'bg-white border-[#E6E1D9] text-[#7A746E] hover:text-[#1D1A17]'
              }`}
            >
              Technical & BI Stack
            </button>
            <button
              onClick={() => setShowTranscript((prev) => !prev)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer flex items-center gap-1 ${
                showTranscript
                  ? 'bg-[#E8B4B8] text-[#1D1A17] border-[#E8B4B8]'
                  : 'bg-white border-[#E6E1D9] text-[#7A746E] hover:text-[#1D1A17]'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Transcript</span>
              {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible Transcript Drawer */}
          {showTranscript && (
            <div className="w-full text-left bg-white border border-[#E6E1D9] p-5 shadow-sm mb-6 max-h-72 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0EEEA] text-xs font-medium text-[#7A746E]">
                <span>Conversation Log</span>
                <span>{messages.length} exchanges</span>
              </div>
              {messages.map((m) => (
                <div key={m.id} className="text-xs space-y-0.5">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-[#E8B4B8]">
                    {m.role === 'user' ? 'You' : 'Luna'}:
                  </span>
                  <p className="text-[#1D1A17] leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Expanded Experience Tab */}
          {activeTab === 'experience' && (
            <div className="w-full text-left animate-in fade-in duration-200">
              <ExperienceSection
                onAskAboutExperience={(q) => {
                  setActiveTab('assistant');
                  handleUserQuery(q);
                }}
              />
            </div>
          )}

          {/* Expanded Skills Tab */}
          {activeTab === 'skills' && (
            <div className="w-full text-left animate-in fade-in duration-200">
              <SkillsSection />
            </div>
          )}
        </div>
      </main>

      {/* Minimal Editorial Footer */}
      <footer className="px-6 md:px-14 py-8 flex flex-col sm:flex-row justify-between items-center border-t border-[#E6E1D9] text-xs text-[#7A746E] gap-3 bg-transparent z-10">
        <div className="font-editorial text-base italic text-[#1D1A17] flex items-center gap-2">
          <span>Voice Profile:</span>
          <span>Luna (Articulate Tone · Power BI & Data Analytics)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] tracking-wide text-[#7A746E]">
          <span>Tallinn, Estonia • Estonian Business School</span>
          <span>•</span>
          <a
            href={`mailto:${MAHNOOR_PROFILE.email}`}
            className="hover:text-[#1D1A17] text-[#7A746E] flex items-center gap-1 transition-colors"
          >
            <Mail className="w-3 h-3" />
            <span>{MAHNOOR_PROFILE.email}</span>
          </a>
        </div>
      </footer>

      {/* Official PDF Resume Modal */}
      <ResumeViewerModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />
    </div>
  );
}
