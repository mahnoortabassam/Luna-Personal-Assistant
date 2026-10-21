import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { TranscriptMessage } from './LiveCallPanel';
import { MAHNOOR_PROFILE } from '../knowledge/mahnoorData';

interface ChatTranscriptProps {
  messages: TranscriptMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isGenerating?: boolean;
}

export const ChatTranscript: React.FC<ChatTranscriptProps> = ({
  messages,
  onSendMessage,
  isGenerating = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    const text = inputText.trim();
    setInputText('');
    await onSendMessage(text);
  };

  const handlePlayVoice = async (id: string, text: string) => {
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    try {
      setPlayingId(id);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Aoede' }),
      });
      const data = await res.json();
      if (data.audio) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => {
          setPlayingId(null);
        };
        audio.onerror = () => {
          setPlayingId(null);
        };
        await audio.play();
      } else {
        setPlayingId(null);
      }
    } catch (err) {
      console.error('Failed to play TTS audio:', err);
      setPlayingId(null);
    }
  };

  return (
    <div className="bg-white border border-[#E7E5E0] shadow-sm flex flex-col h-[520px]">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#E7E5E0] flex items-center justify-between bg-[#FCFBF9]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#C2784B]" />
          <h3 className="text-sm font-serif font-medium text-[#171717] tracking-tight">
            Dialogue Transcript & Inquiries
          </h3>
        </div>
        <span className="text-xs text-[#8C8578]">
          {messages.length} {messages.length === 1 ? 'exchange' : 'exchanges'}
        </span>
      </div>

      {/* Suggested prompts carousel */}
      <div className="px-5 py-2.5 border-b border-[#F0EEEA] bg-[#FAF9F5] overflow-x-auto flex items-center gap-2 text-xs no-scrollbar">
        <span className="text-[#8C8578] whitespace-nowrap text-[11px] uppercase tracking-wider font-medium">
          Suggested:
        </span>
        {MAHNOOR_PROFILE.samplePrompts.slice(0, 4).map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(prompt)}
            disabled={isGenerating}
            className="whitespace-nowrap px-3 py-1 bg-white hover:bg-[#F2EFE9] border border-[#E0DCD3] text-[#2C2A26] rounded-none text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#8C8578] space-y-3 px-6">
            <Sparkles className="w-6 h-6 text-[#C2784B] opacity-60" />
            <p className="font-serif text-base text-[#2C2A26]">
              &ldquo;Hello! I&rsquo;m LUNA. Start a live voice call above or send a message below to explore Mahnoor&rsquo;s data engineering, Power BI, and QA work.&rdquo;
            </p>
            <p className="text-xs text-[#A39E93]">
              You can ask about her internship at Ericsson, test automation at Reetro, or her background at EBS.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#8C8578]">
                {msg.role === 'user' ? (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-[#C2784B]" />
                    <span className="font-serif font-medium text-[#171717]">LUNA</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[85%] p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#171717] text-[#FAF9F5]'
                    : 'bg-[#FAF9F5] border border-[#E7E5E0] text-[#1E1E1E]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.role === 'model' && (
                  <div className="mt-2.5 pt-2 border-t border-[#E7E5E0] flex items-center justify-between text-xs text-[#7C766B]">
                    <button
                      onClick={() => handlePlayVoice(msg.id, msg.text)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#8B4513] hover:text-[#5C2E0B] font-medium transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{playingId === msg.id ? 'Pause Voice' : 'Listen with LUNA’s Voice'}</span>
                    </button>
                    <span className="text-[10px] text-[#A39E93]">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex items-start gap-2 text-xs text-[#8C8578] italic">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C2784B]" />
            <span>LUNA is composing a response...</span>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-[#E7E5E0] bg-[#FCFBF9] flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask LUNA a question about Mahnoor’s skills, experience, or projects..."
          disabled={isGenerating}
          className="flex-1 px-3.5 py-2.5 bg-white border border-[#D6D2C8] text-sm text-[#171717] placeholder-[#A39E93] focus:outline-none focus:border-[#C2784B] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isGenerating}
          className="px-4 py-2.5 bg-[#171717] hover:bg-[#2C2A26] text-[#FAF9F5] text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
