import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import content from '../content.json';

export default function MiniEnigmas() {
  const { enigmas } = content;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (opt) => {
    if (selected) return; // Prevent multiple clicks
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
    <div className="w-full max-w-md mx-auto h-full flex flex-col items-center justify-center p-6 relative">
      <h2 className="text-3xl font-space font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 mb-2">
        Test VIP
      </h2>
      <p className="text-white/50 text-sm mb-12">Connaissez-vous vraiment Uriel ?</p>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div 
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full glass-panel p-6 rounded-2xl border border-white/10"
          >
            <div className="text-xs text-emerald-400 font-space tracking-widest mb-4">
              QUESTION {current + 1} / {enigmas.length}
            </div>
            <h3 className="text-xl text-white font-medium mb-8 leading-snug">
              {enigmas[current].question}
            </h3>

            <div className="space-y-3">
              {enigmas[current].options.map((opt) => {
                const isSelected = selected === opt;
                let bgClass = "bg-white/5 hover:bg-white/10";
                let borderClass = "border-white/10";
                let icon = null;

                if (isSelected) {
                  if (isCorrect) {
                    bgClass = "bg-emerald-500/20";
                    borderClass = "border-emerald-500";
                    icon = <Check className="text-emerald-400" size={20} />;
                  } else {
                    bgClass = "bg-red-500/20";
                    borderClass = "border-red-500";
                    icon = <X className="text-red-400" size={20} />;
                  }
                } else if (selected && opt === enigmas[current].answer) {
                  // Show the correct answer if they got it wrong
                  bgClass = "bg-emerald-500/10";
                  borderClass = "border-emerald-500/50";
                  icon = <Check className="text-emerald-400/50" size={20} />;
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${bgClass} ${borderClass}`}
                  >
                    <span className="text-white text-sm">{opt}</span>
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
            className="w-full glass-panel p-8 rounded-2xl border border-white/10 text-center flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-purple-500 flex items-center justify-center mb-6">
              <span className="text-3xl font-bold text-white">{score}/{enigmas.length}</span>
            </div>
            <h3 className="text-2xl font-space font-bold text-white mb-2">
              {score === enigmas.length ? "Parfait !" : score > 0 ? "Pas mal du tout !" : "Aïe..."}
            </h3>
            <p className="text-white/70 text-sm">
              {score === enigmas.length 
                ? "Vous méritez amplement votre place VIP." 
                : "Vous avez encore des choses à découvrir ce soir..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
