import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldAlert, RotateCcw } from 'lucide-react';
import content from '../../content.json';
import { playChime, playError, playClick, haptic, HAPTIC } from '../../lib/audio';

/**
 * Point de contrôle : trois questions sur Uriel.
 *
 * La version précédente comparait la chaîne de l'option à l'index de la réponse,
 * donc aucune réponse ne pouvait être juste. On compare désormais des index, et
 * le champ de données s'appelle `answerIndex` pour que la nature de la valeur
 * soit explicite.
 */

export default function Enigmas({ onFinish }) {
  const { enigmas } = content;
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState(null); // index choisi, ou null
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = enigmas[current];

  const choose = (index) => {
    if (picked !== null) return; // verrouillé pendant la révélation

    setPicked(index);
    const right = index === q.answerIndex;

    if (right) {
      setScore((s) => s + 1);
      playChime();
      haptic(HAPTIC.soft);
    } else {
      playError();
      haptic(HAPTIC.impact);
    }

    setTimeout(() => {
      if (current < enigmas.length - 1) {
        setCurrent((c) => c + 1);
        setPicked(null);
      } else {
        setDone(true);
      }
    }, 1500);
  };

  const restart = () => {
    playClick();
    setCurrent(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const perfect = score === enigmas.length;

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <p className="label-mono mb-3">Contrôle d'accès</p>
        <h2 className="text-ink text-[34px] leading-[1.05]">Déchiffrement</h2>
        <p className="text-muted text-[13px] mt-3">Trois questions. Prouve que tu me connais.</p>
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key={current}
            className="relative rounded-[2.5rem] p-8 overflow-hidden glass-nexus shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]"
            initial={{ opacity: 0, rotateX: 30, rotateY: -20, z: -400, scale: 0.8 }}
            animate={{ opacity: 1, rotateX: 0, rotateY: 0, z: 0, scale: 1 }}
            exit={{ opacity: 0, rotateX: -30, rotateY: 20, z: -400, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 120, damping: 25, mass: 1.2 }}
            style={{ perspective: 1200 }}
          >
            {/* Effet Liquid Glass / Halo interne */}
            <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />

            <motion.div
              className="absolute left-0 right-0 h-px z-10"
              style={{
                background: 'rgba(201,168,106,0.3)',
                boxShadow: '0 0 15px rgba(201,168,106,0.9)',
              }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} style={{ color: 'var(--color-accent)' }} />
                <span className="label-mono tabular-nums">
                  Séquence {current + 1}/{enigmas.length}
                </span>
              </div>
              {/* Pastilles de progression : où j'en suis, sans texte. */}
              <div className="flex gap-1.5">
                {enigmas.map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{ background: i <= current ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)' }}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-ink text-[19px] leading-snug mb-7">{q.question}</h3>

            <div className="space-y-3 relative z-20">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isAnswer = i === q.answerIndex;
                const revealed = picked !== null;

                let tone = 'border-white/10 bg-white/[0.02] text-white/80 hover:bg-white/[0.05] hover:border-white/20';
                let icon = null;

                if (revealed) {
                  if (isAnswer) {
                    tone = 'border-[#4fae74] bg-[#4fae74]/15 text-[#7fc99b] shadow-[0_0_20px_rgba(79,174,116,0.2)]';
                    icon = <Check size={18} className="text-[#7fc99b] shrink-0" />;
                  } else if (isPicked) {
                    tone = 'border-[#d45b52] bg-[#d45b52]/15 text-[#e08b84] shadow-[0_0_20px_rgba(212,91,82,0.2)]';
                    icon = <X size={18} className="text-[#e08b84] shrink-0" />;
                  } else {
                    tone = 'border-ink/5 bg-transparent text-ink/20';
                  }
                }

                // Initial scatter positions
                const scatterX = (i % 2 === 0 ? -1 : 1) * (50 + i * 20);
                const scatterY = 50 + i * 15;

                return (
                  <motion.button
                    key={opt}
                    onClick={() => choose(i)}
                    disabled={revealed}
                    initial={{ opacity: 0, x: scatterX, y: scatterY, rotateZ: (i - 1) * 10 }}
                    animate={{ opacity: 1, x: 0, y: 0, rotateZ: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 150, 
                      damping: 20, 
                      delay: 0.1 + (i * 0.1) 
                    }}
                    className={`w-full text-left p-4 rounded-[1.25rem] border flex items-center justify-between gap-3 transition-all duration-300 text-[15px] ${tone} group`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    whileHover={revealed ? undefined : { scale: 1.02, x: 5 }}
                    whileTap={revealed ? undefined : { scale: 0.98 }}
                  >
                    <span className="leading-snug relative">
                      {opt}
                      {!revealed && (
                        <span className="absolute left-0 -bottom-1 w-0 h-[1px] bg-[var(--color-accent)] transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                      )}
                    </span>
                    {icon}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="rounded-[2.5rem] p-10 text-center flex flex-col items-center glass-nexus shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, rotateX: -20, z: -200 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, z: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 25 }}
            style={{ perspective: 1000 }}
          >
            {/* Cinematic background flare */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-[var(--color-accent)]/10 blur-[50px] pointer-events-none" />

            <div className="relative w-28 h-28 flex items-center justify-center mb-8">
              <motion.span
                className="absolute inset-0 rounded-full border border-t-[var(--color-accent)] border-r-transparent border-b-transparent border-l-[var(--color-accent)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              <motion.span
                className="absolute inset-2 rounded-full border border-dashed border-white/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
              {perfect && (
                 <motion.div
                   className="absolute inset-4 rounded-full bg-[var(--color-accent)]/20 blur-[15px]"
                   animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                 />
              )}
              <span
                className="text-white text-[34px] tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] relative z-10"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {score}/{enigmas.length}
              </span>
            </div>

            <h3 className={`text-[28px] mb-4 ${perfect ? 'text-[var(--color-accent)]' : 'text-white'}`}>
              {perfect ? 'Accès autorisé.' : score > 0 ? 'Accès partiel.' : 'Accès refusé.'}
            </h3>
            
            <p className="text-white/70 text-[15px] leading-relaxed max-w-[280px] font-mono">
              {perfect
                ? '"Tu as prouvé ta valeur. La singularité t\'attend au cœur du système."'
                : 'Divergence détectée dans la timeline. Réinitialisation requise.'}
            </p>

            {!perfect ? (
              <button
                onClick={restart}
                className="label-mono mt-10 flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={14} />
                Recommencer
              </button>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={onFinish}
                className="mt-10 group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold text-[15px] hover:scale-105 transition-all duration-300"
              >
                <span>Transcender</span>
                <motion.div
                  className="w-2 h-2 rounded-full bg-black"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="absolute inset-0 rounded-full border border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
