import React from 'react';
import { MAHNOOR_PROFILE } from '../knowledge/mahnoorData';
import { Briefcase, ArrowUpRight, CheckCircle2, MessageSquare } from 'lucide-react';

interface ExperienceSectionProps {
  onAskAboutExperience: (query: string) => void;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  onAskAboutExperience,
}) => {
  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-[#E7E5E0] pb-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#7C766B] font-medium block">
            Career Chronicle
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-[#171717] font-normal tracking-tight mt-0.5">
            Professional Experience
          </h2>
        </div>
        <span className="text-xs text-[#8C8578] hidden sm:inline">
          Tallinn, Estonia · Data Analytics & Quality Engineering
        </span>
      </div>

      <div className="space-y-6">
        {MAHNOOR_PROFILE.experiences.map((exp, idx) => (
          <article
            key={idx}
            className="bg-white border border-[#E7E5E0] p-6 hover:border-[#C2784B]/40 transition-colors"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#C2784B] shrink-0" />
                <h3 className="text-lg font-serif font-semibold text-[#171717]">
                  {exp.role}
                </h3>
                <span className="text-sm text-[#7C766B]">at {exp.company}</span>
              </div>
              <span className="text-xs text-[#8C8578] font-medium">
                {exp.period}
              </span>
            </div>

            <p className="text-sm text-[#5E5B54] mb-4 leading-relaxed">
              {exp.description}
            </p>

            {/* Achievements */}
            <ul className="space-y-2.5 mb-5 text-sm text-[#2A2926]">
              {exp.achievements.map((ach, aIdx) => (
                <li key={aIdx} className="flex items-start gap-2.5 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B5F] shrink-0 mt-1" />
                  <span>{ach}</span>
                </li>
              ))}
            </ul>

            {/* Tech stack & Ask button */}
            <div className="pt-4 border-t border-[#F0EEEA] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#7C766B] flex-wrap">
                <span className="font-medium text-[#171717]">Tools & Methods:</span>
                {exp.skillsUsed.map((tool, tIdx) => (
                  <React.Fragment key={tIdx}>
                    <span>{tool}</span>
                    {tIdx < exp.skillsUsed.length - 1 && <span className="text-[#C5C0B6]">·</span>}
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={() =>
                  onAskAboutExperience(`Tell me about Mahnoor's work and key accomplishments as ${exp.role} at ${exp.company}.`)
                }
                className="inline-flex items-center gap-1.5 text-xs text-[#8B4513] hover:text-[#5C2E0B] font-medium transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Hear LUNA discuss this</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
