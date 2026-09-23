import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldAlert } from 'lucide-react';
import content from '../content.json';

export default function MiniEnigmas() {
  const { enigmas } = content;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (opt) => {
    if (selected) return; 
    setSelected(opt);
    
    const correct = opt === enigmas[current].answer;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (current < enigmas.length - 1) {
        setCurrent(c => c + 1);
        setSelected(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div 
            key={current}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full p-6 rounded-2xl relative overflow-hidden"
            style={{
              background: 'rgba(5,2,10,0.8)',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 0 40px rgba(139,92,246,0.1) inset'
            }}
          >
            {/* Scan line */}
            <motion.div 
              className="absolute left-0 right-0 h-px bg-[#8B5CF6]/40 shadow-[0_0_8px_#8B5CF6]"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />

            <div className="flex items-center gap-2 mb-6">
              <ShieldAlert size={16} className="text-[#8B5CF6]" />
              <div className="text-[10px] text-[#8B5CF6] font-mono tracking-widest uppercase">
                PROTOCOLE DE SÉCURITÉ - Q{current + 1}/{enigmas.length}
              </div>
            </div>

            <h3 className="text-xl text-white font-medium mb-8 leading-relaxed font-sans">
              {enigmas[current].question}
            </h3>

            <div className="space-y-3">
              {enigmas[current].options.map((opt) => {
                const isSelected = selected === opt;
                let bgClass = "bg-[#8B5CF6]/5 hover:bg-[#8B5CF6]/15";
                let borderClass = "border-[#8B5CF6]/20";
                let icon = null;
                let textColor = "text-white/80";

                if (isSelected) {
                  if (isCorrect) {
                    bgClass = "bg-[#10B981]/20";
                    borderClass = "border-[#10B981]";
                    textColor = "text-[#10B981]";
                    icon = <Check className="text-[#10B981]" size={18} />;
                  } else {
                    bgClass = "bg-[#EF4444]/20";
                    borderClass = "border-[#EF4444]";
                    textColor = "text-[#EF4444]";
                    icon = <X className="text-[#EF4444]" size={18} />;
                  }
                } else if (selected && opt === enigmas[current].answer) {
                  bgClass = "bg-[#10B981]/10";
                  borderClass = "border-[#10B981]/50";
                  textColor = "text-[#10B981]/70";
                  icon = <Check className="text-[#10B981]/50" size={18} />;
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all font-mono text-sm ${bgClass} ${borderClass}`}
                  >
                    <span className={textColor}>{'>'} {opt}</span>
                    {icon}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full p-8 rounded-2xl text-center flex flex-col items-center"
            style={{
              background: 'rgba(5,2,10,0.8)',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative">
              <motion.div className="absolute inset-0 border-2 border-[#8B5CF6] rounded-full" animate={{ rotate: 180 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
              <motion.div className="absolute inset-2 border-2 border-dashed border-[#0EA5E9] rounded-full" animate={{ rotate: -180 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
              <span className="text-3xl font-black text-white font-syne">{score}/{enigmas.length}</span>
            </div>
            
            <h3 className="text-2xl font-black text-white mb-3 font-syne uppercase">
              {score === enigmas.length ? "Accès Autorisé" : score > 0 ? "Accès Partiel" : "Accès Refusé"}
            </h3>
            <p className="text-white/60 text-sm font-mono">
              {score === enigmas.length 
                ? "Empreinte cognitive validée. Bienvenue." 
                : "Alerte : Divergence détectée dans la timeline."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
