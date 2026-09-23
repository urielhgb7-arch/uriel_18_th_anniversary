import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, Unlock } from 'lucide-react';

export function UnlockSlider({ onUnlock }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  
  const [containerWidth, setContainerWidth] = useState(300);
  const buttonWidth = 64;
  
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const maxX = containerWidth - buttonWidth - 10;

  const backgroundOpacity = useTransform(x, [0, maxX], [0.1, 0.4]);
  const textOpacity = useTransform(x, [0, maxX / 2], [1, 0]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x >= maxX * 0.8) {
      x.set(maxX);
      setIsUnlocked(true);
      setTimeout(() => {
        onUnlock();
      }, 400);
    } else {
      x.set(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-20 rounded-full border border-[#8B5CF6]/30 overflow-hidden bg-[#05020A]/60 backdrop-blur-md flex items-center p-[5px]"
      style={{ boxShadow: 'inset 0 0 20px rgba(139,92,246,0.1)' }}
    >
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-[#0EA5E9]"
        style={{ opacity: backgroundOpacity }}
      />
      
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <span className="text-[#0EA5E9]/70 font-mono tracking-widest text-xs uppercase animate-pulse">
          Initialiser la connexion
        </span>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="w-16 h-16 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
        style={{
          background: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)',
          boxShadow: '0 0 20px rgba(14,165,233,0.5), inset 0 0 10px rgba(255,255,255,0.5)'
        }}
      >
        {isUnlocked ? <Unlock size={24} className="text-white" /> : <ArrowRight size={24} className="text-white" />}
      </motion.div>
    </div>
  );
}
