'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuctions, useDeleteAuction, useReactivateAuction } from '@/hooks/useAuctions';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import type { Auction } from '@/types/database';
import SubmissionForm from '@/components/SubmissionForm';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Activity, Globe, Fingerprint, Info, Sparkles, TrendingUp, User, Clock, Award, Truck, Trash2, RotateCcw, Package, Camera } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import ProfileEditDialog from '@/components/ProfileEditDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

// Acquisitions Grid Component with Checkout Links
interface AcquisitionsGridProps {
  items: Auction[];
  emptyText: string;
  isLoading?: boolean;
  userId: string;
}

function AcquisitionsGrid({ items, emptyText, isLoading, userId }: AcquisitionsGridProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-sm overflow-hidden">
            <Skeleton className="aspect-[4/3]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="heading-editorial text-xl text-muted-foreground">{emptyText}</p>
        <Link href="/floor" className="ui-label text-accent hover:text-accent/80 mt-4 inline-block">
          Browse The Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => {
        const itemWithFulfillment = item as Auction & {
          fulfillment_status?: string | null;
          winner_id?: string | null;
          tracking_number?: string | null;
        };
        const needsPayment = itemWithFulfillment.fulfillment_status === 'pending_payment' && itemWithFulfillment.winner_id === userId;
        const isShipped = itemWithFulfillment.fulfillment_status === 'shipped';
        const hasTracking = !!itemWithFulfillment.tracking_number;

        return (
          <div
            key={item.id}
            className="group bg-card border border-border rounded-sm overflow-hidden hover:border-accent transition-colors duration-300 relative"
          >
            <Link
              href={`/piece/${item.id}`}
              className="block"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                {item.images?.[0] ? (
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                  <span className="ui-label text-muted-foreground">
                  {itemWithFulfillment.designer_name || item.designer?.display_name || 'Unknown Designer'}
                </span>
                <h3 className="font-serif text-lg mt-1 mb-2 group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="heading-display text-xl text-accent">
                    €{item.current_price.toLocaleString()}
                  </span>
                  {isShipped && (
                    <span className="ui-caption text-accent">Shipped</span>
                  )}
                </div>
              </div>
            </Link>
            
            {/* Checkout Button for items needing payment */}
            {needsPayment && (
              <div className="p-4 border-t border-border bg-accent/5">
                <Link href={`/checkout/${item.id}`}>
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    Complete Checkout
                  </Button>
                </Link>
              </div>
            )}

            {/* Tracking info for shipped items */}
            {isShipped && hasTracking && (
              <div className="p-4 border-t border-border bg-muted/30">
                <p className="ui-caption text-muted-foreground mb-1">Tracking</p>
                <p className="font-mono text-sm">{itemWithFulfillment.tracking_number}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Shipping Tab Component for Designers
function ShippingTab({ designerId }: { designerId: string }) {
  const supabase = getSupabaseClient();
  const [trackingNumber, setTrackingNumber] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const { data: auctions, isLoading } = useAuctions();
  
  // Get sold auctions that need shipping
  const soldAuctions = (auctions || []).filter(
    a => a.designer_id === designerId && 
         a.status === 'SOLD' && 
         (a.fulfillment_status === 'address_collected' || a.fulfillment_status === 'shipped')
  );

  const { data: shippingAddresses } = useQuery<Array<{
    id: string;
    auction_id: string;
    full_name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state?: string | null;
    postal_code: string;
    country: string;
    phone?: string | null;
  }>>({
    queryKey: ['shipping-addresses', soldAuctions.map(a => a.id)],
    queryFn: async () => {
      if (!supabase || soldAuctions.length === 0) return [];
      
      const auctionIds = soldAuctions.map(a => a.id);
      // Type assertion needed until Supabase types are regenerated after migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('shipping_addresses')
        .select('*')
        .in('auction_id', auctionIds);

      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        auction_id: string;
        full_name: string;
        address_line1: string;
        address_line2?: string | null;
        city: string;
        state?: string | null;
        postal_code: string;
        country: string;
        phone?: string | null;
      }>;
    },
    enabled: soldAuctions.length > 0 && !!supabase,
  });

  const handleUpdateTracking = async (auctionId: string) => {
    if (!supabase) return;
    
    const tracking = trackingNumber[auctionId]?.trim();
    if (!tracking) {
      toast.error('Please enter a tracking number');
      return;
    }

    setIsUpdating(prev => ({ ...prev, [auctionId]: true }));

    try {
      // Type assertion needed until Supabase types are regenerated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('auctions')
        .update({
          tracking_number: tracking,
          fulfillment_status: 'shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', auctionId);

      if (error) throw error;

      toast.success('Tracking number updated. Winner will be notified.');
      setTrackingNumber(prev => ({ ...prev, [auctionId]: '' }));
      
      // Refresh auctions
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update tracking';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(prev => ({ ...prev, [auctionId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (soldAuctions.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-sm">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="heading-editorial text-xl text-muted-foreground mb-2">No Items to Ship</p>
        <p className="ui-caption">Items that have been sold and paid for will appear here for shipping.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="heading-display text-2xl mb-2">Items to Ship</h2>
        <p className="ui-caption">Update tracking numbers for sold items that have been shipped.</p>
      </div>

      {soldAuctions.map((auction) => {
        const auctionWithFulfillment = auction as Auction & {
          fulfillment_status?: string | null;
          tracking_number?: string | null;
          shipped_at?: string | null;
        };
        const address = shippingAddresses?.find(a => a.auction_id === auction.id);
        const isShipped = auctionWithFulfillment.fulfillment_status === 'shipped';
        const hasTracking = !!auctionWithFulfillment.tracking_number;

        return (
          <div key={auction.id} className="p-6 bg-card border border-border rounded-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-serif text-lg mb-1">{auction.title}</h3>
                <p className="ui-caption text-muted-foreground">
                  Sold for €{auction.current_price.toLocaleString()}
                </p>
                {isShipped && auctionWithFulfillment.shipped_at && (
                  <p className="ui-caption text-accent mt-1">
                    Shipped on {new Date(auctionWithFulfillment.shipped_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${
                isShipped 
                  ? 'bg-accent/10 text-accent' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isShipped ? 'Shipped' : 'Ready to Ship'}
              </div>
            </div>

            {address && (
              <div className="mb-4 p-4 bg-muted/50 rounded-sm">
                <p className="ui-label text-muted-foreground mb-2">Shipping Address</p>
                <div className="text-sm space-y-1">
                  <p>{address.full_name}</p>
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p>{address.city}, {address.state} {address.postal_code}</p>
                  <p>{address.country}</p>
                  {address.phone && <p>Phone: {address.phone}</p>}
                </div>
              </div>
            )}

            {hasTracking && (
              <div className="mb-4 p-4 bg-accent/5 border border-accent/20 rounded-sm">
                <p className="ui-label text-accent mb-1">Tracking Number</p>
                <p className="font-mono text-sm">{auctionWithFulfillment.tracking_number}</p>
              </div>
            )}

            {!isShipped && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`tracking-${auction.id}`}>Tracking Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id={`tracking-${auction.id}`}
                      value={trackingNumber[auction.id] || ''}
                      onChange={(e) => setTrackingNumber(prev => ({
                        ...prev,
                        [auction.id]: e.target.value
                      }))}
                      placeholder="Enter tracking number"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleUpdateTracking(auction.id)}
                      disabled={isUpdating[auction.id]}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      {isUpdating[auction.id] ? 'Updating...' : 'Mark as Shipped'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Vault() {
  const { user, profile, loading: authLoading, refreshProfile, isWaitlisted, updateProfileRole } = useAuth();
  const router = useRouter();
  const { data: auctions, isLoading: auctionsLoading } = useAuctions();
  const supabase = getSupabaseClient();

  const isAdmin = profile?.role === 'admin';
  const isDesigner = profile?.role === 'designer';

  const handleTogglePersona = async () => {
    const newRole = isDesigner ? 'collector' : 'designer';
    const { error } = await updateProfileRole(newRole);
    if (error) {
      toast.error(`Failed to update profile: ${error.message}`);
    } else {
      toast.success(`Profile switched to ${newRole}.`);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(isWaitlisted && !isDesigner ? 'designer-application' : 'watching');
  const tabsRef = useRef<HTMLDivElement>(null);

  const scrollToTabs = (tab: string) => {
    setActiveTab(tab);
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const { data: userBids, isLoading: bidsLoading } = useQuery<string[]>({
    queryKey: ['user-bids', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id || !supabase) return [];
      const { data, error } = await supabase
        .from('bids')
        .select('auction_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map(b => b.auction_id);
    },
    enabled: !!user?.id && profile?.role !== 'designer' && !!supabase,
  });

  useEffect(() => {
    if (user && !authLoading) {
      refreshProfile();
    }
  }, [user, authLoading, refreshProfile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="flex items-start gap-6 mb-12">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center py-16">
            <p className="heading-editorial text-xl text-muted-foreground mb-4">Please sign in to access your vault</p>
            <Link href="/auth" className="ui-label text-accent hover:text-accent/80">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const designerAuctions = isDesigner 
    ? (auctions || []).filter(a => a.designer_id === user.id)
    : [];

  const collectorBidAuctionIds = new Set(userBids || []);
  const watchingAuctions = (auctions || []).filter(a => 
    collectorBidAuctionIds.has(a.id) && 
    (a.status === 'LOCKED' || a.status === 'UNLOCKED')
  );
  const acquiredAuctions = (auctions || []).filter(a => 
    collectorBidAuctionIds.has(a.id) && 
    a.status === 'SOLD'
  );

  const collectorStats = {
    totalBids: userBids?.length || 0,
    activeBids: watchingAuctions.length,
    acquisitions: acquiredAuctions.length,
    watching: watchingAuctions.length,
  };

  const designerStats = {
    totalPieces: designerAuctions.length,
    activePieces: designerAuctions.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').length,
    soldPieces: designerAuctions.filter(a => a.status === 'SOLD').length,
    totalRevenue: designerAuctions.filter(a => a.status === 'SOLD').reduce((acc, a) => acc + a.current_price, 0),
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl w-full box-border">
        {/* Profile Header */}
        <div className="mb-12 animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border border-accent/30 shrink-0 relative">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="heading-display text-2xl sm:text-3xl md:text-4xl mb-2 break-words leading-tight">
                    {isDesigner ? `${profile?.display_name || 'Designer'}'s Studio` : (profile?.display_name || 'The Vault')}
                  </h1>
                  <p className="ui-caption mb-2 text-sm sm:text-base">
                    {isDesigner 
                      ? 'Creative workspace on ATELIER' 
                      : 'Private collection on ATELIER'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                      isDesigner 
                        ? 'bg-accent/20 text-accent' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isDesigner ? 'Designer' : 'Collector'}
                    </span>
                    
                    {isWaitlisted && (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-accent text-accent-foreground animate-pulse border border-accent">
                        WAITLISTED
                      </span>
                    )}
                    
                    {!isDesigner && profile?.seller_status === 'NONE' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground"
                        onClick={() => scrollToTabs('designer-application')}
                      >
                        Apply to Design
                      </Button>
                    )}
                    
                    {!isDesigner && profile?.seller_status === 'PENDING' && (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-accent/10 text-accent animate-pulse border border-accent/20">
                        Authorization Pending
                      </span>
                    )}

                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        onClick={handleTogglePersona}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isDesigner ? 'View as Collector' : 'View as Designer'}
                      </Button>
                    )}

                    <ProfileEditDialog />
                  </div>
                  {isDesigner && (
                    <p className="ui-caption mt-3 text-accent/80 text-sm sm:text-base">
                      Curate and manage exclusive pieces
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div id="tour-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-fade-up delay-100">
          {isDesigner ? (
            <>
              <StatCard icon={Package} label="Total Pieces" value={designerStats.totalPieces.toString()} />
              <StatCard icon={TrendingUp} label="Active" value={designerStats.activePieces.toString()} accent />
              <StatCard icon={Award} label="Sold" value={designerStats.soldPieces.toString()} />
              <StatCard 
                icon={TrendingUp} 
                label="Revenue" 
                value={`€${designerStats.totalRevenue.toLocaleString()}`} 
              />
            </>
          ) : (
            <>
              <StatCard icon={TrendingUp} label="Total Bids" value={collectorStats.totalBids.toString()} />
              <StatCard icon={Clock} label="Active Bids" value={collectorStats.activeBids.toString()} accent />
              <StatCard icon={Award} label="Acquisitions" value={collectorStats.acquisitions.toString()} />
              <StatCard icon={Package} label="Watching" value={collectorStats.watching.toString()} />
            </>
          )}
        </div>

        {/* Tabs Content */}
        <div className="animate-fade-up delay-200">
          {isDesigner ? (
            <Tabs defaultValue="submit" className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 sm:gap-8 h-auto pb-0 overflow-x-auto">
                <TabsTrigger 
                  value="portfolio" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Portfolio
                </TabsTrigger>
                <TabsTrigger 
                  value="shipping" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Shipping
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="submit" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  <span className="hidden sm:inline">Submit New</span>
                  <span className="sm:hidden">Submit</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="collector-view" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Private Collection
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="portfolio" className="pt-8">
                <div className="mb-6">
                  <h2 className="heading-display text-2xl mb-2 uppercase tracking-tight">PORTFOLIO</h2>
                  <p className="ui-caption">Active listings and curated pieces on The Floor</p>
                </div>
                <ItemGrid 
                  items={designerAuctions} 
                  emptyText="No pieces in portfolio yet. Submit your first piece to get started!" 
                  isLoading={auctionsLoading}
                  showDelete={true}
                />
              </TabsContent>
              
              <TabsContent value="shipping" className="pt-8">
                <ShippingTab designerId={user.id} />
              </TabsContent>

              <TabsContent value="collector-view" className="pt-8">
                <Tabs defaultValue="watching" className="w-full">
                  <TabsList className="bg-transparent border-b border-border rounded-none justify-start h-auto pb-0 mb-8">
                    <TabsTrigger value="watching" className="px-5 py-2">Watching</TabsTrigger>
                    <TabsTrigger value="acquisitions" className="px-5 py-2">Acquisitions</TabsTrigger>
                  </TabsList>
                  <TabsContent value="watching">
                    <ItemGrid 
                      items={watchingAuctions} 
                      emptyText="No watched pieces in this persona." 
                      isLoading={auctionsLoading}
                    />
                  </TabsContent>
                  <TabsContent value="acquisitions">
                    <AcquisitionsGrid 
                      items={acquiredAuctions} 
                      emptyText="No acquisitions found in private collection."
                      isLoading={auctionsLoading}
                      userId={user.id}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
              
              <TabsContent value="analytics" className="pt-8">
                <div className="text-center py-16 border border-dashed border-border rounded-sm">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="heading-editorial text-xl text-muted-foreground mb-2">Analytics Coming Soon</p>
                  <p className="ui-caption">Track your performance and revenue insights</p>
                </div>
              </TabsContent>
              
              <TabsContent value="submit" className="pt-4 sm:pt-8">
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-accent/5 border border-accent/20 rounded-sm">
                  <h2 className="heading-display text-xl sm:text-2xl mb-2 uppercase tracking-tight">SUBMISSION</h2>
                  <p className="ui-caption text-sm sm:text-base">
                    {profile?.is_authorized_seller ? (
                      "Introduce an exclusive piece to The Archive. Once submitted, collectors can register their interest."
                    ) : (
                      "Verify your designer profile to unlock piece submissions to The Archive."
                    )}
                  </p>
                </div>
                <div className="overflow-x-hidden">
                  {profile?.is_authorized_seller ? (
                    <SubmissionForm />
                  ) : (
                    <SellerApplicationSection />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div id="tour-tabs" ref={tabsRef}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 sm:gap-8 h-auto pb-0 overflow-x-auto">
                <TabsTrigger 
                  value="watching" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Live Auctions
                </TabsTrigger>
                <TabsTrigger 
                  value="acquisitions" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Acquisitions
                </TabsTrigger>
                {!isDesigner && (
                <TabsTrigger 
                  id="tour-designer-application"
                  value="designer-application" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3 uppercase tracking-widest text-[10px]"
                >
                  Designer Application
                </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="watching" className="pt-8">
                <div className="mb-6">
                  <h2 className="heading-display text-2xl mb-2 uppercase tracking-tight">ACTIVE BIDS</h2>
                  <p className="ui-caption">Current market participation and active offers</p>
                </div>
                <ItemGrid 
                  items={watchingAuctions} 
                  emptyText="You haven't placed any bids yet. Browse The Floor to find pieces you desire." 
                  isLoading={auctionsLoading || bidsLoading} 
                />
              </TabsContent>
              
              <TabsContent value="acquisitions" className="pt-8">
                <div className="mb-6">
                  <h2 className="heading-display text-2xl mb-2 uppercase tracking-tight">ACQUISITIONS</h2>
                  <p className="ui-caption">Successfully acquired pieces and collection history</p>
                </div>
                <AcquisitionsGrid 
                  items={acquiredAuctions} 
                  emptyText="No acquisitions yet. Win an auction to see your pieces here." 
                  isLoading={auctionsLoading || bidsLoading}
                  userId={user.id}
                />
              </TabsContent>

              {!isDesigner && (
                <TabsContent value="designer-application" className="pt-8">
                  <SellerApplicationSection />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}

const StatCard = ({ icon: Icon, label, value, accent }: StatCardProps) => (
  <div className="p-4 sm:p-5 bg-card border border-border rounded-sm">
    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-2 sm:mb-3 ${accent ? 'text-accent' : 'text-muted-foreground'}`} />
    <p className="ui-label text-[9px] sm:text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">{label}</p>
    <p className={`heading-display text-lg sm:text-xl md:text-2xl ${accent ? 'text-accent' : ''}`}>{value}</p>
  </div>
);

// Item Grid Component
interface ItemGridProps {
  items: Auction[];
  emptyText: string;
  isLoading?: boolean;
  showDelete?: boolean; // Only show delete for designer's own portfolio
}

const ItemGrid = ({ items, emptyText, isLoading, showDelete = false }: ItemGridProps) => {
  const deleteAuction = useDeleteAuction();
  const reactivateAuction = useReactivateAuction();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState<Auction | null>(null);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [auctionToReactivate, setAuctionToReactivate] = useState<Auction | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, auction: Auction) => {
    e.preventDefault();
    e.stopPropagation();
    setAuctionToDelete(auction);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!auctionToDelete) return;
    
    try {
      await deleteAuction.mutateAsync(auctionToDelete.id);
      toast.success('Piece removed from The Floor');
      setDeleteConfirmOpen(false);
      setAuctionToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete piece';
      toast.error(errorMessage);
    }
  };

  const handleReactivateClick = (e: React.MouseEvent, auction: Auction) => {
    e.preventDefault();
    e.stopPropagation();
    setAuctionToReactivate(auction);
    setReactivateConfirmOpen(true);
  };

  const handleReactivateConfirm = async () => {
    if (!auctionToReactivate) return;
    
    try {
      // Default to 3 days from now
      const defaultEndTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      await reactivateAuction.mutateAsync({ 
        auctionId: auctionToReactivate.id,
        endTime: defaultEndTime,
      });
      toast.success('Piece reactivated and back on The Floor');
      setReactivateConfirmOpen(false);
      setAuctionToReactivate(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate piece';
      toast.error(errorMessage);
    }
  };
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-sm overflow-hidden">
            <Skeleton className="aspect-[4/3]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="heading-editorial text-xl text-muted-foreground">{emptyText}</p>
        <Link href="/floor" className="ui-label text-accent hover:text-accent/80 mt-4 inline-block">
          Browse The Floor
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
          <div
            key={item.id}
            className="group bg-card border border-border rounded-sm overflow-hidden hover:border-accent transition-colors duration-300 relative"
          >
        <Link
          href={`/piece/${item.id}`}
              className="block"
        >
          <div className="aspect-[4/3] overflow-hidden relative">
            <Image 
              src={item.images[0]} 
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover grayscale hover:grayscale-0 transition-all duration-700 opacity-60 hover:opacity-100"
            />
          </div>
          <div className="p-4">
            <span className="ui-label text-muted-foreground">
              {item.designer?.display_name || 'Unknown Designer'}
            </span>
            <h3 className="font-serif text-lg mt-1 group-hover:text-accent transition-colors">
              {item.title}
            </h3>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
              <span className="font-serif">€{item.current_price.toLocaleString()}</span>
              <span className={`ui-label text-xs ${
                item.status === 'SOLD' ? 'text-accent' : 
                item.status === 'UNLOCKED' ? 'text-accent' : 
                'text-muted-foreground'
              }`}>
                {item.status}
              </span>
            </div>
          </div>
        </Link>
            
            {showDelete && item.status === 'LOCKED' && (
              <button
                onClick={(e) => handleDeleteClick(e, item)}
                className="absolute top-2 right-2 w-8 h-8 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Remove from The Floor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {showDelete && item.status === 'SOLD' && (
              <div className="p-4 border-t border-border bg-accent/5">
                <button
                  onClick={(e) => handleReactivateClick(e, item)}
                  className="w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground transition-colors flex items-center justify-center gap-2"
                  disabled={reactivateAuction.isPending}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="ui-label text-sm">
                    {reactivateAuction.isPending ? 'Reactivating...' : 'Put Back on Floor'}
                  </span>
                </button>
              </div>
            )}
          </div>
      ))}
    </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Piece from The Floor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{auctionToDelete?.title}" from The Floor? This action cannot be undone. The piece will be permanently removed and will no longer be visible to collectors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAuctionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAuction.isPending}
            >
              {deleteAuction.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reactivateConfirmOpen} onOpenChange={setReactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Put Piece Back on The Floor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate "{auctionToReactivate?.title}"? It will be put back on The Floor with a new 3-day auction period. The piece will reset to LOCKED status and start from the original starting price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAuctionToReactivate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateConfirm}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={reactivateAuction.isPending}
            >
              {reactivateAuction.isPending ? 'Reactivating...' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
const stripExif = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const cleanFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
            });
            resolve(cleanFile);
          } else {
            reject(new Error('Blob creation failed'));
          }
        },
        'image/webp',
        0.8
      );
    };
    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = url;
  });
};

const SellerApplicationSection = () => {
  const { user, profile, requestAuthorization } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const stripped = await stripExif(file);
      setProofPhoto(stripped);
      setPhotoPreview(URL.createObjectURL(stripped));
    } catch (error) {
      toast.error('System error during image processing.');
    }
  };

  const handleSubmit = async () => {
    if (!proofPhoto) {
      toast.error('Proof of possession required.');
      return;
    }

    setIsUpdating(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase || !user) throw new Error('System configuration error');

      // Upload sanitized proof to PRIVATE bucket
      const filePath = `${user.id}/${Date.now()}_proof.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('handshake-proofs')
        .upload(filePath, proofPhoto);

      if (uploadError) throw uploadError;

      const proofUrl = uploadData.path;

      const { error } = await requestAuthorization({
        proof_of_archive_url: proofUrl,
        archive_portfolio: portfolioUrl,
        handshake_code: profile?.handshake_code || ''
      });
      
      if (error) throw error;
      
      toast.success('Application submitted successfully. Verification in progress.');
      setIsOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'System synchronization failure.');
    } finally {
      setIsUpdating(false);
    }
  };
  if (profile?.is_authorized_seller === true) {
    return (
      <div className="text-center py-16 border border-dashed border-accent/50 rounded-sm bg-accent/5">
        <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
        <p className="heading-editorial text-xl text-accent mb-2 uppercase tracking-tight">DESIGNER AUTHORIZED</p>
        <p className="ui-caption mb-4">You have full clearance. The submission process is active.</p>
        <Link href="/vault?tab=submit">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8">
            Submit Piece
          </Button>
        </Link>
      </div>
    );
  }

  if (profile?.seller_status === 'PENDING') {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-sm bg-muted/20">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
        <p className="heading-editorial text-xl text-muted-foreground mb-2 uppercase tracking-tight">APPLICATION_PENDING</p>
        <p className="ui-caption mb-4">Your application is in progress. Admin review underway.</p>
        <div className="inline-block p-4 bg-background border border-border text-xs font-mono rounded-sm">
          VERIFICATION_CODE: {profile.handshake_code}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-16 border border-dashed border-border rounded-sm">
      <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="heading-editorial text-xl mb-2 uppercase tracking-tight">SELLER VERIFICATION</p>
      <p className="ui-caption mb-6 max-w-md mx-auto">
        Apply for seller status to list exclusive items on The Floor. 
        Only verified accounts can list inventory.
      </p>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 uppercase tracking-widest text-xs">
            Start Verification
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto font-mono border-border bg-background">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tighter text-xl">SELLER REGISTRATION</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase pt-2">
              Follow these steps to verify your account authenticity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="p-4 bg-muted/50 border border-border rounded-sm space-y-3">
              <div className="flex items-center gap-2 text-accent text-xs font-bold">
                <p>STEP_01: PROOF_OF_POSSESSION</p>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground uppercase">
                Write the following code on a physical note and place it next to your archive masterpiece. 
                Take a clear photo for later verification.
              </p>
              <div className="bg-background border border-dashed border-accent/50 p-4 text-center rounded-sm">
                <span className="text-2xl font-bold tracking-widest text-accent">{profile?.handshake_code || '---'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent text-xs font-bold">
                <Camera className="w-3 h-3" />
                <p>STEP_02: SECURE_PROOF_UPLOAD</p>
              </div>
              <p className="text-[11px] text-muted-foreground uppercase">
                Upload the photo taken in Step 01. EXIF metadata will be programmatically purged.
              </p>
              
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden" 
                  id="handshake-upload"
                />
                <label 
                  htmlFor="handshake-upload"
                  className="flex flex-col items-center justify-center border border-dashed border-border p-8 rounded-sm cursor-pointer hover:border-accent/50 transition-colors bg-muted/20"
                >
                  {photoPreview ? (
                    <div className="relative h-48 w-full">
                      <Image src={photoPreview} alt="Verification Preview" fill className="object-contain rounded-sm" />
                    </div>
                  ) : (
                    <>
                      <Package className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-[10px] text-muted-foreground uppercase">Upload Sanitized Proof</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent text-xs font-bold">
                <Globe className="w-3 h-3" />
                <p>STEP_03: PORTFOLIO LINK</p>
              </div>
              <p className="text-[11px] text-muted-foreground uppercase">
                Provide a link to your digital portfolio or creative work.
              </p>
              <Input 
                placeholder="e.g., https://archive.org/designer-portfolio"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="bg-muted/20 border-border text-xs h-9"
              />
            </div>

            <div className="p-4 bg-accent/10 border border-accent/30 rounded-sm">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-accent flex-shrink-0 mt-1" />
                <p className="text-[10px] text-accent/80 leading-relaxed uppercase">
                  Verification will be analyzed by platform admins. Once authorized, you can submit pieces to the Community for curation.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-widest"
              onClick={handleSubmit}
              disabled={isUpdating}
            >
              {isUpdating ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

