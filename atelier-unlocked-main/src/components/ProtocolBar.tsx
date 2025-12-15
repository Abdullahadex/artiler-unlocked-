import { Lock, Unlock } from 'lucide-react';
import type { AuctionStatus } from '@/types/database';

interface ProtocolBarProps {
  currentBidders: number;
  requiredBidders: number;
  status: AuctionStatus;
  size?: 'sm' | 'md' | 'lg';
}

const ProtocolBar = ({ 
  currentBidders, 
  requiredBidders, 
  status,
  size = 'md' 
}: ProtocolBarProps) => {
  const isUnlocked = status === 'UNLOCKED' || status === 'SOLD';
  const segments = Array.from({ length: requiredBidders }, (_, i) => i < currentBidders);
  
  const sizeClasses = {
    sm: 'h-0.5 gap-1',
    md: 'h-1 gap-1.5',
    lg: 'h-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status Icon */}
      <div className={`${isUnlocked ? 'text-accent' : 'text-muted-foreground'} transition-colors duration-500`}>
        {isUnlocked ? (
          <Unlock className={`${iconSizes[size]} ${isUnlocked ? 'animate-pulse-gold' : ''}`} />
        ) : (
          <Lock className={iconSizes[size]} />
        )}
      </div>

      {/* Progress Segments */}
      <div className={`flex flex-1 ${sizeClasses[size]}`}>
        {segments.map((filled, index) => (
          <div
            key={index}
            className={`flex-1 rounded-full transition-all duration-500 ${
              filled 
                ? 'bg-accent' 
                : 'bg-muted'
            }`}
            style={{
              transitionDelay: `${index * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Counter */}
      <span className="ui-label text-muted-foreground min-w-[3rem] text-right">
        {currentBidders}/{requiredBidders}
      </span>
    </div>
  );
};

export default ProtocolBar;
