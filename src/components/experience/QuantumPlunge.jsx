import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { playDive, playDoorOpen, startImmersiveMusic } from '../../lib/audio';

export default function QuantumPlunge({ onComplete }) {
  const containerRef = useRef(null);
  const leftDoorRef = useRef(null);
  const rightDoorRef = useRef(null);
  
  useEffect(() => {
    // Étape 1 : Le plongeon et l'aspiration sonore
    playDive(2.2);

    const tl = gsap.timeline({
      onComplete: () => {
        // La timeline est finie, on passe au hub
        onComplete();
      }
    });

    // On simule l'écran noir immédiat (les cercles ont été détruits dans la porte, ici on est juste dans le noir)
    tl.to(containerRef.current, {
      backgroundColor: '#000000',
      duration: 0.1
    });

    // Attente dans le silence absolu et le vide noir (1.5 seconde comme demandé)
    tl.to({}, { duration: 1.5 });

    // Ouverture des portes de donjon solennelles
    tl.call(() => {
      playDoorOpen(2.5);
      startImmersiveMusic();
    });
    
    tl.to(leftDoorRef.current, {
      xPercent: -100,
      duration: 2.5,
      ease: "power2.inOut"
    }, "open");
    
    tl.to(rightDoorRef.current, {
      xPercent: 100,
      duration: 2.5,
      ease: "power2.inOut"
    }, "open");

    return () => tl.kill();
  }, [onComplete]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex overflow-hidden">
      {/* Portes virtuelles noires pour l'ouverture */}
      <div 
        ref={leftDoorRef}
        className="w-1/2 h-full bg-[#050505] border-r border-white/5"
        style={{ boxShadow: 'inset -10px 0 30px rgba(0,0,0,0.8)' }}
      />
      <div 
        ref={rightDoorRef}
        className="w-1/2 h-full bg-[#050505] border-l border-white/5"
        style={{ boxShadow: 'inset 10px 0 30px rgba(0,0,0,0.8)' }}
      />
    </div>
  );
}
