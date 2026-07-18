import React from 'react';
import { motion } from 'motion/react';

interface IconProps {
  size?: number;
  className?: string;
  isHovered?: boolean;
}

// 1. Cyber Bot Icon with blinking status visor and pulsing neural signal arches
export const AnimatedBot = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { y: -2 } : { y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      {/* Robot Head Outer */}
      <rect x="3" y="10" width="18" height="11" rx="3" className="fill-zinc-950 stroke-current" />
      
      {/* Ears / Antennas */}
      <path d="M12 10V5M12 5C13.5 5 14 3.5 12 3C10 3.5 10.5 5 12 5Z" className="fill-current stroke-current" />
      <path d="M21 15H22M2 15H1" />

      {/* Visor Area */}
      <motion.rect 
        x="6" 
        y="13" 
        width="12" 
        height="4" 
        rx="1" 
        className="fill-zinc-800"
        animate={isHovered ? { fill: '#10b981' } : { fill: '#27272a' }}
        transition={{ duration: 0.2 }}
      />

      {/* Cybernetic Visor Eye Lights */}
      <motion.circle 
        cx="9" 
        cy="15" 
        r="1" 
        fill="#10b981"
        animate={isHovered ? { scale: [1, 1.4, 1], opacity: 1 } : { opacity: [1, 0.4, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      />
      <motion.circle 
        cx="15" 
        cy="15" 
        r="1" 
        fill="#10b981"
        animate={isHovered ? { scale: [1, 1.4, 1], opacity: 1 } : { opacity: [1, 0.4, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
      />
      
      {/* Tech-mouth grid */}
      <path d="M10 19H14" className="stroke-current opacity-80" />
    </motion.svg>
  );
};

// 2. Cybernetic Key with sliding encryption pin rows and rotation transition
export const AnimatedKey = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { rotate: -15, scale: 1.1 } : { rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      {/* Key Bow (Glow base) */}
      <circle cx="7.5" cy="15.5" r="4.5" className="fill-zinc-950 stroke-current" />
      <circle cx="7.5" cy="15.5" r="1.5" className="fill-zinc-900" />

      {/* Key Blade / Shaft */}
      <path d="M11 12L21 2" />

      {/* Cyber Bitts / Teeth */}
      <motion.path 
        d="M17 6H19M15 8H17" 
        animate={isHovered ? { x: [0, 1, 0] } : {}}
        transition={{ repeat: Infinity, duration: 0.6 }}
      />
      <path d="M19 4L22 7" />
    </motion.svg>
  );
};

// 3. Cyber Shield with defensive grid boundaries and rolling active scan bar
export const AnimatedShield = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
    >
      {/* Shield Outer Shape */}
      <path 
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
        className="fill-zinc-950/80 stroke-current"
      />

      {/* Glowing Inner Grid lines */}
      <path d="M12 2V19" className="opacity-40 stroke-current" />
      <path d="M5 11H19" className="opacity-40 stroke-current" strokeDasharray="2 2" />

      {/* Scanning Laser Bar */}
      <motion.line 
        x1="5" 
        y1="6" 
        x2="19" 
        y2="6" 
        stroke="#10b981" 
        strokeWidth={1.5}
        animate={{ y: [0, 11, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

// 4. Energy Bolt/Zap with separate offset shadow-lines and static-charge particles
export const AnimatedZap = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Shadow layer */}
      <path 
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
        className="stroke-cyan-500/20"
        transform="translate(-1, 1)"
      />
      {/* Main Bolt */}
      <motion.path 
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
        className="fill-zinc-950 stroke-current text-emerald-500"
        animate={isHovered ? { fill: "rgba(16, 185, 129, 0.2)" } : { fill: "rgba(9, 9, 11, 0.7)" }}
      />
      {/* Particle elements */}
      {isHovered && (
        <>
          <motion.circle cx="4" cy="5" r="1" fill="#10b981" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }} transition={{ repeat: Infinity, duration: 0.4 }} />
          <motion.circle cx="20" cy="18" r="1.2" fill="#06b6d4" animate={{ opacity: [1, 0, 1], scale: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} />
        </>
      )}
    </motion.svg>
  );
};

// 5. Database Tower with sequential server-tray slots and active read-write operations
export const AnimatedDatabase = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Base Server Vault Column */}
      <rect x="2" y="2" width="20" height="20" rx="3" className="fill-zinc-950/80 stroke-current text-zinc-800" />

      {/* Hard disks / Platters */}
      {/* Tray 1 */}
      <path d="M2 8H22" className="stroke-zinc-800" />
      <motion.circle 
        cx="6" 
        cy="5" 
        r="1" 
        fill="#10b981" 
        animate={{ opacity: [1, 0.3, 1] }} 
        transition={{ repeat: Infinity, duration: 1 }} 
      />
      <motion.line 
        x1="10" y1="5" x2="18" y2="5" 
        className="stroke-zinc-600" 
        strokeDasharray="4 2"
        animate={isHovered ? { strokeDashoffset: [0, -6] } : {}}
        transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
      />

      {/* Tray 2 */}
      <path d="M2 14H22" className="stroke-zinc-800" />
      <motion.circle 
        cx="6" 
        cy="11" 
        r="1" 
        fill="#06b6d4" 
        animate={{ opacity: [0.3, 1, 0.3] }} 
        transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} 
      />
      <motion.line 
        x1="10" y1="11" x2="16" y2="11" 
        className="stroke-zinc-600" 
        strokeDasharray="3 3"
        animate={isHovered ? { strokeDashoffset: [0, 6] } : {}}
        transition={{ repeat: Infinity, ease: 'linear', duration: 1.5 }}
      />

      {/* Tray 3 */}
      <motion.circle 
        cx="6" 
        cy="17" 
        r="1" 
        fill="#10b981" 
        animate={{ opacity: [1, 0.4, 1] }} 
        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} 
      />
      <motion.line 
        x1="10" y1="17" x2="15" y2="17" 
        className="stroke-zinc-600" 
        strokeDasharray="2 2"
        animate={isHovered ? { strokeDashoffset: [0, -4] } : {}}
        transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
      />
    </motion.svg>
  );
};

