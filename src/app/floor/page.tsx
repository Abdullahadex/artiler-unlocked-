'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuctions, useCheckExpiredAuctions } from '@/hooks/useAuctions';
import AuctionCard from '@/components/AuctionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Upload } from 'lucide-react';
import OnboardingGuide from '@/components/OnboardingGuide';

type FilterType = 'all' | 'live' | 'ending' | 'unlocked';

export default function Floor() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 flex items-center justify-center opacity-40 uppercase text-xs tracking-widest font-mono">Loading The Floor...</div>}>
      <FloorContent />
    </Suspense>
  );
}

function FloorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialFilter = searchParams.get('filter') as FilterType;
  
  const [filter, setFilter] = useState<FilterType>(initialFilter || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'bids'>('newest');
  
  const { data: auctions, isLoading, error } = useAuctions();
  const { user, profile, isWaitlisted, loading: authLoading } = useAuth();
  const checkExpired = useCheckExpiredAuctions();

  const isDesigner = profile?.role === 'designer';

  useEffect(() => {
    checkExpired.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state with URL parameter if it changes
  useEffect(() => {
    if (initialFilter && initialFilter !== filter) {
      setFilter(initialFilter);
    }
  }, [initialFilter, filter]);

  // ACCESS GATE: Redirect unauthorized users
  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve

    if (!user) {
      router.push('/auth');
      return;
    }

    if (isWaitlisted) {
      router.push('/waitlist');
      return;
    }
  }, [user, isWaitlisted, authLoading, router]);

  // Show loading while auth is resolving
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <p className="ui-label text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Verifying access...</p>
      </div>
    );
  }

  // Block render for unauthorized users (redirect is in-flight)
  if (!user || isWaitlisted) {
    return null;
  }


  const filteredAuctions = (auctions || [])
    .filter((auction) => {
      const matchesSearch = 
        auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auction.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const now = new Date();
      const endTime = new Date(auction.end_time);
      const isExpired = endTime < now;

      if (auction.status === 'SOLD' || auction.status === 'VOID' || auction.status === 'PROPOSED' || isExpired) {
        return false;
      }

      if (filter === 'all') return matchesSearch;
      if (filter === 'live') return matchesSearch && auction.status === 'LOCKED';
      if (filter === 'ending') {
        const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return matchesSearch && auction.status === 'LOCKED' && endTime < soon;
      }
      if (filter === 'unlocked') return matchesSearch && auction.status === 'UNLOCKED';
      
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'price-low') {
        return a.current_price - b.current_price;
      }
      if (sortBy === 'price-high') {
        return b.current_price - a.current_price;
      }
      if (sortBy === 'bids') {
        return (b.unique_bidder_count || 0) - (a.unique_bidder_count || 0);
      }
      return 0;
    });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Pieces' },
    { key: 'live', label: 'Live' },
    { key: 'unlocked', label: 'Unlocked' },
    { key: 'ending', label: 'Ending Soon' },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <OnboardingGuide />
      <div className="container mx-auto px-6">


        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-accent mb-2">
              <span className="w-12 h-[1px] bg-accent/30" />
              <span className="ui-label text-xs tracking-[0.3em] uppercase">Status</span>
            </div>
            <h1 className="heading-display text-4xl md:text-6xl tracking-tighter">The Floor</h1>
            <p className="ui-caption text-muted-foreground max-w-md">
              A curated landscape of verified pieces, unlocked by community interest. Every piece is an entry in the Atelier record.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto overflow-hidden">
            <div className="flex bg-muted/50 p-1 border border-border rounded-sm overflow-x-auto no-scrollbar">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`relative px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-500 rounded-sm overflow-hidden ${
                    filter === f.key
                      ? 'text-foreground bg-background shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Sort HUD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="relative group lg:col-span-2">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title, material, or design details..."
              className="w-full bg-transparent border-b border-border py-3 pl-1 text-sm focus:outline-none focus:border-accent transition-colors duration-300 placeholder:text-muted-foreground/50 hover:border-border/80"
            />
          </div>
          <div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'price-low' | 'price-high' | 'bids')}
              className="w-full bg-transparent border-b border-border py-3 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value="newest">Newest</option>
              <option value="bids">High Engagement</option>
              <option value="price-low">Value: Low to High</option>
              <option value="price-high">Value: High to Low</option>
            </select>
          </div>
          <div className="flex justify-end items-end gap-4 h-full">
            {isDesigner && (
              <Link
                href="/vault"
                className="w-full lg:w-auto h-11 px-6 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 group transition-all"
              >
                <Upload className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                Submit Piece
              </Link>
            )}
          </div>
        </div>

        {/* Results Metadata */}
        <div className="flex items-center gap-4 mb-8">
          <p className="ui-label text-[10px] text-muted-foreground uppercase tracking-widest">
            {isLoading ? 'Loading...' : `${filteredAuctions.length} piece${filteredAuctions.length !== 1 ? 's' : ''} on the floor`}
          </p>
          <div className="flex-1 h-[1px] bg-border/40" />
        </div>

        {error ? (
          <div className="py-20 text-center">
            <p className="ui-label text-destructive">Failed to load market data. Please refresh.</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-border rounded-sm bg-muted/20">
            <p className="heading-editorial text-xl text-muted-foreground mb-2">No matches found</p>
            <p className="ui-caption text-sm text-muted-foreground">
              Try adjusting your filters or search terms.
            </p>

            {filter !== 'all' && (
              <button 
                onClick={() => setFilter('all')}
                className="mt-6 text-[10px] font-bold text-accent uppercase tracking-widest border-b border-accent/30 hover:border-accent transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-12 lg:gap-16">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : (
              filteredAuctions.map((auction) => (
                <div key={auction.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <AuctionCard auction={auction} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Infinite Scroll / Pagination Placeholder */}
        {!isLoading && filteredAuctions.length > 0 && (
          <div className="mt-24 pt-12 border-t border-border/40 text-center">
            <p className="ui-label text-[10px] text-muted-foreground uppercase tracking-widest opacity-40">
              End of Records
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
