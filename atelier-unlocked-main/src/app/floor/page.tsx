'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionCard from '@/components/AuctionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Upload, Users } from 'lucide-react';

type FilterType = 'all' | 'live' | 'ending' | 'unlocked' | 'archive';

export default function Floor() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: auctions, isLoading, error } = useAuctions();
  const { user, profile } = useAuth();

  const isDesigner = profile?.role === 'designer';
  
  // Count real active items (only show banner if there are real items, not dummy data)
  const activeItems = (auctions || []).filter(
    a => a.status === 'LOCKED' || a.status === 'UNLOCKED'
  ).length;

  // Count archive items
  const archiveItems = (auctions || []).filter(a => a.status === 'SOLD').length;

  const filteredAuctions = (auctions || []).filter(auction => {
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    
    // Handle invalid dates
    if (isNaN(endTime)) {
      return false;
    }
    
    const hoursLeft = (endTime - now) / (1000 * 60 * 60);
    const isExpired = endTime < now;
    
    // For LOCKED auctions, always show them (they're newly uploaded)
    // For UNLOCKED auctions, only show if not expired
    const isActive = auction.status === 'LOCKED' || (auction.status === 'UNLOCKED' && !isExpired);
    
    switch (filter) {
      case 'archive':
        // Show only SOLD items (archive/reference pieces)
        return auction.status === 'SOLD';
      case 'live':
        return isActive;
      case 'ending':
        return isActive && !isExpired && hoursLeft > 0 && hoursLeft <= 2;
      case 'unlocked':
        return auction.status === 'UNLOCKED' && isActive;
      default: // 'all' - show all active auctions (including newly uploaded LOCKED ones), but exclude SOLD/VOID
        return isActive && auction.status !== 'SOLD' && auction.status !== 'VOID';
    }
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Pieces' },
    { key: 'live', label: 'Live Now' },
    { key: 'ending', label: 'Ending Soon' },
    { key: 'unlocked', label: 'Unlocked Only' },
    { key: 'archive', label: 'Archive' },
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

        {/* Engagement Banner - Show sold pieces and direct to archive */}
        {!isLoading && archiveItems > 0 && filter !== 'archive' && (
          <div className="mb-8 p-6 bg-accent/5 border border-accent/20 rounded-sm opacity-0 animate-fade-up delay-100">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-accent/10 rounded-sm">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg mb-1">Pieces Sold</h3>
                <p className="ui-caption text-muted-foreground mb-3">
                  {archiveItems} exclusive piece{archiveItems !== 1 ? 's' : ''} {archiveItems === 1 ? 'has' : 'have'} been sold. Check the Archive to view these reference pieces and see the value of items on The Floor.
                </p>
                <button
                  onClick={() => setFilter('archive')}
                  className="inline-flex items-center gap-2 ui-label text-accent hover:text-accent/80 transition-colors"
                >
                  View Archive
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Designer CTA Banner - Only show if user is signed in but NOT a designer */}
        {!isLoading && !isDesigner && user && (
          <div className="mb-8 p-6 bg-card border border-border rounded-sm opacity-0 animate-fade-up delay-100">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-accent/10 rounded-sm">
                <Upload className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg mb-1">Become a Designer</h3>
                <p className="ui-caption text-muted-foreground">
                  Have exclusive pieces to share? Go to your Vault to become a designer and submit your work to The Floor. Let collectors unlock your pieces through desire.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Designer Submit CTA */}
        {!isLoading && isDesigner && (
          <div className="mb-8 p-6 bg-card border border-accent/30 rounded-sm opacity-0 animate-fade-up delay-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-accent/10 rounded-sm">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-1">Submit Your Piece</h3>
                  <p className="ui-caption text-muted-foreground">
                    Add your exclusive piece to The Floor. Set your starting price and watch collectors unlock it.
                  </p>
                </div>
              </div>
              <Link
                href="/vault"
                className="px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground transition-colors flex items-center gap-2"
              >
                <span className="ui-label">Go to Vault</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {!isLoading && !user && (
          <div className="mb-8 p-6 bg-card border border-border rounded-sm opacity-0 animate-fade-up delay-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-accent/10 rounded-sm">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-1">Join The Floor</h3>
                  <p className="ui-caption text-muted-foreground">
                    Sign in to place bids and unlock exclusive pieces. Designers can submit their work to The Floor.
                  </p>
                </div>
              </div>
              <Link
                href="/auth"
                className="px-6 py-3 border border-accent bg-accent/5 hover:bg-accent/10 text-accent transition-colors flex items-center gap-2"
              >
                <span className="ui-label">Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

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
            {isLoading ? 'Loading...' : filter === 'archive' 
              ? `${filteredAuctions.length} archive piece${filteredAuctions.length !== 1 ? 's' : ''}`
              : `${filteredAuctions.length} piece${filteredAuctions.length !== 1 ? 's' : ''} available`
            }
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
            {auctions?.length === 0 ? (
              <>
                <p className="heading-editorial text-xl text-muted-foreground mb-6">
                  The Floor is waiting for its first piece.
                </p>
                <div className="max-w-md mx-auto space-y-4">
                  {!user ? (
                    <>
                      <p className="ui-caption text-muted-foreground mb-6">
                        Be the first to add an exclusive piece to The Floor. Sign in to get started.
                      </p>
                      <Link
                        href="/auth"
                        className="inline-flex items-center gap-2 px-6 py-3 border border-accent bg-accent/5 hover:bg-accent/10 text-accent transition-colors"
                      >
                        <span className="ui-label">Sign In to Get Started</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </>
                  ) : !isDesigner ? (
                    <>
                      <p className="ui-caption text-muted-foreground mb-6">
                        Become a designer to submit your first piece to The Floor.
                      </p>
                      <Link
                        href="/vault?role=designer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground transition-colors"
                      >
                        <span className="ui-label">Become a Designer</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="ui-caption text-muted-foreground mb-6">
                        You're ready to submit your first piece. Let collectors discover your work.
                      </p>
                      <Link
                        href="/vault"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="ui-label">Submit Your First Piece</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </>
                  )}
                </div>
              </>
            ) : filter === 'archive' ? (
              <p className="heading-editorial text-xl text-muted-foreground">
                No archive pieces available yet.
              </p>
            ) : (
              <>
                <p className="heading-editorial text-xl text-muted-foreground mb-4">
                  No pieces match your current filter
                </p>
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 ui-label text-accent hover:text-accent/80 transition-colors"
                >
                  View All Pieces
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

