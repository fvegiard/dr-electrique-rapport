import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  count?: number; // Optional count badge
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  count, 
  defaultOpen = false, 
  children,
  icon 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="section-container mb-4 overflow-hidden rounded-xl border border-white/5 bg-[#141414]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-[#1A1A1A] p-4 text-left transition-colors active:bg-[#202020]"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-[#e63946]">{icon}</span>}
          <h2 className="font-bebas text-xl tracking-wide text-white">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-[#e63946] px-2 py-0.5 text-xs font-bold text-white">
              {count}
            </span>
          )}
        </div>
        <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0">
         <div className="mt-4">
           {children}
         </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
