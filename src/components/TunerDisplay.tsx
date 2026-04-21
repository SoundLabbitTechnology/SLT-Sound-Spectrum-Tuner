import React, { useEffect, useState } from 'react';
import { PitchData } from '../hooks/useAudioAnalyzer';
import { noteStrings, noteJapaneseStrings } from '../lib/audioPitch';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TunerDisplayProps {
  pitchData: PitchData | null;
}

export function TunerDisplay({ pitchData }: TunerDisplayProps) {
  const [successStatus, setSuccessStatus] = useState(false);

  useEffect(() => {
    if (pitchData && Math.abs(pitchData.cents) <= 5) {
      setSuccessStatus(true);
    } else {
      setSuccessStatus(false);
    }
  }, [pitchData]);

  const getNoteDisplay = () => {
    if (!pitchData) return { en: '-', ja: '-' };
    const noteClass = pitchData.note % 12;
    return {
      en: noteStrings[noteClass],
      ja: noteJapaneseStrings[noteClass],
    };
  };

  const { en, ja } = getNoteDisplay();
  const cents = pitchData ? pitchData.cents : 0;
  
  // Calculate rotation for the needle (-50 cents to +50 cents -> -45deg to +45deg)
  const needleRotation = Math.max(-45, Math.min(45, (cents / 50) * 45));

  return (
    <div className={`relative flex flex-col items-center justify-center p-8 rounded-3xl ${successStatus ? 'bg-green-100 shadow-[0_0_40px_rgba(74,222,128,0.4)]' : 'bg-white shadow-xl'} border-4 border-amber-100 transition-all duration-300 w-full max-w-sm mx-auto overflow-hidden`}>
      
      {/* Background stars for success */}
      <AnimatePresence>
        {successStatus && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <Sparkles className="absolute top-6 left-6 text-yellow-400 w-12 h-12 animate-pulse" />
            <Sparkles className="absolute bottom-6 right-8 text-yellow-400 w-10 h-10 animate-pulse delay-100" />
            <Sparkles className="absolute top-10 right-10 text-yellow-500 w-8 h-8 animate-pulse delay-200" />
            <Sparkles className="absolute bottom-10 left-10 text-yellow-500 w-6 h-6 animate-pulse delay-300" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Display */}
      <div className="z-10 flex flex-col items-center">
        <div className="text-sm font-bold text-amber-700 bg-amber-100 px-4 py-1 rounded-full mb-4">
          いまの音
        </div>
        <div className="flex items-baseline space-x-4">
          <span className="text-8xl font-black text-slate-800 tracking-tighter w-24 text-center">
            {en}
          </span>
          <span className="text-4xl font-bold text-amber-600">
            {ja}
          </span>
        </div>
        <div className="text-slate-400 font-mono mt-2 h-6">
          {pitchData ? `${pitchData.pitch.toFixed(1)} Hz` : '--- Hz'}
        </div>
      </div>

      {/* Meter */}
      <div className="mt-8 w-full px-4 z-10 relative">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
          <span>低い</span>
          <span>おなじ音</span>
          <span>高い</span>
        </div>
        
        {/* Arc background */}
        <div className="relative w-full h-24 overflow-hidden flex justify-center mt-4">
          <div className="w-48 h-48 border-[16px] border-slate-100 rounded-full absolute top-0"></div>
          
          {/* Target marker (0 cents) */}
          <div className="absolute top-0 w-1 h-4 bg-amber-500 z-10"></div>
          
          {/* Needle */}
          <div 
            className="absolute top-24 w-1 h-24 bg-slate-800 rounded-full transition-transform duration-75 ease-out"
            style={{ 
              transformOrigin: 'top center',
              transform: `rotate(${pitchData ? needleRotation : 0}deg) translateY(-100%)` 
            }}
          >
            {/* Needle dot */}
            <div className="absolute -bottom-2 -left-1.5 w-4 h-4 bg-slate-800 rounded-full" style={{ bottom: '-8px'}}></div>
          </div>
        </div>
        
        {/* Difference in numbers */}
        <div className="text-center mt-2 font-mono text-sm text-slate-400 font-bold">
          {pitchData ? `${cents > 0 ? '+' : ''}${Math.round(cents)}` : '-'}
        </div>
      </div>
    </div>
  );
}
