'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuction } from '@/hooks/useAuctions';
import { useBids, usePlaceBid } from '@/hooks/useBids';
import { useAuth } from '@/contexts/AuthContext';
import ProtocolBar from '@/components/ProtocolBar';
import LiveLedger from '@/components/LiveLedger';
import { useCountdown } from '@/hooks/useCountdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { analytics } from '@/lib/analytics';
import type { AuctionStatus } from '@/types/database';

export default function Masterpiece() {
  const params = useParams();
  const id = params.id as string;
  const { data: auction, isLoading: auctionLoading } = useAuction(id);
  const { data: bids = [], isLoading: bidsLoading } = useBids(id);
  const { user } = useAuth();
  const placeBid = usePlaceBid();

  // Calculate countdown - must be before early returns
  const endTime = auction ? new Date(auction.end_time) : new Date();
  const { timeLeft, isExpired } = useCountdown(endTime);

  // Track page view
  useEffect(() => {
    if (id) {
      analytics.auctionViewed(id);
    }
  }, [id]);

  if (auctionLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-6 py-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="container mx-auto px-6 pb-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            <Skeleton className="aspect-[3/4] rounded-sm" />
            <div className="space-y-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-display text-3xl mb-4">Piece Not Found</h1>
          <Link href="/floor" className="ui-label text-accent hover:text-accent/80">
            Return to The Floor
          </Link>
        </div>
      </div>
    );
  }

  const isUnlocked = auction.status === 'UNLOCKED' || auction.status === 'SOLD';
  const isEnded = auction.status === 'SOLD' || auction.status === 'VOID' || isExpired;
  const minBid = auction.current_price + 100;
  const designerName = auction.designer?.display_name || 'Unknown Designer';
  const imageUrl = auction.images?.[0] || '/placeholder.svg';

  // Transform bids for LiveLedger
  const ledgerBids = bids.map(bid => ({
    id: bid.id,
    collectorId: bid.bidder?.display_name?.slice(0, 4) || bid.user_id.slice(0, 4),
    amount: bid.amount,
    timestamp: new Date(bid.created_at),
  }));

  const handlePlaceBid = async () => {
    if (!user) {
      toast.error('Please sign in to place a bid');
      return;
    }

    // Additional client-side validation
    if (auction.designer_id === user.id) {
      toast.error('You cannot bid on your own auction');
      return;
    }

    if (isEnded) {
      toast.error('This auction has ended');
      return;
    }

    try {
      await placeBid.mutateAsync({ auctionId: auction.id, amount: minBid });
      analytics.bidPlaced(auction.id, minBid);
      toast.success('Bid placed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place bid';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 py-4">
        <Link 
          href="/floor" 
          className="inline-flex items-center gap-2 ui-caption hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to The Floor
        </Link>
      </div>

      {/* Split Layout */}
      <div className="container mx-auto px-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left: Image */}
          <div className="opacity-0 animate-fade-up">
            <div className="sticky top-24">
              <div className="aspect-[3/4] relative overflow-hidden bg-card rounded-sm">
                <img
                  src={imageUrl}
                  alt={auction.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                
                {isEnded && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <span className="heading-display text-3xl">
                      {auction.status === 'SOLD' ? 'SOLD' : 'ENDED'}
                    </span>
                  </div>
                )}
              </div>

              {/* Image thumbnails */}
              {auction.images && auction.images.length > 1 && (
                <div className="flex gap-3 mt-4">
                  {auction.images.map((img, i) => (
                    <button
                      key={i}
                      className={`w-16 h-20 overflow-hidden rounded-sm border-2 transition-colors ${
                        i === 0 ? 'border-accent' : 'border-transparent hover:border-border'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-8 opacity-0 animate-fade-up delay-200">
            {/* Header */}
            <div>
              <span className="ui-label text-muted-foreground">{designerName}</span>
              <h1 className="heading-display text-3xl md:text-4xl mt-2 mb-4">
                {auction.title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {auction.description}
              </p>
            </div>

            {/* Protocol Bar */}
            <div className="p-6 bg-card border border-border rounded-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="ui-label text-muted-foreground">The Protocol</span>
                <span className={`ui-label ${isUnlocked ? 'text-accent' : 'text-muted-foreground'}`}>
                  {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
              <ProtocolBar
                currentBidders={auction.unique_bidder_count}
                requiredBidders={auction.required_bidders}
                status={auction.status as AuctionStatus}
                size="lg"
              />
              <p className="ui-caption mt-4">
                {isUnlocked 
                  ? 'This piece has been unlocked. The highest bidder will acquire it when the timer ends.'
                  : `${auction.required_bidders - auction.unique_bidder_count} more collector${auction.required_bidders - auction.unique_bidder_count !== 1 ? 's' : ''} needed to unlock this piece.`
                }
              </p>
            </div>

            {/* Price & Timer */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-card border border-border rounded-sm">
                <span className="ui-label text-muted-foreground block mb-2">
                  {isUnlocked ? 'Current Bid' : 'Starting Price'}
                </span>
                <span className="heading-display text-3xl text-accent">
                  €{auction.current_price.toLocaleString()}
                </span>
                {bids.length > 0 && (
                  <span className="ui-caption block mt-1">
                    {bids.length} bid{bids.length !== 1 ? 's' : ''} placed
                  </span>
                )}
              </div>

              <div className="p-6 bg-card border border-border rounded-sm">
                <span className="ui-label text-muted-foreground block mb-2">
                  {isEnded ? 'Auction Ended' : 'Time Remaining'}
                </span>
                {isEnded ? (
                  <span className="heading-display text-3xl">
                    {auction.status === 'SOLD' ? 'Sold' : 'Void'}
                  </span>
                ) : (
                  <span className={`heading-display text-3xl tabular-nums ${
                    timeLeft.hours === 0 && timeLeft.minutes < 30 ? 'text-accent' : ''
                  }`}>
                    {timeLeft.hours.toString().padStart(2, '0')}:
                    {timeLeft.minutes.toString().padStart(2, '0')}:
                    {timeLeft.seconds.toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>

            {/* Bid Action */}
            {!isEnded && (
              <div className="p-6 bg-card border border-accent/30 rounded-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="ui-label text-muted-foreground block mb-1">
                      Minimum Bid
                    </span>
                    <span className="heading-display text-2xl">
                      €{minBid.toLocaleString()}
                    </span>
                  </div>
                  <Button 
                    size="lg"
                    onClick={handlePlaceBid}
                    disabled={placeBid.isPending}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 h-auto"
                  >
                    <span className="ui-label text-sm">
                      {placeBid.isPending ? 'Placing...' : 'Place Bid'}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                {!user && (
                  <p className="ui-caption text-muted-foreground">
                    <Link href="/auth" className="text-accent hover:underline">Sign in</Link> to place a bid
                  </p>
                )}
                {user && !isUnlocked && (
                  <p className="ui-caption text-accent/80">
                    Your bid will help unlock this piece. Funds are held until auction ends.
                  </p>
                )}
              </div>
            )}

            {/* Details */}
            <div className="space-y-4 pt-4 border-t border-border">
              {auction.materials && (
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="ui-label text-muted-foreground">Materials</span>
                  <span className="text-sm text-right max-w-[60%]">{auction.materials}</span>
                </div>
              )}
              {auction.sizing && (
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="ui-label text-muted-foreground">Sizing</span>
                  <span className="text-sm">{auction.sizing}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-border">
                <span className="ui-label text-muted-foreground">Designer</span>
                <span className="text-sm">{designerName}</span>
              </div>
            </div>

            {/* Live Ledger */}
            <div className="pt-4">
              <LiveLedger bids={ledgerBids} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

