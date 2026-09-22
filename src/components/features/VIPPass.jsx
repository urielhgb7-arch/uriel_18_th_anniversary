import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { UnlockSlider } from '../ui/UnlockSlider';
import { GlassCard } from '../ui/GlassCard';

export function VIPPass({ onUnlock }) {
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.to(cardRef.current, {
      y: -15,
      rotationX: 2,
      rotationY: -2,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 relative perspective-[1000px]">
      <div 
        ref={cardRef} 
        className="w-full max-w-sm transform-style-3d relative z-10"
      >
        <GlassCard className="flex flex-col items-center text-center gap-8 py-12 diffused-glow">
          <div className="space-y-2">
            <h2 className="text-sm uppercase tracking-[0.3em] text-emerald-green font-semibold">
              VIP Access
            </h2>
            <h1 className="text-4xl font-bold tracking-tighter text-white">
              Uriel's 18th
            </h1>
          </div>
          
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <p className="text-zinc-400 text-sm">
            You are officially invited to the most exclusive event of the year.
          </p>

          <div className="w-full mt-4">
            <UnlockSlider onUnlock={onUnlock} />
          </div>
        </GlassCard>
      </div>
      
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-30">
        <div className="w-[400px] h-[400px] bg-emerald-green rounded-full blur-[120px] mix-blend-screen opacity-20 transform -translate-y-1/4 -translate-x-1/4"></div>
        <div className="w-[300px] h-[300px] bg-neon-yellow rounded-full blur-[120px] mix-blend-screen opacity-10 transform translate-y-1/4 translate-x-1/4"></div>
      </div>
    </div>
  );
}
