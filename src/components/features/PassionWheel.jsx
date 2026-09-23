import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Film, Music, Briefcase, PenTool, Cpu, Sparkles } from 'lucide-react';
import content from '../../content.json';

const IconMap = {
  activity: Activity,
  film: Film,
  music: Music,
  briefcase: Briefcase,
  "pen-tool": PenTool,
  cpu: Cpu
};

// Colors for different fragments (Infinity Stone inspired)
const fragmentColors = ['#3B82F6', '#EAB308', '#EF4444', '#A855F7', '#22C55E', '#F97316'];

export default function PassionWheel() {
  const { passions } = content;
  const [active, setActive] = useState(0);

  const ActiveIcon = IconMap[passions[active].icon] || Sparkles;
  const activeColor = fragmentColors[active % fragmentColors.length];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      
      {/* Dynamic Aura */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[100px] rounded-full pointer-events-none"
        animate={{ backgroundColor: activeColor }}
        transition={{ duration: 1 }}
        style={{ opacity: 0.15 }}
      />

      {/* Multiverse Core Display */}
      <div className="relative w-full h-[400px] flex items-center justify-center">
        
        {/* Central Core */}
        <motion.div
          key={active}
          initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute z-20 flex flex-col items-center justify-center w-40 h-40 rounded-full"
          style={{
            background: 'rgba(5,2,10,0.8)',
            border: `1px solid ${activeColor}50`,
            boxShadow: `0 0 40px ${activeColor}30, inset 0 0 20px ${activeColor}20`
          }}
        >
          <ActiveIcon size={36} color={activeColor} className="mb-3" />
          <span className="text-white font-syne font-bold tracking-tight uppercase">{passions[active].name}</span>
        </motion.div>

        {/* Orbiting Fragments */}
        {passions.map((passion, i) => {
          const color = fragmentColors[i % fragmentColors.length];
          const Icon = IconMap[passion.icon] || Sparkles;
          const isActive = i === active;
          
          // Randomize orbit properties slightly for a chaotic multiverse feel
          const radius = isActive ? 90 : 130 + (i % 2 === 0 ? 10 : -10);
          const baseAngle = (i * (360 / passions.length));
          
          return (
            <motion.button
              key={passion.name}
              onClick={() => setActive(i)}
              className="absolute z-10 w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md transition-all hover:scale-110"
              style={{
                background: isActive ? `${color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
                boxShadow: isActive ? `0 0 20px ${color}40` : 'none',
                transformOrigin: 'center center',
              }}
              animate={{
                rotate: baseAngle,
                x: Math.cos((baseAngle * Math.PI) / 180) * radius,
                y: Math.sin((baseAngle * Math.PI) / 180) * radius,
                scale: isActive ? 0 : 1, // Hide when active because it moves to center
                opacity: isActive ? 0 : 1
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
              <Icon size={18} color={isActive ? color : "rgba(255,255,255,0.5)"} style={{ transform: `rotate(${-baseAngle}deg)` }} />
            </motion.button>
          );
        })}

        {/* Outer Ring */}
        <motion.div 
          className="absolute z-0 w-[300px] h-[300px] rounded-full border border-white/5 border-dashed"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute z-0 w-[340px] h-[340px] rounded-full border border-white/5"
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      <p className="text-white/40 text-xs font-mono uppercase tracking-widest mt-8 text-center max-w-[200px]">
        Sélectionnez un fragment pour l'examiner
      </p>

    </div>
  );
}
