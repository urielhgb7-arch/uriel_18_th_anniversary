import { Sparkles, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptic, HAPTIC } from '../../lib/audio';

export default function ContactExperience() {
  const handleContact = () => {
    haptic(HAPTIC.impact);
    window.location.href = "tel:+33600000000"; // Remplacez par votre numÃ©ro
  };

  return (
    <div className="w-full h-full bg-void flex items-center justify-center relative overflow-hidden px-6">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-void to-void pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-sm glass-nexus p-10 rounded-[3rem] border border-gold/20 shadow-[0_0_50px_-15px_rgba(201,168,106,0.3)] flex flex-col items-center text-center"
      >
         <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6">
           <Sparkles className="text-gold w-8 h-8" />
         </div>
         
         <h2 className="text-3xl text-white tracking-tighter leading-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
           L'Événementiel,<br/>Réinventé.
         </h2>
         
         <p className="text-white/60 text-sm mb-10 leading-relaxed font-sans">
           Vous souhaitez offrir une expérience numérique immersive similaire pour votre propre événement ou organisation ?
         </p>
         
         <button 
           onClick={handleContact}
           className="w-full bg-white text-void font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-transform active:scale-95"
         >
           <Phone size={18} />
           Créer Mon Expérience
         </button>
      </motion.div>
    </div>
  );
}
