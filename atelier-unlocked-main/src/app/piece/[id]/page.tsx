'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const router = useRouter();
  const id = params.id as string;
  const { data: auction, isLoading: auctionLoading } = useAuction(id);
  const { data: bids = [], isLoading: bidsLoading } = useBids(id);
  const { user } = useAuth();
  const placeBid = usePlaceBid();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidError, setBidError] = useState<string>('');

  // Calculate countdown - must be before early returns
  const endTime = auction ? new Date(auction.end_time) : new Date();
  const { timeLeft, isExpired } = useCountdown(endTime);

  // Track page view
  useEffect(() => {
    if (id) {
      analytics.auctionViewed(id);
    }
  }, [id]);

  // Update bid amount when auction changes - must be before early returns
  useEffect(() => {
    if (auction) {
      const suggestedBid = auction.current_price + 100;
      setBidAmount(suggestedBid.toString());
      setBidError('');
    }
  }, [auction]);

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
  // LOCKED auctions should never show as ended, even if end_time has passed
  // They're waiting for bids to unlock. Only UNLOCKED auctions can be ended by time.
  const isEnded = auction.status === 'SOLD' || auction.status === 'VOID' || 
    (auction.status === 'UNLOCKED' && isExpired);
  const minBid = auction.current_price + 100;
  // Use designer_name from auction if available, otherwise use profile display_name
  // This allows archive items to show different designer names
  const designerName = auction.designer_name || auction.designer?.display_name || 'Unknown Designer';
  const imageUrl = auction.images?.[0] || '/placeholder.svg';

  // Transform bids for LiveLedger
  const ledgerBids = bids.map(bid => ({
    id: bid.id,
    collectorId: bid.bidder?.display_name?.slice(0, 4) || bid.user_id.slice(0, 4),
    amount: bid.amount,
    timestamp: new Date(bid.created_at),
  }));

  const validateBidAmount = (amount: string): boolean => {
    setBidError('');
    
    if (!amount || amount.trim() === '') {
      setBidError('Please enter a bid amount');
      return false;
    }

    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      setBidError('Please enter a valid number');
      return false;
    }

    if (numAmount <= 0) {
      setBidError('Bid amount must be greater than 0');
      return false;
    }

    if (numAmount <= auction.current_price) {
      setBidError(`Bid must be higher than current price of €${auction.current_price.toLocaleString()}`);
      return false;
    }

    return true;
  };

  const handleBidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBidAmount(value);
    
    // Clear error when user starts typing
    if (bidError) {
      setBidError('');
    }
  };

  const handlePlaceBid = async () => {
    if (!user) {
      toast.error('Please sign in to place a bid');
      router.push('/auth');
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

    // Validate bid amount
    if (!validateBidAmount(bidAmount)) {
      return;
    }

    const bidValue = Math.round(parseFloat(bidAmount));

    try {
      await placeBid.mutateAsync({ auctionId: auction.id, amount: bidValue });
      analytics.bidPlaced(auction.id, bidValue);
      toast.success('Bid placed successfully!');
      // Reset to suggested next bid
      setBidAmount((bidValue + 100).toString());
      setBidError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place bid';
      toast.error(errorMessage);
      setBidError(errorMessage);
      
      // If it's an auth error, redirect to sign in
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('sign in')) {
        setTimeout(() => router.push('/auth'), 2000);
      }
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
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <span className="heading-display text-3xl block mb-2">
                        {auction.status === 'SOLD' ? 'SOLD' : 'ENDED'}
                      </span>
                      {auction.status === 'SOLD' && (
                        <span className="ui-caption text-sm text-muted-foreground">
                          Archive Reference Piece
                        </span>
                      )}
                    </div>
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
              <div className="flex items-center gap-3 mb-2">
                <span className="ui-label text-muted-foreground">{designerName}</span>
                {auction.status === 'SOLD' && (
                  <span className="ui-caption px-3 py-1 bg-muted text-muted-foreground rounded-full">
                    Archive • Reference
                  </span>
                )}
              </div>
              <h1 className="heading-display text-3xl md:text-4xl mt-2 mb-4">
                {auction.title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {auction.description}
              </p>
            </div>

            {/* Protocol Bar */}
            {!isEnded && (
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
            )}
            {isEnded && auction.status === 'SOLD' && (
              <div className="p-6 bg-card border border-border rounded-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="ui-label text-muted-foreground">Archive Status</span>
                  <span className="ui-label text-accent">SOLD</span>
                </div>
                <p className="ui-caption text-muted-foreground">
                  This piece is part of our archive collection. It serves as a reference for the quality and value of pieces available on The Floor. Browse active auctions to place your bid.
                </p>
              </div>
            )}

            {/* Price & Timer */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-card border border-border rounded-sm">
                <span className="ui-label text-muted-foreground block mb-2">
                  {auction.status === 'SOLD' 
                    ? 'Final Price' 
                    : isUnlocked 
                      ? 'Current Bid' 
                      : 'Starting Price'
                  }
                </span>
                <span className="heading-display text-3xl text-accent">
                  €{auction.current_price.toLocaleString()}
                </span>
                {bids.length > 0 && !isEnded && (
                  <span className="ui-caption block mt-1">
                    {bids.length} bid{bids.length !== 1 ? 's' : ''} placed
                  </span>
                )}
                {isEnded && auction.status === 'SOLD' && bids.length > 0 && (
                  <span className="ui-caption block mt-1 text-muted-foreground">
                    Sold to highest bidder
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
                <div className="space-y-4">
                  <div>
                    <label htmlFor="bidAmount" className="ui-label text-muted-foreground block mb-2">
                      Enter Your Bid
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-serif">
                          €
                        </span>
                        <Input
                          id="bidAmount"
                          type="number"
                          min={auction.current_price + 1}
                          step="1"
                          value={bidAmount}
                          onChange={handleBidAmountChange}
                          onBlur={() => validateBidAmount(bidAmount)}
                          placeholder={minBid.toString()}
                          className="pl-8 text-lg font-serif h-14 bg-background border-accent/50 focus:border-accent"
                          disabled={placeBid.isPending || !user}
                        />
                      </div>
                      <Button 
                        size="lg"
                        onClick={handlePlaceBid}
                        disabled={placeBid.isPending || !user || !!bidError}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 h-14"
                      >
                        <span className="ui-label text-sm">
                          {placeBid.isPending ? 'Placing...' : 'Place Bid'}
                        </span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    {bidError && (
                      <p className="ui-caption text-destructive mt-2">
                        {bidError}
                      </p>
                    )}
                    {!bidError && bidAmount && parseFloat(bidAmount) > auction.current_price && (
                      <p className="ui-caption text-muted-foreground mt-2">
                        Current price: €{auction.current_price.toLocaleString()} • Your bid: €{parseFloat(bidAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="ui-caption text-muted-foreground">
                      Minimum bid: €{minBid.toLocaleString()} (€{auction.current_price.toLocaleString()} + €100)
                    </p>
                  </div>
                </div>
                {!user && (
                  <p className="ui-caption text-muted-foreground mt-4">
                    <Link href="/auth" className="text-accent hover:underline">Sign in</Link> to place a bid
                  </p>
                )}
                {user && !isUnlocked && (
                  <p className="ui-caption text-accent/80 mt-4">
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

