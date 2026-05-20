'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useOptimistic } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuction } from '@/hooks/useAuctions';
import { useBids, usePlaceBid } from '@/hooks/useBids';
import { useAuth } from '@/contexts/AuthContext';
import StatusBar from '@/components/StatusBar';
import LiveLedger from '@/components/LiveLedger';
import { useUserSignal } from '@/hooks/useSignals';
import { useCountdown } from '@/hooks/useCountdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ShieldAlert, Lock, Zap, Clock } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import type { AuctionStatus } from '@/types/database';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
// AnimatePresence removed as unused

export default function Masterpiece() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: auction, isLoading: auctionLoading } = useAuction(id);
  const { data: bids = [] } = useBids(id);
  // bidsLoading removed as unused
  const { user, profile, isWaitlisted } = useAuth();
  const { data: hasSignaled } = useUserSignal(id, user?.id);
  const placeBid = usePlaceBid();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidError, setBidError] = useState<string>('');
  const [hasUnlocked, setHasUnlocked] = useState(false);

  // Priority Access Verification
  const isPriorityWindowActive = auction?.priority_until ? new Date(auction.priority_until) > new Date() : false;
  const isAccessGated = isPriorityWindowActive && !hasSignaled && profile?.role !== 'admin';

  // Calculate countdown - must be before early returns
  const { timeLeft, isExpired } = useCountdown(auction?.end_time);

  // Track page view
  useEffect(() => {
    if (id) {
      analytics.auctionViewed(id);
    }
  }, [id]);

  // Update bid amount when auction changes - but don't overwrite user's manual input
  useEffect(() => {
    if (auction) {
      const suggestedBid = auction.current_price + 100;
      
      // Only auto-update if:
      // 1. It's the first time we load the auction data
      // 2. Or the current price has increased (someone else bid)
      // This prevents the "jumping input" bug while the user is typing
      setBidAmount(prev => {
        const prevNum = parseFloat(prev);
        if (!prev || isNaN(prevNum) || suggestedBid > prevNum) {
          return suggestedBid.toString();
        }
        return prev;
      });
      
      setBidError('');
      
      // Fire confetti if newly unlocked
      if (auction.status === 'UNLOCKED' && !hasUnlocked) {
        setHasUnlocked(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFDF00', '#ffffff', '#000000']
        });
      }
    }
  }, [auction, hasUnlocked]);

  // Real-time outbid UX
  const [previousHighestBidder, setPreviousHighestBidder] = useState<string | null>(null);
  useEffect(() => {
    if (bids.length > 0) {
      const currentHighestBidder = bids[0].user_id;
      
      if (
        previousHighestBidder === user?.id && 
        currentHighestBidder !== user?.id
      ) {
        toast.error('POSITION LOST: You have been outbid.', {
          description: `Current highest bid is now €${bids[0].amount.toLocaleString()}`,
          duration: 6000,
          style: { border: '1px solid hsl(0, 84%, 60%)', backgroundColor: 'hsl(0, 0%, 5%)', color: 'hsl(0, 84%, 60%)' },
        });
      }
      
      setPreviousHighestBidder(currentHighestBidder);
    }
  }, [bids, user?.id, previousHighestBidder]);

  const [optimisticPrice, setOptimisticPrice] = useOptimistic(
    auction?.current_price || 0,
    (state, newAmount: number) => newAmount
  );

  const [optimisticBids, setOptimisticBids] = useOptimistic(
    bids,
    (state, newBid: { id: string; user_id: string; amount: number; created_at: string; bidder: { display_name: string } }) => [newBid, ...state]
  );

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
  // Show as ended if status is SOLD/VOID, or if expired (even if status hasn't updated yet)
  const isEnded = auction.status === 'SOLD' || auction.status === 'VOID' || isExpired;
  const minBid = auction.current_price + 100;
  // Use designer_name from auction if available, otherwise use profile display_name
  // This allows archive items to show different designer names
  const designerName = auction.designer_name || auction.designer?.display_name || 'Unknown Designer';
  const imageUrl = auction.images?.[0] || '/placeholder.svg';

  // Transform bids for LiveLedger
  const ledgerBids = optimisticBids.map(bid => ({
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
      // Trigger Optimistic Update
      setOptimisticPrice(bidValue);
      setOptimisticBids({
        id: 'temp-id',
        user_id: user.id,
        amount: bidValue,
        created_at: new Date().toISOString(),
        bidder: { display_name: profile?.display_name || 'Collector' }
      });

      await placeBid.mutateAsync({ auctionId: auction.id, amount: bidValue });
      analytics.bidPlaced(auction.id, bidValue);
      toast.success('Your bid has been successfully placed.');
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
              <div className="aspect-[3/4] relative overflow-hidden bg-muted rounded-sm">
                <Image
                  src={imageUrl}
                  alt={auction.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
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

                {/* Stabilization Alert */}
                {(() => {
                  const now = new Date();
                  const endTime = new Date(auction.end_time);
                  const updatedAt = new Date(auction.updated_at);
                  const diffMinutes = (endTime.getTime() - updatedAt.getTime()) / (1000 * 60);
                  const isRecentlyUpdated = (now.getTime() - updatedAt.getTime()) < 30000; // Last 30 seconds
                  
                  // If end time is roughly 5 mins away from last update, it was likely a soft close extension
                  if (diffMinutes >= 4.5 && diffMinutes <= 5.1 && isRecentlyUpdated) {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-4 left-4 right-4 bg-accent/20 backdrop-blur-md border border-accent/40 p-4 flex items-center gap-3 z-20"
                      >
                        <ShieldAlert className="w-5 h-5 text-accent animate-pulse" />
                        <div>
                          <p className="text-[10px] font-bold text-accent uppercase tracking-widest">MARKET_ACTIVE</p>
                          <p className="text-[9px] text-accent/80 uppercase">Strong interest detected. Maintaining market stability.</p>
                        </div>
                      </motion.div>
                    );
                  }
                  return null;
                })()}
              </div>

              {auction.images && auction.images.length > 1 && (
                <div className="flex gap-3 mt-4">
                  {auction.images.map((img, i) => (
                    <button
                      key={i}
                      className={`relative w-16 h-20 overflow-hidden rounded-sm border-2 transition-colors ${
                        i === 0 ? 'border-accent' : 'border-transparent hover:border-border'
                      }`}
                    >
                      <Image src={img} alt="" fill sizes="64px" className="object-cover" />
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

            {/* Protocol Bar / Signal Phase */}
            {!isEnded && (
              <motion.div 
                className="p-6 bg-card border border-border rounded-sm relative overflow-hidden"
                animate={{ 
                  borderColor: isUnlocked ? ['#333', '#D4AF37', '#333'] : '#333' 
                }}
                transition={{ duration: 2, repeat: isUnlocked ? Infinity : 0 }}
              >
                {isUnlocked && (
                  <motion.div 
                    className="absolute inset-0 bg-accent/5" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="ui-label text-muted-foreground uppercase tracking-widest text-[10px]">
                    {auction.status === 'PROPOSED' ? 'COMMUNITY EVALUATION' : 'HUB ACTIVITY'}
                  </span>
                  <span className={`ui-label text-[10px] tracking-widest ${isUnlocked ? 'text-accent' : 'text-muted-foreground'}`}>
                    {auction.status === 'PROPOSED' ? 'REGISTRATION' : isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
                
                {auction.status === 'PROPOSED' ? (
                  <div className="space-y-3">
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((auction.signals_count / 3) * 100, 100)}%` }}
                        className="h-full bg-emerald-500" 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-tighter font-bold">
                      <span className="text-muted-foreground">DEMAND STRENGTH:</span>
                      <span className="text-emerald-500">
                        {auction.signals_count} / 3 INTERESTS
                      </span>
                    </div>
                  </div>
                ) : (
                  <StatusBar
                    currentInterest={auction.unique_bidder_count}
                    requiredInterest={auction.required_bidders}
                    status={auction.status as AuctionStatus}
                    size="lg"
                  />
                )}

                <p className="ui-caption mt-4">
                  {auction.status === 'PROPOSED' 
                    ? 'This piece is in the evaluation phase. High community interest signals an Admin publication to the Hub.'
                    : isUnlocked 
                      ? 'This piece has been unlocked. The highest bidder will acquire it when the timer ends.'
                      : `${auction.required_bidders - auction.unique_bidder_count} more collector${auction.required_bidders - auction.unique_bidder_count !== 1 ? 's' : ''} needed to unlock this piece.`
                  }
                </p>
              </motion.div>
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
                  €{optimisticPrice.toLocaleString()}
                </span>
                {optimisticBids.length > 0 && !isEnded && (
                  <span className="ui-caption block mt-1">
                    {optimisticBids.length} bid{optimisticBids.length !== 1 ? 's' : ''} placed
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
            {!isEnded && !isAccessGated && (
              <div className="p-6 bg-card border border-accent/30 rounded-sm">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="bidAmount" className="ui-label text-muted-foreground block mb-2 uppercase tracking-wide">
                      ENTER BID
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
                          disabled={placeBid.isPending || !user || !!bidError || isWaitlisted}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 h-14"
                        >
                          <span className="ui-label text-sm">
                            {placeBid.isPending ? 'Placing...' : isWaitlisted ? 'Waitlisted' : 'Place Bid'}
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
                        Current price: €{auction.current_price.toLocaleString()} • Active bid: €{parseFloat(bidAmount).toLocaleString()}
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
                    <Link href="/auth" className="text-accent hover:underline">Sign in</Link> to participate
                  </p>
                )}
                {user && isWaitlisted && (
                  <p className="ui-caption text-accent mt-4 font-bold">
                    [ACCESS_PENDING]: You are currently on the waitlist. Interaction is limited to community discussion until your account is verified.
                  </p>
                )}
                {user && !isUnlocked && (
                  <p className="ui-caption text-accent/80 mt-4">
                    Funds are secured until auction termination.
                  </p>
                )}
              </div>
            )}

            {/* Priority Access Gate UI */}
            {!isEnded && isAccessGated && (
              <div className="p-8 border border-accent/40 bg-accent/5 rounded-sm relative overflow-hidden font-mono">
                <div className="absolute top-0 right-0 p-3">
                  <Lock className="w-5 h-5 text-accent/40" />
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-bold text-accent uppercase tracking-tight flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> [ACCESS_RESTRICTED]
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase">
                    This masterpiece is currenty in its 24-hour priority window. 
                    Access is exclusive to collectors who expressed interest during the evaluation phase.
                  </p>
                  <div className="pt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-[10px] text-accent/80">
                      <Clock className="w-3 h-3" /> 
                      PRIORITY_ACCESS: {new Date(auction.priority_until!).toLocaleString()}
                    </div>
                    <Link href="/intel" className="w-full">
                      <Button variant="outline" className="w-full h-12 border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground text-[10px] uppercase tracking-widest">
                        Return to COMMUNITY
                      </Button>
                    </Link>
                  </div>
                </div>
                {/* Visual heart-beat effect for gated content */}
                <div className="absolute bottom-[-20%] right-[-10%] opacity-[0.05]">
                  <Zap className="w-32 h-32 text-accent" />
                </div>
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

