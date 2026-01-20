import React, { useState, useRef } from 'react';

interface HeaderProps {
  onTestTrigger?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onTestTrigger }) => {
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    setTapCount(prev => prev + 1);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    
    tapTimer.current = setTimeout(() => setTapCount(0), 600);

    if (tapCount >= 2) {
      setTapCount(0);
      if (onTestTrigger) {
        onTestTrigger();
      }
    }
  };

  return (
    <header className='glass sticky top-0 z-50 px-4 py-3 safe-area-top'>
      <div className='max-w-2xl mx-auto flex items-center gap-3'>
        <div
          onClick={handleLogoTap}
          className='w-11 h-11 bg-[#E63946] rounded-xl flex items-center justify-center font-bebas text-white text-xl shadow-lg shadow-red-500/20 cursor-pointer select-none'
        >
          DR
        </div>
        <div>
          <h1 className='font-bebas text-white text-xl tracking-wide'>RAPPORT JOURNALIER</h1>
          <p className='text-[10px] text-gray-500 -mt-0.5'>Groupe DR Electrique Inc.</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
