import React from 'react';
import { X, Download, FileText, ExternalLink, Mail, Phone, MapPin } from 'lucide-react';
import { MAHNOOR_PROFILE } from '../knowledge/mahnoorData';

interface ResumeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#E7E5E0] w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7E5E0] bg-[#FAF9F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-[#E7E5E0]">
              <FileText className="w-5 h-5 text-[#C2784B]" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-[#171717]">
                Mahnoor Tabassam — Official Resume
              </h3>
              <p className="text-xs text-[#7C766B]">
                Data Analyst · Tallinn, Estonia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={MAHNOOR_PROFILE.resumePdfUrl}
              download="Mahnoor_Tabassam_Resume.pdf"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] hover:bg-[#2C2A26] text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>
            <a
              href={MAHNOOR_PROFILE.resumePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-[#E7E5E0] hover:bg-[#F2EFE9] text-[#2C2A26] transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 border border-[#E7E5E0] hover:bg-[#F2EFE9] text-[#2C2A26] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="px-6 py-2.5 bg-[#F5F3EE] border-b border-[#E7E5E0] flex flex-wrap items-center justify-between gap-4 text-xs text-[#5E5B54]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#C2784B]" />
              <a href={`mailto:${MAHNOOR_PROFILE.email}`} className="hover:underline text-[#171717]">
                {MAHNOOR_PROFILE.email}
              </a>
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#2F6B5F]" />
              <span>{MAHNOOR_PROFILE.phone}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#7C766B]" />
              <span>{MAHNOOR_PROFILE.location}</span>
            </span>
          </div>
          <span className="text-[11px] text-[#8C8578]">
            Estonian Business School (2024–2027)
          </span>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 bg-[#2C2A26] p-2 relative">
          <iframe
            src={`${MAHNOOR_PROFILE.resumePdfUrl}#toolbar=1`}
            title="Mahnoor Tabassam Resume"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
