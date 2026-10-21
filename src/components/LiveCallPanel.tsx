import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, PhoneCall, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { VoiceSphere } from './VoiceSphere';
import { LiveAudioPlayer, downsampleTo16kHz, float32ToInt16PCM, arrayBufferToBase64 } from '../utils/audioUtils';

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface LiveCallPanelProps {
  onNewMessage: (msg: TranscriptMessage) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'listening' | 'speaking') => void;
}

export const LiveCallPanel: React.FC<LiveCallPanelProps> = ({
  onNewMessage,
  onStatusChange,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isMutedRef = useRef(false);

  isMutedRef.current = isMuted;

  // Determine current high-level status
  const currentStatus: 'idle' | 'connecting' | 'listening' | 'speaking' = isConnecting
    ? 'connecting'
    : isSpeaking
    ? 'speaking'
    : isConnected
    ? 'listening'
    : 'idle';

  useEffect(() => {
    onStatusChange?.(currentStatus);
  }, [currentStatus, onStatusChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectCall();
    };
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

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      micAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Buffer size 4096 gives balance of low latency and stable frame batching
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);
        // Downsample from browser input rate to 16kHz
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
      setMicActive(true);
    } catch (err: unknown) {
      console.error('Microphone capture error:', err);
      setErrorMessage(
        'Could not access microphone. Please grant microphone permission to have a live voice call.'
      );
    }
  };

  const stopMicCapture = () => {
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
    setMicActive(false);
  };

  const connectCall = useCallback(async () => {
    setErrorMessage(null);
    setIsConnecting(true);

    try {
      // 1. Initialize 24kHz audio player for Gemini output
      if (!playerRef.current) {
        playerRef.current = new LiveAudioPlayer((speaking) => {
          setIsSpeaking(speaking);
        });
      }
      playerRef.current.init();

      // 2. Open WebSocket to backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live-api`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let modelTextAccumulator = '';

      ws.onopen = async () => {
        setIsConnecting(false);
        setIsConnected(true);
        // 3. Start mic capture once WebSocket is live
        await startMicCapture(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'audio' && msg.audio) {
            playerRef.current?.playPcmChunk(msg.audio);
          } else if (msg.type === 'model_text' && msg.text) {
            modelTextAccumulator += msg.text;
            setLiveTranscript(modelTextAccumulator);
          } else if (msg.type === 'transcript') {
            if (msg.role === 'model' && msg.text) {
              modelTextAccumulator += msg.text;
              setLiveTranscript(modelTextAccumulator);
            } else if (msg.role === 'user' && msg.text) {
              onNewMessage({
                id: Math.random().toString(36).substring(7),
                role: 'user',
                text: msg.text,
                timestamp: new Date(),
              });
            }
          } else if (msg.type === 'turn_complete') {
            if (modelTextAccumulator.trim()) {
              onNewMessage({
                id: Math.random().toString(36).substring(7),
                role: 'model',
                text: modelTextAccumulator.trim(),
                timestamp: new Date(),
              });
              modelTextAccumulator = '';
              setLiveTranscript('');
            }
          } else if (msg.type === 'interrupted') {
            // Stop current playback immediately
            playerRef.current?.stop();
            setIsSpeaking(false);
            if (modelTextAccumulator.trim()) {
              onNewMessage({
                id: Math.random().toString(36).substring(7),
                role: 'model',
                text: `${modelTextAccumulator.trim()} [interrupted]`,
                timestamp: new Date(),
              });
              modelTextAccumulator = '';
              setLiveTranscript('');
            }
          } else if (msg.type === 'error') {
            setErrorMessage(msg.error || 'Live API error encountered');
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket connection error:', e);
        setErrorMessage('Unable to connect to Gemini Live voice channel.');
        disconnectCall();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        stopMicCapture();
      };
    } catch (err: unknown) {
      console.error('Error establishing call:', err);
      setErrorMessage((err as Error)?.message || 'Failed to initialize voice call');
      disconnectCall();
    }
  }, [onNewMessage]);

  const disconnectCall = useCallback(() => {
    stopMicCapture();
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.close();
      playerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setLiveTranscript('');
  }, []);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleInterrupt = () => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="bg-white border border-[#E7E5E0] shadow-sm rounded-none p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all">
      {/* Editorial top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C2784B] to-transparent opacity-80" />

      {/* Voice Sphere representation */}
      <div className="mb-4 relative">
        <VoiceSphere
          status={currentStatus}
          analyser={playerRef.current?.getAnalyser() || null}
          size={190}
        />
      </div>

      {/* Title & Status */}
      <div className="space-y-1 mb-5">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7C766B] font-medium">
          <span>Gemini 3.8 Live</span>
          <span>·</span>
          <span>Power BI & Data Analytics</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif text-[#171717] font-normal tracking-tight">
          LUNA Voice Assistant
        </h2>
        <p className="text-sm text-[#5E5B54] max-w-md mx-auto leading-relaxed">
          {isConnected ? (
            isSpeaking ? (
              <span className="text-[#C2784B] font-medium">LUNA is speaking...</span>
            ) : isMuted ? (
              <span className="text-[#8C8578]">Microphone is muted</span>
            ) : (
              <span className="text-[#2F6B5F] font-medium">Listening to you. Speak naturally anytime.</span>
            )
          ) : isConnecting ? (
            <span className="text-[#8C8578]">Connecting to Gemini Live API...</span>
          ) : (
            'Real-time, two-way voice dialogue exploring Mahnoor’s Power BI dashboards, DAX modeling, and data analytics.'
          )}
        </p>
      </div>

      {/* Real-time streaming speech preview */}
      {liveTranscript && (
        <div className="w-full max-w-lg mb-5 px-4 py-3 bg-[#FAF9F5] border border-[#E7E5E0] text-left text-sm text-[#2A2926] italic font-serif leading-relaxed">
          <span className="text-xs uppercase tracking-wider not-italic text-[#7C766B] font-sans block mb-1">
            Live Response:
          </span>
          &ldquo;{liveTranscript}&rdquo;
        </div>
      )}

      {/* Error callout */}
      {errorMessage && (
        <div className="w-full max-w-lg mb-5 p-3.5 bg-amber-50/70 border border-amber-200 text-left flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium block mb-0.5">Voice Notice</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-800 hover:text-amber-950 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isConnected ? (
          <button
            onClick={connectCall}
            disabled={isConnecting}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#171717] hover:bg-[#2A2926] text-[#FAF9F5] text-sm font-medium transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-[#C2784B]" />
                <span>Establishing Audio Link...</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4 text-[#E8DCCF]" />
                <span>Start Live Voice Conversation</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-[#D6D2C8] text-[#171717] hover:bg-[#F5F3EE]'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-amber-700" /> : <Mic className="w-4 h-4 text-[#2F6B5F]" />}
              <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
            </button>

            {isSpeaking && (
              <button
                onClick={handleInterrupt}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-[#D6D2C8] bg-white text-[#171717] hover:bg-[#F5F3EE] transition-colors cursor-pointer"
                title="Pause LUNA's current speech"
              >
                <Volume2 className="w-4 h-4 text-[#C2784B]" />
                <span>Interrupt LUNA</span>
              </button>
            )}

            <button
              onClick={disconnectCall}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#8B261E] hover:bg-[#741E17] text-white transition-colors cursor-pointer shadow-sm"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </>
        )}
      </div>

      {/* Subtle guidance */}
      <div className="mt-5 text-xs text-[#8C8578] flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C2784B] inline-block" />
        <span>Ask LUNA about Mahnoor’s Power BI KPI dashboard, star schema modeling, DAX measures, or SQL pipelines.</span>
      </div>
    </div>
  );
};
