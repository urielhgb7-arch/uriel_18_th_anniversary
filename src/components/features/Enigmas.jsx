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

export default function Enigmas() {
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
            className="relative rounded-3xl p-6 overflow-hidden glass-nexus"
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="absolute left-0 right-0 h-px"
              style={{
                background: 'rgba(201,168,106,0.4)',
                boxShadow: '0 0 9px rgba(201,168,106,0.8)',
              }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
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

            <div className="space-y-2.5">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isAnswer = i === q.answerIndex;
                const revealed = picked !== null;

                /* Juste / faux gardent une vraie couleur : c'est de
                   l'information, pas de la décoration — la retirer rendrait le
                   résultat illisible. Les deux teintes sont reprises des
                   pierres (Temps et Réalité) pour rester dans la palette. */
                let tone = 'border-ink/12 bg-ink/[0.04] text-ink/80';
                let icon = null;

                if (revealed) {
                  if (isAnswer) {
                    tone = 'border-[#4fae74] bg-[#4fae74]/12 text-[#7fc99b]';
                    icon = <Check size={17} className="text-[#7fc99b] shrink-0" />;
                  } else if (isPicked) {
                    tone = 'border-[#d45b52] bg-[#d45b52]/12 text-[#e08b84]';
                    icon = <X size={17} className="text-[#e08b84] shrink-0" />;
                  } else {
                    tone = 'border-ink/8 bg-transparent text-ink/30';
                  }
                }

                return (
                  <motion.button
                    key={opt}
                    onClick={() => choose(i)}
                    disabled={revealed}
                    className={`w-full text-left p-4 rounded-2xl border flex items-center justify-between gap-3 transition-colors text-[14px] ${tone}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    whileTap={revealed ? undefined : { scale: 0.985 }}
                  >
                    <span className="leading-snug">{opt}</span>
                    {icon}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="rounded-3xl p-8 text-center flex flex-col items-center glass-nexus"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          >
            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
              <motion.span
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: 'rgba(201,168,106,0.5)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.span
                className="absolute inset-2 rounded-full border border-dashed border-ink/25"
                animate={{ rotate: -360 }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
              />
              <span
                className="text-ink text-[30px] tabular-nums"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {score}/{enigmas.length}
              </span>
            </div>

            <h3 className="text-ink text-[26px] mb-2.5">
              {perfect ? 'Accès autorisé' : score > 0 ? 'Accès partiel' : 'Accès refusé'}
            </h3>
            <p className="text-muted text-[13px] leading-relaxed max-w-[250px]">
              {perfect
                ? 'Empreinte cognitive validée. Tu me connais vraiment.'
                : 'Divergence détectée dans la timeline. Réessaie.'}
            </p>

            {!perfect && (
              <button
                onClick={restart}
                className="label-mono mt-7 flex items-center gap-2 px-5 py-3 rounded-xl bg-ink/5 active:bg-ink/10 transition-colors"
              >
                <RotateCcw size={13} />
                Recommencer
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
