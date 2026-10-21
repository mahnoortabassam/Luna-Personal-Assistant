import React from 'react';
import { MAHNOOR_PROFILE } from '../knowledge/mahnoorData';
import { GraduationCap, Database, Code, BarChart3, Users2, Languages } from 'lucide-react';

export const SkillsSection: React.FC = () => {
  const getCategoryIcon = (index: number) => {
    switch (index) {
      case 0:
        return <BarChart3 className="w-4 h-4 text-[#C2784B]" />;
      case 1:
        return <Database className="w-4 h-4 text-[#2F6B5F]" />;
      case 2:
        return <Code className="w-4 h-4 text-[#8B4513]" />;
      case 3:
        return <Database className="w-4 h-4 text-[#7C766B]" />;
      default:
        return <Users2 className="w-4 h-4 text-[#5E5B54]" />;
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-[#E7E5E0] pb-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#7C766B] font-medium block">
            Capabilities
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-[#171717] font-normal tracking-tight mt-0.5">
            Technical & Analytical Domain
          </h2>
        </div>
        <span className="text-xs text-[#8C8578] hidden sm:inline">
          Specialized in BI, Star Schema, SQL, & Automated Testing
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skills grid */}
        {MAHNOOR_PROFILE.skillCategories.map((cat, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#E7E5E0] p-5 hover:border-[#C2784B]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              {getCategoryIcon(idx)}
              <h3 className="font-serif font-semibold text-base text-[#171717]">
                {cat.title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#4A4742]">
              {cat.items.map((item, itemIdx) => (
                <React.Fragment key={itemIdx}>
                  <span className="py-0.5">{item}</span>
                  {itemIdx < cat.items.length - 1 && (
                    <span className="text-[#C5C0B6]">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {/* Education & Language Card */}
        <div className="bg-white border border-[#E7E5E0] p-5 hover:border-[#C2784B]/30 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-[#C2784B]" />
              <h3 className="font-serif font-semibold text-base text-[#171717]">
                Academic Foundation
              </h3>
            </div>
            <div className="space-y-1 text-sm text-[#2A2926]">
              <div className="font-medium text-[#171717]">
                {MAHNOOR_PROFILE.education.degree}
              </div>
              <div className="text-xs text-[#5E5B54]">
                {MAHNOOR_PROFILE.education.institution} · {MAHNOOR_PROFILE.education.location}
              </div>
              <div className="text-xs text-[#8C8578]">
                Cohort: {MAHNOOR_PROFILE.education.period}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0EEEA] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#5E5B54]">
              <Languages className="w-3.5 h-3.5 text-[#2F6B5F]" />
              <span>Language Proficiency:</span>
            </div>
            <span className="font-medium text-[#171717]">
              English (Native)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
