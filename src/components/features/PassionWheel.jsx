import { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Activity, Film, Music, Briefcase, PenTool, Cpu } from 'lucide-react';
import content from '../content.json';

const IconMap = {
  activity: Activity,
  film: Film,
  music: Music,
  briefcase: Briefcase,
  "pen-tool": PenTool,
  cpu: Cpu
};

export default function PassionWheel() {
  const { passions } = content;
  const [active, setActive] = useState(0);
  const controls = useAnimation();

  // Angle step
  const angleStep = 360 / passions.length;

  const handleNext = () => {
    setActive((prev) => (prev + 1) % passions.length);
  };

  const ActiveIcon = IconMap[passions[active].icon] || Activity;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Ambient Glow matching active item */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full pointer-events-none" />

      <h2 className="text-3xl font-space font-bold text-white mb-2 relative z-10">
        Mes Passions
      </h2>
      <p className="text-white/50 text-sm mb-12 text-center max-w-xs relative z-10">
        Découvrez ce qui m'anime au quotidien.
      </p>

      {/* Wheel Container */}
      <div className="relative w-72 h-72 flex items-center justify-center z-10">
        
        {/* Central Display */}
        <div className="absolute inset-0 m-auto w-32 h-32 rounded-full glass-panel border border-white/20 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(167,139,250,0.3)] z-20">
          <motion.div
            key={active}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center"
          >
            <ActiveIcon size={32} className="text-emerald-400 mb-2" />
            <span className="text-white font-space font-medium text-sm">{passions[active].name}</span>
          </motion.div>
        </div>

        {/* Orbiting Items */}
        <motion.div 
          className="absolute w-full h-full"
          animate={{ rotate: -(active * angleStep) }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        >
          {passions.map((passion, i) => {
            const angle = i * angleStep;
            // Radius of orbit = 120px
            const rad = (angle * Math.PI) / 180;
            const x = Math.sin(rad) * 110;
            const y = -Math.cos(rad) * 110;
            const Icon = IconMap[passion.icon] || Activity;
            const isActive = i === active;

            return (
              <motion.button
                key={passion.name}
                onClick={() => setActive(i)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md transition-colors hover:bg-white/10"
                style={{ x, y }}
                animate={{ 
                  scale: isActive ? 1.2 : 1,
                  borderColor: isActive ? "rgba(52, 211, 153, 0.5)" : "rgba(255,255,255,0.1)",
                  rotate: (active * angleStep) // Counter-rotate so icons stay upright
                }}
              >
                <Icon size={18} className={isActive ? "text-emerald-400" : "text-white/40"} />
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <button 
        onClick={handleNext}
        className="mt-12 px-6 py-2 rounded-full border border-white/20 text-white/70 text-sm hover:bg-white/5 transition-colors relative z-10"
      >
        Explorer
      </button>

    </div>
  );
}
