'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, TrendingUp, Clock, Award, Sparkles, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuctions } from '@/hooks/useAuctions';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import type { Auction } from '@/types/database';
import SubmissionForm from '@/components/SubmissionForm';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDeleteAuction } from '@/hooks/useAuctions';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ProfileEditDialog from '@/components/ProfileEditDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';

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
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={item.images?.[0] || '/placeholder.svg'}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const { data: auctions, isLoading: auctionsLoading } = useAuctions();
  const supabase = getSupabaseClient();

  const isDesigner = profile?.role === 'designer';

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
  const collectorActiveAuctions = !isDesigner
    ? (auctions || []).filter(a => 
        collectorBidAuctionIds.has(a.id) && 
        (a.status === 'LOCKED' || a.status === 'UNLOCKED')
      )
    : [];
  const collectorAcquisitions = !isDesigner
    ? (auctions || []).filter(a => 
        collectorBidAuctionIds.has(a.id) && 
        a.status === 'SOLD'
      )
    : [];

  const collectorStats = {
    totalBids: userBids?.length || 0,
    activeBids: collectorActiveAuctions.length,
    acquisitions: collectorAcquisitions.length,
    watching: collectorActiveAuctions.length,
  };

  const designerStats = {
    totalPieces: designerAuctions.length,
    activePieces: designerAuctions.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').length,
    soldPieces: designerAuctions.filter(a => a.status === 'SOLD').length,
    totalRevenue: designerAuctions.filter(a => a.status === 'SOLD').reduce((acc, a) => acc + a.current_price, 0),
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl w-full">
        {/* Profile Header */}
        <div className="mb-12 animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="heading-display text-2xl sm:text-3xl md:text-4xl mb-2 break-words">
                    {isDesigner ? `${profile?.display_name || 'Designer'}'s Studio` : (profile?.display_name || 'The Vault')}
              </h1>
                  <p className="ui-caption mb-2 text-sm sm:text-base">
                    {isDesigner 
                      ? 'Your creative workspace at ATELIER' 
                      : 'Your personal sanctuary at ATELIER'}
              </p>
                  <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                isDesigner 
                  ? 'bg-accent/20 text-accent' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isDesigner ? 'Designer' : 'Collector'}
              </span>
                    <ProfileEditDialog />
                  </div>
                  {isDesigner && (
                    <p className="ui-caption mt-3 text-accent/80 text-sm sm:text-base">
                      Upload and manage your exclusive pieces
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-fade-up delay-100">
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
              </TabsList>
              
              <TabsContent value="portfolio" className="pt-8">
                <div className="mb-6">
                  <h2 className="heading-display text-2xl mb-2">Your Portfolio</h2>
                  <p className="ui-caption">All your pieces currently on The Floor</p>
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
              
              <TabsContent value="analytics" className="pt-8">
                <div className="text-center py-16 border border-dashed border-border rounded-sm">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="heading-editorial text-xl text-muted-foreground mb-2">Analytics Coming Soon</p>
                  <p className="ui-caption">Track your performance and revenue insights</p>
                </div>
              </TabsContent>
              
              <TabsContent value="submit" className="pt-4 sm:pt-8">
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-accent/5 border border-accent/20 rounded-sm">
                  <h2 className="heading-display text-xl sm:text-2xl mb-2">Submit Your Piece</h2>
                  <p className="ui-caption text-sm sm:text-base">
                    Upload your exclusive piece to The Floor. Set your starting bid and watch collectors unlock it through their desire.
                  </p>
                </div>
                <div className="overflow-x-hidden">
                <SubmissionForm />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs defaultValue="watching" className="w-full">
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
                  value="become-designer" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Become Designer
                </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="watching" className="pt-8">
                <div className="mb-6">
                  <h2 className="heading-display text-2xl mb-2">Your Active Bids</h2>
                  <p className="ui-caption">Auctions you're currently bidding on</p>
                </div>
                <ItemGrid 
                  items={collectorActiveAuctions} 
                  emptyText="You haven't placed any bids yet. Browse The Floor to find pieces you desire." 
                  isLoading={auctionsLoading || bidsLoading} 
                />
              </TabsContent>
              
              <TabsContent value="acquisitions" className="pt-8">
                <div className="mb-6">
                  <h2 className="heading-display text-2xl mb-2">Your Acquisitions</h2>
                  <p className="ui-caption">Pieces you've successfully acquired</p>
                </div>
                <AcquisitionsGrid 
                  items={collectorAcquisitions} 
                  emptyText="No acquisitions yet. Win an auction to see your pieces here." 
                  isLoading={auctionsLoading || bidsLoading}
                  userId={user.id}
                />
              </TabsContent>

              {!isDesigner && (
                <TabsContent value="become-designer" className="pt-8">
                  <BecomeDesignerSection />
                </TabsContent>
              )}
            </Tabs>
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
  <div className="p-5 bg-card border border-border rounded-sm">
    <Icon className={`w-5 h-5 mb-3 ${accent ? 'text-accent' : 'text-muted-foreground'}`} />
    <p className="ui-label text-muted-foreground mb-1">{label}</p>
    <p className={`heading-display text-2xl ${accent ? 'text-accent' : ''}`}>{value}</p>
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState<Auction | null>(null);

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
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={item.images?.[0] || '/placeholder.svg'}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
    </>
  );
};

