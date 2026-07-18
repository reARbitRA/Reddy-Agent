import React from 'react';
import { motion } from 'motion/react';

interface BrutalistCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'outline';
  className?: string;
  onClick?: () => void;
  title?: string;
  badge?: string;
  id?: string;
}

export const BrutalistCard = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  title,
  badge,
  id
}: BrutalistCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'bg-[#facc15] text-black border-4 border-black shadow-[4px_4px_0px_0px_#000000]';
      case 'outline':
        return 'bg-transparent text-zinc-100 border-4 border-zinc-700 hover:border-[#facc15] shadow-none';
      case 'default':
      default:
        return 'bg-[#18181b] text-[#f4f4f5] border-4 border-black shadow-[4px_4px_0px_0px_#000000]';
    }
  };

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      id={id}
      onClick={onClick}
      whileHover={{ x: -4, y: -4, boxShadow: '8px_8px_0px_0px_#000000' }}
      whileTap={{ x: 0, y: 0, boxShadow: '0px_0px_0px_0px_#000000' }}
      transition={{ type: 'spring', stiffness: 450, damping: 14 }}
      className={`relative rounded-none p-4 ${getVariantStyles()} ${className} text-left flex flex-col`}
    >
      {/* Heavy Industrial Corner Bolt Decals */}
      <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-black rounded-none block opacity-30"></span>
      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black rounded-none block opacity-30"></span>
      <span className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-black rounded-none block opacity-30"></span>
      <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-black rounded-none block opacity-30"></span>

      {/* Optional Card Header Layout */}
      {(title || badge) && (
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
          {title && (
            <h4 className="font-sans font-black uppercase text-sm tracking-tight">
              {title}
            </h4>
          )}
          {badge && (
            <span className="px-2 py-0.5 text-[8px] font-mono uppercase bg-black text-[#facc15] font-black border border-black">
              {badge}
            </span>
          )}
        </div>
      )}

      {children}
    </Component>
  );
};
