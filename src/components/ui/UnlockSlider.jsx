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
      className="relative w-full h-20 rounded-full border border-white/10 overflow-hidden bg-black/40 backdrop-blur-md flex items-center p-[5px]"
    >
      <motion.div 
        className="absolute inset-0 bg-emerald-green"
        style={{ opacity: backgroundOpacity }}
      />
      
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <span className="text-white/50 font-medium tracking-widest text-sm uppercase">Slide to reveal</span>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="w-16 h-16 rounded-full bg-neon-yellow flex items-center justify-center cursor-grab active:cursor-grabbing z-10 shadow-[0_0_20px_rgba(204,255,0,0.4)]"
      >
        {isUnlocked ? <Unlock size={24} className="text-black" /> : <ArrowRight size={24} className="text-black" />}
      </motion.div>
    </div>
  );
}
