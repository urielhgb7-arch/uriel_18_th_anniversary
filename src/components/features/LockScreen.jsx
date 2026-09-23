import { motion } from 'framer-motion';
import { useClock } from '../../lib/hooks';

/**
 * Acte I — Lock screen iOS.
 *
 * Double rôle :
 *  1. Narratif : aucun indice de science-fiction. Le visiteur croit voir son
 *     propre téléphone. C'est ce qui rend la bascule de l'acte II violente.
 *  2. Technique : un AudioContext ne démarre qu'après un geste utilisateur. Le
 *     déverrouillage EST ce geste — la sonnerie peut donc partir juste après,
 *     sans bouton "activer le son" qui trahirait le dispositif.
 *
 * Volontairement pas de fausse barre d'état : sur iPhone la vraie est déjà
 * affichée au-dessus de la page. En dessiner une seconde créerait un doublon
 * visible. Le fond passe derrière elle via les safe-area insets.
 */

/** Fond dégradé : imite un fond d'écran iOS sombre, sans charger d'image. */
function Wallpaper() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(170deg, #1c2430 0%, #131820 38%, #0b0e13 70%, #05070a 100%)',
        }}
      />
      {/* Halos diffus : la profondeur d'un vrai wallpaper abstrait. */}
      <div
        className="absolute -top-[15%] -left-[20%] w-[80%] h-[55%] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(96,125,160,0.26),transparent 68%)', filter: 'blur(50px)' }}
      />
      <div
        className="absolute bottom-[8%] -right-[18%] w-[75%] h-[45%] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(142,120,104,0.2),transparent 68%)', filter: 'blur(60px)' }}
      />
      {/* Grain léger : casse le banding des dégradés sur écran OLED. */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

const LockIcon = () => (
  <svg width="15" height="19" viewBox="0 0 15 19" fill="none" aria-hidden="true">
    <rect x="1" y="7.6" width="13" height="10.4" rx="3.1" fill="rgba(255,255,255,0.92)" />
    <path
      d="M4 7.6V5.2a3.5 3.5 0 0 1 7 0v2.4"
      stroke="rgba(255,255,255,0.92)"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const FlashIcon = () => (
  <svg width="17" height="24" viewBox="0 0 17 24" fill="none" aria-hidden="true">
    <path d="M9.6 1 3 13.2h4.3L6.4 23 14 10.4H9.3L9.6 1Z" fill="rgba(255,255,255,0.95)" />
  </svg>
);

const CameraIcon = () => (
  <svg width="24" height="20" viewBox="0 0 24 20" fill="none" aria-hidden="true">
    <path
      d="M2.4 6.2h3.1l1.4-2.4h8.2l1.4 2.4h3.1a1.6 1.6 0 0 1 1.6 1.6v8.4a1.6 1.6 0 0 1-1.6 1.6H2.4A1.6 1.6 0 0 1 .8 16.2V7.8a1.6 1.6 0 0 1 1.6-1.6Z"
      fill="rgba(255,255,255,0.95)"
    />
    <circle cx="11.6" cy="12" r="3.6" fill="#0b0e13" />
  </svg>
);

/** Pastille ronde translucide du bas de l'écran verrouillé. */
function QuickAction({ children, label }) {
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center glass-ios"
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export default function LockScreen({ onUnlock }) {
  const now = useClock();

  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleDragEnd = (_, info) => {
    // Seuil bas : le geste doit réussir du premier coup, c'est la porte d'entrée.
    if (info.offset.y < -60 || info.velocity.y < -420) onUnlock();
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-hidden"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <Wallpaper />

      {/* Le drag couvre tout l'écran : n'importe quel swipe vers le haut ouvre. */}
      <motion.div
        className="relative z-10 w-full h-full flex flex-col items-center cursor-grab active:cursor-grabbing"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.55, bottom: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onTap={onUnlock}
        role="button"
        tabIndex={0}
        aria-label="Déverrouiller"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onUnlock();
          }
        }}
      >
        <div className="pt-safe" />

        <motion.div
          className="flex flex-col items-center mt-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="opacity-90 mb-5">
            <LockIcon />
          </div>

          <p
            className="text-white/95 text-[20px] font-medium tracking-[0.01em]"
            style={{ fontFamily: 'var(--font-ios)' }}
          >
            {date.charAt(0).toUpperCase() + date.slice(1)}
          </p>

          {/* Poids 200 + tabular-nums : le rendu exact de l'heure iOS. */}
          <p
            className="text-white leading-[0.92] mt-1"
            style={{
              fontFamily: 'var(--font-ios)',
              fontSize: 'clamp(76px, 23vw, 112px)',
              fontWeight: 200,
              letterSpacing: '-0.035em',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 2px 30px rgba(0,0,0,0.35)',
            }}
          >
            {time}
          </p>
        </motion.div>

        <div className="flex-1" />

        <motion.div
          className="flex flex-col items-center gap-7 w-full pb-safe mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="flex items-center justify-between w-full max-w-[280px] px-1">
            <QuickAction label="Lampe torche">
              <FlashIcon />
            </QuickAction>
            <QuickAction label="Appareil photo">
              <CameraIcon />
            </QuickAction>
          </div>

          {/* iOS n'affiche pas cette consigne. Ici elle est indispensable : le
              visiteur doit comprendre qu'il y a quelque chose à faire. */}
          <motion.p
            className="text-white/55 text-[13px] tracking-wide"
            style={{ fontFamily: 'var(--font-ios)' }}
            animate={{ opacity: [0.35, 0.85, 0.35], y: [0, -5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            Glissez vers le haut pour déverrouiller
          </motion.p>

          <div className="w-[135px] h-[5px] rounded-full bg-white/85 mb-1" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

