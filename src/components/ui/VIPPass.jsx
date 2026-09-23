import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { UnlockSlider } from '../ui/UnlockSlider';

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
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 relative perspective-[1000px] bg-[#05020A] overflow-hidden">
      
      {/* Background Auras (Multiverse Vibe) */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-40">
        <div className="absolute w-[400px] h-[400px] bg-[#8B5CF6] rounded-full blur-[120px] mix-blend-screen opacity-30 transform -translate-y-1/4 -translate-x-1/4"></div>
        <div className="absolute w-[300px] h-[300px] bg-[#0EA5E9] rounded-full blur-[120px] mix-blend-screen opacity-20 transform translate-y-1/4 translate-x-1/4"></div>
      </div>

      <div 
        ref={cardRef} 
        className="w-full max-w-sm transform-style-3d relative z-10"
      >
        <div 
          className="flex flex-col items-center text-center gap-8 py-12 px-6 rounded-3xl relative overflow-hidden"
          style={{
            background: 'rgba(10,5,20,0.6)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(139,92,246,0.3)',
            boxShadow: '0 0 60px rgba(139,92,246,0.1), inset 0 0 20px rgba(139,92,246,0.05)'
          }}
        >
          {/* Scanline effect */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0EA5E9] to-transparent opacity-50" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-50" />

          <div className="space-y-3 z-10">
            <h2 className="text-[10px] uppercase tracking-[0.4em] text-[#0EA5E9] font-mono font-bold">
              Niveau d'Accès Requis
            </h2>
            <h1 className="text-4xl font-black tracking-tighter text-white font-syne uppercase" style={{ textShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
              Multivers 18
            </h1>
          </div>
          
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
          
          <p className="text-white/60 text-sm font-sans leading-relaxed z-10">
            Une faille temporelle a été détectée. <br/>Veuillez initialiser la synchronisation pour rétablir la réalité.
          </p>

          <div className="w-full mt-4 z-10">
            <UnlockSlider onUnlock={onUnlock} />
          </div>
        </div>
      </div>
      
    </div>
  );
}
