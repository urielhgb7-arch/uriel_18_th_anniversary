import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { VIPPass } from './components/features/VIPPass'
import { MapItinerary } from './components/features/MapItinerary'

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false)

  return (
    <div className="w-full min-h-[100dvh] bg-zinc-950 text-white overflow-hidden relative font-sans">
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="lock-screen"
            exit={{ 
              opacity: 0,
              scale: 1.1,
              filter: "blur(10px)",
              transition: { duration: 0.8, ease: "easeInOut" }
            }}
            className="absolute inset-0 z-50"
          >
            <VIPPass onUnlock={() => setIsUnlocked(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="map-screen"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="absolute inset-0 z-40"
          >
            <MapItinerary />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
