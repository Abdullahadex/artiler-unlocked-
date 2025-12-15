import { Link } from 'react-router-dom';
import { Lock, Unlock } from 'lucide-react';
import type { Auction } from '@/types/database';
import { useCountdown } from '@/hooks/useCountdown';

interface AuctionCardProps {
  auction: Auction;
  index?: number;
}

const AuctionCard = ({ auction, index = 0 }: AuctionCardProps) => {
  const endTime = new Date(auction.end_time);
  const { timeLeft, isExpired } = useCountdown(endTime);
  const isUnlocked = auction.status === 'UNLOCKED' || auction.status === 'SOLD';
  const isEnded = auction.status === 'SOLD' || auction.status === 'VOID' || isExpired;

  // Vary heights for masonry effect
  const heights = ['aspect-[3/4]', 'aspect-[2/3]', 'aspect-[4/5]', 'aspect-[3/5]'];
  const heightClass = heights[index % heights.length];

  const designerName = auction.designer?.display_name || 'Unknown Designer';
  const imageUrl = auction.images?.[0] || '/placeholder.svg';

  return (
    <Link 
      to={`/piece/${auction.id}`}
      className="masonry-item group block opacity-0 animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative overflow-hidden bg-card rounded-sm">
        {/* Image */}
        <div className={`${heightClass} relative overflow-hidden`}>
          <img
            src={imageUrl}
            alt={auction.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-luxury group-hover:scale-105"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

          {/* Status Badge */}
          <div className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-500 ${
            isUnlocked 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-muted/80 text-muted-foreground'
          }`}>
            {isUnlocked ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
          </div>

          {/* Ended Overlay */}
          {isEnded && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <span className="ui-label text-lg">
                {auction.status === 'SOLD' ? 'SOLD' : 'ENDED'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Designer */}
          <span className="ui-label text-muted-foreground">
            {designerName}
          </span>

          {/* Title */}
          <h3 className="font-serif text-lg leading-tight group-hover:text-accent transition-colors duration-300">
            {auction.title}
          </h3>

          {/* Price & Timer Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <span className="ui-label text-muted-foreground block mb-0.5">
                {isUnlocked ? 'Current Bid' : 'Starting'}
              </span>
              <span className="font-serif text-xl">
                €{auction.current_price.toLocaleString()}
              </span>
            </div>

            {!isEnded && (
              <div className="text-right">
                <span className="ui-label text-muted-foreground block mb-0.5">
                  {isUnlocked ? 'Ends In' : 'Unlocks In'}
                </span>
                <span className={`font-sans text-sm tabular-nums ${
                  timeLeft.hours === 0 && timeLeft.minutes < 30 
                    ? 'text-accent' 
                    : 'text-foreground'
                }`}>
                  {timeLeft.hours.toString().padStart(2, '0')}:
                  {timeLeft.minutes.toString().padStart(2, '0')}:
                  {timeLeft.seconds.toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Protocol Progress */}
          {!isEnded && (
            <div className="flex items-center gap-2 pt-2">
              <div className="flex gap-1 flex-1">
                {Array.from({ length: auction.required_bidders }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i < auction.unique_bidder_count ? 'bg-accent' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="ui-label text-muted-foreground text-[10px]">
                {auction.unique_bidder_count}/{auction.required_bidders}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default AuctionCard;