// 6. CPU Chip with blinking external connection pins and glowing processor core
export const AnimatedCpu = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { rotate: 90 } : { rotate: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Processor Core Chip */}
      <rect x="5" y="5" width="14" height="14" rx="2" className="fill-zinc-950 stroke-current" />
      
      {/* Outer Connection Pins */}
      <path d="M9 1v4M15 1v4M9 19v4M15 19v4M20 9h3M20 15h3M1 9h3M1 15h3" className="stroke-zinc-600" />

      {/* Inner microprocessor node */}
      <motion.rect 
        x="9" 
        y="9" 
        width="6" 
        height="6" 
        rx="1" 
        className="stroke-emerald-500" 
        animate={{ fill: ['rgba(16, 185, 129, 0.1)', 'rgba(6, 182, 212, 0.25)', 'rgba(16, 185, 129, 0.1)'] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

// 7. Network Node / Globe Icon with orbiting data stream packets
export const AnimatedGlobe = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { rotate: 180 } : { rotate: 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <circle cx="12" cy="12" r="10" className="stroke-zinc-800" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" className="stroke-current" />
    </motion.svg>
  );
};

// 8. Cyber Padlock Icon with clicking locking shackle
export const AnimatedLock = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Lock Shackle */}
      <motion.path 
        d="M7 11V7a5 5 0 0110 0v4" 
        animate={isHovered ? { y: -2.5 } : { y: 0 }}
        transition={{ type: "spring", stiffness: 450, damping: 10 }}
      />
      {/* Lock Body */}
      <rect x="3" y="11" width="18" height="11" rx="2" className="fill-zinc-950 stroke-current" />
      {/* Keyhole */}
      <circle cx="12" cy="16" r="1" className="fill-current" />
      <path d="M12 17v2" />
    </svg>
  );
};

