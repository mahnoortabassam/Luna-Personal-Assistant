import React from 'react';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';

interface PearlOrbProps {
  status: 'idle' | 'connecting' | 'listening' | 'speaking';
  onClick: () => void;
  isMuted?: boolean;
}

export const PearlOrb: React.FC<PearlOrbProps> = ({
  status,
  onClick,
  isMuted = false,
}) => {
  const isCallActive = status !== 'idle';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div
        className={`orb-container ${
          status === 'listening'
            ? 'listening'
            : status === 'speaking'
            ? 'speaking'
            : status === 'connecting'
            ? 'listening'
            : ''
        }`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        title={
          status === 'listening'
            ? 'Listening to you... Click to pause or end'
            : status === 'speaking'
            ? 'Luna is speaking... Click to interrupt'
            : status === 'connecting'
            ? 'Connecting...'
            : 'Click the pearl to start voice conversation'
        }
      >
        {/* Animated Expanding Ripples when call is active */}
        {isCallActive && (
          <>
            <div className="absolute inset-0 rounded-full border border-[#E8B4B8]/60 pointer-events-none animate-ripple-1" />
            <div className="absolute inset-0 rounded-full border border-[#E8B4B8]/50 pointer-events-none animate-ripple-2" />
            <div className="absolute inset-0 rounded-full border border-[#E8B4B8]/40 pointer-events-none animate-ripple-3" />
          </>
        )}

        {/* Outer concentric dashed ring */}
        <div className="orb-ring-outer" />

        {/* Main boundary ring */}
        <div className="orb-ring" />

        {/* Pearl Sphere */}
        <div className="orb flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
          {/* Subtle center state indicator & equalizer */}
          <div className="z-10 flex flex-col items-center justify-center pointer-events-none">
            {status === 'idle' ? (
              <div className="flex flex-col items-center gap-1 opacity-60 transition-opacity">
                <Mic className="w-5 h-5 text-[#2B2623]" />
              </div>
            ) : status === 'connecting' ? (
              <div className="flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#2B2623] animate-spin" />
              </div>
            ) : status === 'speaking' ? (
              <div className="flex items-center gap-1">
                <span
                  className="w-1 bg-[#2B2623]/80 rounded-full"
                  style={{ animation: 'eq-bounce 0.8s infinite ease-in-out' }}
                />
                <span
                  className="w-1 bg-[#2B2623]/80 rounded-full"
                  style={{ animation: 'eq-bounce 0.8s infinite ease-in-out 0.2s' }}
                />
                <span
                  className="w-1 bg-[#2B2623]/80 rounded-full"
                  style={{ animation: 'eq-bounce 0.8s infinite ease-in-out 0.4s' }}
                />
                <span
                  className="w-1 bg-[#2B2623]/80 rounded-full"
                  style={{ animation: 'eq-bounce 0.8s infinite ease-in-out 0.15s' }}
                />
                <span
                  className="w-1 bg-[#2B2623]/80 rounded-full"
                  style={{ animation: 'eq-bounce 0.8s infinite ease-in-out 0.35s' }}
                />
              </div>
            ) : (
              // Listening state
              <div className="flex items-center gap-1">
                <span
                  className="w-1 bg-[#2F6B5F]/80 rounded-full"
                  style={{ animation: 'eq-bounce 1.1s infinite ease-in-out' }}
                />
                <span
                  className="w-1 bg-[#2F6B5F]/80 rounded-full"
                  style={{ animation: 'eq-bounce 1.1s infinite ease-in-out 0.3s' }}
                />
                <span
                  className="w-1 bg-[#2F6B5F]/80 rounded-full"
                  style={{ animation: 'eq-bounce 1.1s infinite ease-in-out 0.6s' }}
                />
              </div>
            )}
          </div>

          {/* Mute badge */}
          {isMuted && status === 'listening' && (
            <div className="absolute bottom-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-full p-1 shadow-sm">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
