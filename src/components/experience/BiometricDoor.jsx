import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Fingerprint } from 'lucide-react';
import { haptic, HAPTIC, startImmersiveMusic, playTick } from '../../lib/audio';

export default function BiometricDoor({ onUnlock }) {
  const containerRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const ring3Ref = useRef(null);
  const fingerprintRef = useRef(null);
  const progressCircleRef = useRef(null);
  
  const [isPressing, setIsPressing] = useState(false);
  const holdTimelineRef = useRef(null);

  useEffect(() => {
    // Setup initial SVG draw states
    // We hardcode the circle length (2 * Math.PI * 66 = ~415) instead of getTotalLength()
    // because getTotalLength() can crash or return 0 if the component is mounted while visibility: hidden
    const circleLength = 415;
    gsap.set(progressCircleRef.current, { strokeDasharray: circleLength, strokeDashoffset: circleLength });

    // GSAP Timeline for Hold Action (2.5 seconds total)
    const tl = gsap.timeline({ paused: true, onComplete: handleComplete });
    holdTimelineRef.current = tl;

    // Rings start rotating
    tl.to(ring1Ref.current, { rotation: 180, duration: 2.5, ease: "power1.inOut" }, 0);
    tl.to(ring2Ref.current, { rotation: -180, duration: 2.5, ease: "power1.inOut" }, 0);
    tl.to(ring3Ref.current, { rotation: 90, duration: 2.5, ease: "power1.inOut" }, 0);
    
    // Draw fingerprint (opacity pulse)
    tl.to(fingerprintRef.current, { opacity: 1, scale: 1.1, duration: 2.5, ease: "power1.inOut" }, 0);
    
    // Draw progress circle
    tl.to(progressCircleRef.current, { strokeDashoffset: 0, duration: 2.5, ease: "power1.inOut" }, 0);

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (isPressing) {
      holdTimelineRef.current.play();
    } else {
      holdTimelineRef.current.reverse();
    }
  }, [isPressing]);

  const handlePointerDown = () => {
    setIsPressing(true);
    haptic(HAPTIC.tap);
  };

  const handlePointerUp = () => {
    setIsPressing(false);
  };

  const handleComplete = () => {
    setIsPressing(false);
    
    // Dramatic GSAP transition: Fall backwards
    const tl = gsap.timeline({
      onComplete: () => {
        haptic(HAPTIC.impact);
        onUnlock();
      }
    });
    
    tl.to([ring1Ref.current, ring2Ref.current, ring3Ref.current, progressCircleRef.current, fingerprintRef.current], {
      scale: 0.1,
      opacity: 0,
      translateZ: -1500,
      duration: 1.2,
      ease: "power4.inOut"
    });
  };

  const text = "URIEL • 18TH • ANNIVERSARY • ";

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
      style={{ perspective: '1000px', backgroundColor: '#06060a' }}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Niveau 3 : Arrière-plan, plus petit, flou, sombre */}
      <div 
        ref={ring3Ref}
        className="absolute flex items-center justify-center opacity-20 blur-[3px]"
        style={{ transform: 'translateZ(-400px) scale(0.5)' }}
      >
        <svg viewBox="0 0 500 500" width="1000" height="1000" fill="none" className="pointer-events-none" style={{ color: '#c9a86a' }}>
          <path id="text-path-3" d="M 250, 250 m -240, 0 a 240,240 0 1,1 480,0 a 240,240 0 1,1 -480,0" />
          <text fontSize="50" fontFamily="serif" letterSpacing="15" className="uppercase font-light" fill="currentColor">
            <textPath href="#text-path-3" startOffset="0%">{text.repeat(3)}</textPath>
          </text>
        </svg>
      </div>

      {/* Niveau 2 : Milieu, grand, un peu net */}
      <div 
        ref={ring2Ref}
        className="absolute flex items-center justify-center opacity-40 blur-[1px]"
        style={{ transform: 'translateZ(-200px) scale(0.8)' }}
      >
        <svg viewBox="0 0 500 500" width="700" height="700" fill="none" className="pointer-events-none" style={{ color: '#c9a86a' }}>
          <path id="text-path-2" d="M 250, 250 m -200, 0 a 200,200 0 1,1 400,0 a 200,200 0 1,1 -400,0" />
          <text fontSize="40" fontFamily="serif" letterSpacing="12" className="uppercase font-light" fill="currentColor">
            <textPath href="#text-path-2" startOffset="0%">{text.repeat(2)}</textPath>
          </text>
        </svg>
      </div>

      {/* Niveau 1 : Premier plan, texte très net */}
      <div 
        ref={ring1Ref}
        className="absolute flex items-center justify-center opacity-80"
        style={{ transform: 'translateZ(-50px) scale(1.1)' }}
      >
        <svg viewBox="0 0 500 500" width="500" height="500" fill="none" className="pointer-events-none" style={{ color: '#f2f2f0' }}>
          <path id="text-path-1" d="M 250, 250 m -160, 0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" />
          <text fontSize="30" fontFamily="serif" letterSpacing="10" className="uppercase" fill="currentColor">
            <textPath href="#text-path-1" startOffset="0%">{text}</textPath>
          </text>
        </svg>
      </div>

      {/* Capteur d'empreinte (Centre Absolu) */}
      <div 
        className="relative z-10 flex items-center justify-center cursor-pointer touch-none"
        style={{ transform: 'translateZ(50px)' }}
        onPointerDown={handlePointerDown}
      >
        <svg width="140" height="140" viewBox="0 0 140 140" className="absolute pointer-events-none">
          <circle 
            ref={progressCircleRef}
            cx="70" cy="70" r="66" 
            fill="none" 
            stroke="#c9a86a" 
            strokeWidth="2" 
            strokeLinecap="round"
            className="origin-center -rotate-90"
            style={{ opacity: 0.8 }}
          />
        </svg>
        
        <div ref={fingerprintRef} className="opacity-40" style={{ color: '#c9a86a' }}>
          <Fingerprint size={64} strokeWidth={1} />
        </div>
      </div>
    </div>
  );
}
