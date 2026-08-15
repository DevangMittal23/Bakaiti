'use client'

import { motion } from 'framer-motion'
import { PulseType, PULSE_CONFIG } from '@/types'
import { useEditProfile } from './edit-profile-context'

export function PulseSelectorInline() {
  const { selectedPulse, setSelectedPulse } = useEditProfile()

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Your Pulse
      </label>
      <p className="text-xs text-text-muted mt-1 mb-3">
        Let your Circle know your energy right now. Expires in 4 hours.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(PULSE_CONFIG) as PulseType[]).map((type) => {
          const config = PULSE_CONFIG[type]
          const isSelected = selectedPulse === type
          return (
            <motion.button
              key={type}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPulse(isSelected ? null : type)}
              className={`flex flex-col items-center gap-2 py-3 rounded-xl border transition-all cursor-pointer
                ${isSelected 
                  ? 'border-accent/40 bg-accent/10' 
                  : 'border-border/30 bg-surface/50 hover:bg-surface-hover hover:border-border'
                }`}
            >
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: config.color,
                  boxShadow: isSelected ? `0 0 10px ${config.glowColor}` : 'none'
                }}
                animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: isSelected ? Infinity : 0 }}
              />
              <span className={`text-[10px] sm:text-xs font-medium ${isSelected ? 'text-text-primary' : 'text-text-muted'}`}>
                {config.label} {config.emoji}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
