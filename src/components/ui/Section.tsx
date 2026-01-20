import React, { ReactNode } from 'react';

interface SectionProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  color?: string;
  children: ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, subtitle, color, children }) => {
  return (
    <div className='rounded-2xl overflow-hidden bg-[#141414] border border-white/5 animate-slide-up'>
      <div
        className='section-header px-4 py-3 flex items-center gap-3'
        style={{ background: `linear-gradient(135deg, ${color || '#666'} 0%, color-mix(in srgb, ${color || '#666'} 70%, black) 100%)` }}
      >
        <span className='text-white/90'>{icon}</span>
        <div>
          <h3 className='font-bebas text-white tracking-wide text-sm'>{title}</h3>
          {subtitle && <p className='text-[10px] text-white/60 -mt-0.5'>{subtitle}</p>}
        </div>
      </div>
      <div className='p-4'>{children}</div>
    </div>
  );
};

export default Section;
