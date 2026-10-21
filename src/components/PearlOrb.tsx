import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

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
  const containerClass = `orb-container ${
    status === 'listening' ? 'listening' : status === 'speaking' ? 'speaking' : ''
  }`;

  return (
    <div
      className={containerClass}
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
          ? 'Listening... Click to pause or stop'
          : status === 'speaking'
          ? 'Luna is speaking... Click to interrupt'
          : status === 'connecting'
          ? 'Connecting to Luna...'
          : 'Click the pearl to start voice conversation'
      }
    >
      {/* Outer concentric dashed ring for active listening */}
      <div className="orb-ring-outer" />

      {/* Main animated boundary ring */}
      <div className="orb-ring" />

      {/* Pearl Sphere */}
      <div className="orb flex items-center justify-center relative">
        {/* Subtle center state indicator on hover / active */}
        <div className="opacity-0 hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center rounded-full bg-black/10">
          {status === 'listening' ? (
            <Mic className="w-5 h-5 text-[#2B2623]/70 animate-pulse" />
          ) : status === 'speaking' ? (
            <Volume2 className="w-5 h-5 text-[#2B2623]/70" />
          ) : (
            <Mic className="w-5 h-5 text-[#2B2623]/60" />
          )}
        </div>

        {isMuted && status === 'listening' && (
          <div className="absolute -bottom-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-full p-1 shadow-sm">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};