// 9. Directive Launch Arrow (Send) with upward recurring translation effect
export const AnimatedArrowUp = ({ size = 20, className = 'text-zinc-950', isHovered = false }: IconProps) => {
  return (
    <div className="overflow-hidden relative" style={{ width: size, height: size }}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        animate={isHovered ? { 
          y: [-25, 0], 
          opacity: [0, 1] 
        } : { 
          y: 0, 
          opacity: 1 
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </motion.svg>
    </div>
  );
};

// 10. Neural Activity Waveform (Execution Pulse Indicator)
export const AnimatedWaveform = ({ size = 20, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      {/* Base Sine grid */}
      <motion.path 
        d="M2 12h3l2-6 3 12 2-9 2 6h8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        animate={{ strokeDashoffset: [0, -48] }}
        strokeDasharray="12 12"
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      />
    </motion.svg>
  );
};

// 11. Custom System Audit / Console terminal with shifting prompt cursor
export const AnimatedTerminal = ({ size = 20, className = 'text-zinc-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="4 17 10 11 4 5" />
      <motion.line 
        x1="12" 
        y1="19" 
        x2="20" 
        y2="19" 
        animate={{ opacity: [1, 0, 1] }} 
        transition={{ repeat: Infinity, duration: 0.8 }} 
      />
    </motion.svg>
  );
};

// 12. Digital Search / Micro Scan Magnifier with jittering focus scale
export const AnimatedSearch = ({ size = 20, className = 'text-zinc-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { scale: [1, 1.15, 1], x: [0, -1, 1, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </motion.svg>
  );
};

// 13. Message Logs Archive icon with sliding text line traces
export const AnimatedMessage = ({ size = 20, className = 'text-zinc-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" className="fill-zinc-950/50" />
      <motion.line x1="8" y1="9" x2="16" y2="9" animate={isHovered ? { scaleX: [1, 0.4, 1] } : {}} transition={{ duration: 0.6 }} />
      <motion.line x1="8" y1="13" x2="14" y2="13" animate={isHovered ? { scaleX: [1, 0.6, 1] } : {}} transition={{ duration: 0.6, delay: 0.1 }} />
    </motion.svg>
  );
};

// 14. Star Optimization Sparkle with sparkling rotation and scale shimmer
export const AnimatedSparkles = ({ size = 20, className = 'text-zinc-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { rotate: 45, scale: 1.2 } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" className="stroke-current fill-zinc-950/20" />
    </motion.svg>
  );
};

// 15. Premium Sovereign Agent Avatar (Flat Vector Animated Hub Icon) for the profile panel.
export const AnimatedSovereignAvatar = ({ size = 64, className = 'text-emerald-500', isHovered = false }: IconProps) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={isHovered ? { scale: 1.05, rotate: [0, -1, 1, 0] } : {}}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Outer Rotating Cyber Ring / Status Ring */}
      <motion.circle
        cx="32"
        cy="32"
        r="29"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.15"
        strokeDasharray="8 6 12 4"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
      />
      
      {/* Intermittent Orbiting Node Elements */}
      <motion.circle
        cx="32"
        cy="32"
        r="26"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="4 20"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
      />

      {/* Cybernetic Grid Backdrop */}
      <rect x="14" y="14" width="36" height="36" rx="8" className="fill-zinc-950/90 stroke-zinc-800/60" strokeWidth="1" />
      <line x1="32" y1="14" x2="32" y2="50" className="stroke-zinc-800/30 font-mono" strokeDasharray="2 2" />
      <line x1="14" y1="32" x2="50" y2="32" className="stroke-zinc-800/30 font-mono" strokeDasharray="2 2" />

      {/* Robot Antenna Arrays */}
      <path d="M24 16L18 10M40 16L46 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7" />
      <motion.circle
        cx="18"
        cy="10"
        r="2"
        fill="currentColor"
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      />
      <motion.circle
        cx="46"
        cy="10"
        r="2"
        fill="currentColor"
        animate={{ scale: [1.5, 1, 1.5], opacity: [1, 0.7, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
      />

      {/* MAIN ROBOT CHASSIS */}
      <rect x="20" y="20" width="24" height="22" rx="4" className="fill-zinc-900 stroke-current text-zinc-700" strokeWidth="2" />
      
      {/* Dynamic Laser Scan Bar (Sweeper) */}
      <motion.line
        x1="21"
        y1="21"
        x2="43"
        y2="21"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeOpacity="0.8"
        animate={{ y: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />

      {/* ROBOT VISOR / SENSOR ARRAY */}
      <rect x="23" y="26" width="18" height="6" rx="1.5" className="fill-zinc-950 stroke-emerald-500/30" strokeWidth="1" />
      
      {/* Twin Glowing Lenses */}
      <motion.circle
        cx="28"
        cy="29"
        r="2"
        fill="#10b981"
        animate={isHovered ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      />
      <motion.circle
        cx="36"
        cy="29"
        r="2"
        fill="#10b981"
        animate={isHovered ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      />

      {/* Front Plate Micro-Grid / Core Indicator */}
      <line x1="28" y1="36" x2="36" y2="36" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="30" y1="39" x2="34" y2="39" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />

      {/* Cybernetic Neck Connector */}
      <rect x="29" y="42" width="6" height="4" className="fill-zinc-950 stroke-zinc-800" strokeWidth="1.5" />
      
      {/* Core Neural Port Nodes */}
      <circle cx="28" cy="48" r="1.5" className="fill-zinc-800" />
      <circle cx="36" cy="48" r="1.5" className="fill-zinc-800" />
    </motion.svg>
  );
};
