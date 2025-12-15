'use client';

import { useState } from 'react';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionCard from '@/components/AuctionCard';
import { Skeleton } from '@/components/ui/skeleton';

type FilterType = 'all' | 'live' | 'ending' | 'unlocked';

export default function Floor() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: auctions, isLoading, error } = useAuctions();

  const filteredAuctions = (auctions || []).filter(auction => {
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    const hoursLeft = (endTime - now) / (1000 * 60 * 60);
    const isExpired = endTime < now;
    
    // Hide expired/SOLD/VOID auctions from default 'all' view
    // Only show active auctions (LOCKED, UNLOCKED) that haven't expired
    const isActive = !isExpired && auction.status !== 'SOLD' && auction.status !== 'VOID';
    
    switch (filter) {
      case 'live':
        return isActive;
      case 'ending':
        return isActive && hoursLeft > 0 && hoursLeft <= 2;
      case 'unlocked':
        return auction.status === 'UNLOCKED' && isActive;
      default: // 'all' - show all active auctions (including newly uploaded LOCKED ones)
        return isActive;
    }
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Pieces' },
    { key: 'live', label: 'Live Now' },
    { key: 'ending', label: 'Ending Soon' },
    { key: 'unlocked', label: 'Unlocked Only' },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="heading-display text-3xl mb-4">Something went wrong</h1>
          <p className="text-muted-foreground">Unable to load auctions. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12 opacity-0 animate-fade-up">
          <h1 className="heading-display text-4xl md:text-5xl mb-4">
            The Floor
          </h1>
          <p className="heading-editorial text-lg text-muted-foreground max-w-xl">
            Exclusive pieces awaiting their moment. Each item requires collective desire to unlock.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-10 opacity-0 animate-fade-up delay-100">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-5 py-2.5 border transition-all duration-300 ${
                filter === key
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              <span className="ui-label">{label}</span>
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="mb-8 opacity-0 animate-fade-up delay-200">
          <span className="ui-caption">
            {isLoading ? 'Loading...' : `${filteredAuctions.length} piece${filteredAuctions.length !== 1 ? 's' : ''} available`}
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="masonry-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="masonry-item">
                <Skeleton className="aspect-[3/4] rounded-sm" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Masonry Grid */}
        {!isLoading && filteredAuctions.length > 0 && (
          <div className="masonry-grid">
            {filteredAuctions.map((auction, index) => (
              <AuctionCard key={auction.id} auction={auction} index={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredAuctions.length === 0 && (
          <div className="text-center py-20">
            <p className="heading-editorial text-xl text-muted-foreground">
              {auctions?.length === 0 
                ? 'No pieces available yet. Check back soon!'
                : 'No pieces match your current filter'
              }
            </p>
            {auctions && auctions.length > 0 && (
              <button
                onClick={() => setFilter('all')}
                className="mt-4 ui-label text-accent hover:text-accent/80 transition-colors"
              >
                View All Pieces
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