const BecomeDesignerSection = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBecomeDesigner = async () => {
    if (!user) {
      toast.error('Please sign in to become a designer');
      return;
    }

    if (!supabase) {
      toast.error('Database connection not configured. Please check your environment variables.');
      console.error('Supabase client is null - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      return;
    }

    if (profile?.role === 'designer') {
      toast.info('You are already a designer!');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    setIsUpdating(true);
    try {
      // First check if profile exists and get current role
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      // maybeSingle() returns null data (not an error) when no row is found
      // Empty error objects {} are normal and mean "not found"
      if (checkError) {
        // Check if it's a real error or just an empty object (which means "not found")
        const hasErrorContent = checkError?.message || checkError?.code || checkError?.details || checkError?.hint;
        
        if (hasErrorContent) {
          // Real error - extract info and throw if needed
          const errorInfo = {
            message: checkError.message || 'Unknown error',
            code: checkError.code || 'UNKNOWN',
          };
        
          // Only throw if it's not a "not found" error
          if (checkError.code !== 'PGRST116' && !checkError.message?.includes('not found')) {
          throw new Error(`Failed to check profile: ${errorInfo.message} (Code: ${errorInfo.code})`);
          }
        }
        // Empty error object is normal for "not found" cases
      }

      let result;
      
      if (!existingProfile) {
        // Profile doesn't exist, create it
        result = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: user.email?.split('@')[0] || 'User',
            role: 'designer',
          })
          .select()
          .single();
      } else {
        // Profile exists, update it
        result = await supabase
          .from('profiles')
          .update({ role: 'designer' })
          .eq('id', user.id)
          .select()
          .single();
      }

      if (result.error) {
        // Safely extract error information - handle empty objects
        const errorObj = result.error;
        const errorDetails = {
          message: errorObj?.message || 'Unknown error',
          code: errorObj?.code || 'UNKNOWN',
          details: errorObj?.details || null,
          hint: errorObj?.hint || null,
          status: errorObj?.status || null,
          statusText: errorObj?.statusText || null,
        };
        
        // Provide a helpful error message
        let errorMessage = 'Failed to update role. ';
        if (errorDetails.code === '42501' || errorDetails.message?.includes('permission')) {
          errorMessage += 'Permission denied. You may not have permission to update your profile.';
        } else if (errorDetails.code === '23505') {
          errorMessage += 'Profile already exists. Please refresh the page.';
        } else if (errorDetails.message && errorDetails.message !== 'Unknown error') {
          errorMessage += errorDetails.message;
        } else {
          errorMessage += 'An unknown error occurred. Please check your database connection and permissions.';
        }
        
        throw new Error(errorMessage);
      }

      if (!result.data) {
        throw new Error('Update succeeded but no data returned');
      }

      console.log('Successfully updated profile:', result.data);

      // Refresh the profile in context
      await refreshProfile();
      
      toast.success('You are now a designer! You can now submit pieces.');
    } catch (error) {
      console.error('Failed to update role - Full error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to update role: ${JSON.stringify(error)}`;
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  if (profile?.role === 'designer') {
    return (
      <div className="text-center py-16 border border-dashed border-accent/50 rounded-sm bg-accent/5">
        <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
        <p className="heading-editorial text-xl text-accent mb-2">You are a Designer!</p>
        <p className="ui-caption mb-4">You can now submit and sell your pieces on The Floor.</p>
        <Link href="/vault?tab=submit">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Submit Your First Piece
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-16 border border-dashed border-border rounded-sm">
      <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="heading-editorial text-xl mb-2">Become a Designer</p>
      <p className="ui-caption mb-6 max-w-md mx-auto">
        As a designer, you can upload and sell your exclusive pieces on The Floor. 
        Your pieces will be available for collectors to bid on once they unlock.
      </p>
      <Button
        onClick={handleBecomeDesigner}
        disabled={isUpdating}
        className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6"
      >
        {isUpdating ? 'Updating...' : 'Become a Designer'}
      </Button>
    </div>
  );
};

