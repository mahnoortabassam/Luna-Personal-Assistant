import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MAHNOOR_PROFILE } from './knowledge/mahnoorData';
import { PearlOrb } from './components/PearlOrb';
import { ExperienceSection } from './components/ExperienceSection';
import { SkillsSection } from './components/SkillsSection';
import { ResumeViewerModal } from './components/ResumeViewerModal';
import {
  LiveAudioPlayer,
  downsampleTo16kHz,
  float32ToInt16PCM,
  arrayBufferToBase64,
} from './utils/audioUtils';
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
} from 'lucide-react';

interface TranscriptMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function App() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [speakerLabel, setSpeakerLabel] = useState<'Luna' | 'You'>('Luna');
  const [captionText, setCaptionText] = useState<string>(
    '“Hi there! Tap the pearl on me to talk, or select any question below to explore Mahnoor’s Power BI and data analysis work.”'
  );
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

  // WebSocket & Web Audio refs for Gemini Live API
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  // Active audio element for TTS playback
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  const stopVoiceSession = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }
    if (micAudioCtxRef.current && micAudioCtxRef.current.state !== 'closed') {
      try {
        micAudioCtxRef.current.close();
      } catch {}
      micAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.close();
      playerRef.current = null;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setStatus('idle');
  }, []);

  const startMicCapture = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      micAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16kHz(inputChannelData, audioCtx.sampleRate);
        const pcm16 = float32ToInt16PCM(downsampled);
        const base64 = arrayBufferToBase64(pcm16.buffer);

        ws.send(
          JSON.stringify({
            type: 'audio',
            audio: base64,
          })
        );
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setStatus('listening');
      setSpeakerLabel('You');
      setCaptionText('“Listening closely... Speak your question about Mahnoor.”');
    } catch (err) {
      console.error('Microphone error:', err);
      setStatus('idle');
      setCaptionText(
        '“Microphone access was denied. You can still tap any question pill below to hear me speak!”'
      );
    }
  };

  const startLiveSession = async () => {
    setStatus('connecting');
    setSpeakerLabel('Luna');
    setCaptionText('“Connecting to Luna’s voice channel...”');

    try {
      if (!playerRef.current) {
        playerRef.current = new LiveAudioPlayer((isSpeaking) => {
          setStatus(isSpeaking ? 'speaking' : 'listening');
          if (isSpeaking) {
            setSpeakerLabel('Luna');
          }
        });
      }
      playerRef.current.init();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live-api`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let modelTextAccumulator = '';

      ws.onopen = async () => {
        await startMicCapture(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'audio' && msg.audio) {
            playerRef.current?.playPcmChunk(msg.audio);
          } else if (msg.type === 'model_text' && msg.text) {
            modelTextAccumulator += msg.text;
            setSpeakerLabel('Luna');
            setCaptionText(`“${modelTextAccumulator}”`);
          } else if (msg.type === 'transcript') {
            if (msg.role === 'model' && msg.text) {
              modelTextAccumulator += msg.text;
              setSpeakerLabel('Luna');
              setCaptionText(`“${modelTextAccumulator}”`);
            } else if (msg.role === 'user' && msg.text) {
              setSpeakerLabel('You');
              setCaptionText(`“${msg.text}”`);
              setMessages((prev) => [
                ...prev,
                {
                  id: Math.random().toString(36).substring(7),
                  role: 'user',
                  text: msg.text,
                  timestamp: new Date(),
                },
              ]);
            }
          } else if (msg.type === 'turn_complete') {
            if (modelTextAccumulator.trim()) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Math.random().toString(36).substring(7),
                  role: 'model',
                  text: modelTextAccumulator.trim(),
                  timestamp: new Date(),
                },
              ]);
              modelTextAccumulator = '';
            }
          } else if (msg.type === 'interrupted') {
            playerRef.current?.stop();
            setStatus('listening');
            setSpeakerLabel('You');
            setCaptionText('“Listening to you...”');
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        stopVoiceSession();
      };

      ws.onclose = () => {
        stopVoiceSession();
      };
    } catch (err) {
      console.error('Failed to start Live session:', err);
      stopVoiceSession();
    }
  };

  const handlePearlClick = () => {
    if (status === 'idle') {
      startLiveSession();
    } else if (status === 'speaking') {
      playerRef.current?.stop();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      setStatus('listening');
      setSpeakerLabel('You');
      setCaptionText('“Paused. What else would you like to know?”');
    } else {
      stopVoiceSession();
      setSpeakerLabel('Luna');
      setCaptionText('“Voice session ended. Tap the pearl anytime to talk again!”');
    }
  };

  const handleInterrupt = () => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    setStatus('listening');
    setSpeakerLabel('You');
    setCaptionText('“Listening to you...”');
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Speaks an answer for a quick pill prompt or text query
  const handlePrompt = async (promptText: string) => {
    setSpeakerLabel('You');
    setCaptionText(`“${promptText}”`);
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        role: 'user',
        text: promptText,
        timestamp: new Date(),
      },
    ]);

    setStatus('connecting');

    try {
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptText, history }),
      });

      const data = await res.json();
      const reply = data.reply || "Mahnoor is a skilled Data Analyst specializing in Power BI and star schema modeling!";

      setSpeakerLabel('Luna');
      setCaptionText(`“${reply}”`);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'model',
          text: reply,
          timestamp: new Date(),
        },
      ]);

      // Request and play speech audio via TTS
      try {
        setStatus('speaking');
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: reply, voice: 'Aoede' }),
        });
        const ttsData = await ttsRes.json();
        if (ttsData.audio) {
          if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
          }
          const audio = new Audio(`data:audio/wav;base64,${ttsData.audio}`);
          ttsAudioRef.current = audio;
          audio.onended = () => {
            setStatus('idle');
          };
          audio.onerror = () => {
            setStatus('idle');
          };
          await audio.play();
        } else {
          setStatus('idle');
        }
      } catch {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error answering prompt:', err);
      setStatus('idle');
      setCaptionText('“Could not connect to the model. Please check the network or try again!”');
    }
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

        {/* Clickable Pearl Orb */}
        <div className="mb-4">
          <PearlOrb
            status={status}
            onClick={handlePearlClick}
            isMuted={isMuted}
          />
        </div>

        {/* Small click helper badge */}
        <div className="text-[11px] uppercase tracking-widest text-[#7A746E] mb-6 flex items-center justify-center gap-1.5 font-medium">
          <Sparkles className="w-3 h-3 text-[#E8B4B8]" />
          <span>
            {status === 'idle'
              ? 'Click pearl to start voice conversation'
              : status === 'listening'
              ? 'Listening · Click pearl to stop'
              : status === 'speaking'
              ? 'Speaking · Click pearl to pause'
              : 'Connecting...'}
          </span>
        </div>

        {/* Active controls when in conversation */}
        {status !== 'idle' && (
          <div className="flex items-center gap-2 mb-6 animate-in fade-in">
            <button
              onClick={handleToggleMute}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer rounded-full ${
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E6E1D9] bg-white text-[#1D1A17] hover:bg-[#F3EFEA] transition-colors cursor-pointer rounded-full"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#E8B4B8]" />
                <span>Interrupt</span>
              </button>
            )}

            <button
              onClick={stopVoiceSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#8B261E] hover:bg-[#741E17] text-white transition-colors cursor-pointer rounded-full shadow-sm"
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
            onClick={() => handlePrompt('Who is Mahnoor Tabassam?')}
          >
            Who is Mahnoor?
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handlePrompt('Tell me about Mahnoor’s Power BI dashboard at Ericsson.')}
          >
            Power BI at Ericsson
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handlePrompt('Explain her Star Schema data modeling and DAX measures expertise.')}
          >
            Star Schema & DAX
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handlePrompt('How does she integrate Snowflake, SharePoint, and Excel via SQL?')}
          >
            SQL & Snowflake ETL
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handlePrompt('What did she achieve at Reetro and Wise?')}
          >
            QA at Reetro & Wise
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handlePrompt('What is her academic background at Estonian Business School?')}
          >
            Education (EBS)
          </button>
          <button
            className="bg-white border border-[#E6E1D9] hover:border-[#E8B4B8] hover:bg-[#F3EFEA] hover:-translate-y-0.5 px-4 py-2 rounded-full text-xs text-[#1D1A17] transition-all cursor-pointer font-sans shadow-2xs"
            onClick={() => handlePrompt('How can I get in touch or hire Mahnoor?')}
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
                  handlePrompt(q);
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
