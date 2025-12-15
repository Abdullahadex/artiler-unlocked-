import { Link, useNavigate } from 'react-router-dom';
import { User, Package, TrendingUp, Clock, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuctions } from '@/hooks/useAuctions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import type { Auction } from '@/types/database';

const Vault = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: auctions, isLoading: auctionsLoading } = useAuctions();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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

  if (!user) return null;

  const isDesigner = profile?.role === 'designer';

  // Filter auctions based on user role
  const soldAuctions = (auctions || []).filter(a => a.status === 'SOLD');
  const activeAuctions = (auctions || []).filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED');
  const designerAuctions = isDesigner 
    ? (auctions || []).filter(a => a.designer_id === user.id)
    : [];

  const collectorStats = {
    totalBids: 0, // Would come from a bids query
    activeBids: 0,
    acquisitions: soldAuctions.length,
    watching: activeAuctions.length,
  };

  const designerStats = {
    totalPieces: designerAuctions.length,
    activePieces: designerAuctions.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').length,
    soldPieces: designerAuctions.filter(a => a.status === 'SOLD').length,
    totalRevenue: designerAuctions.filter(a => a.status === 'SOLD').reduce((acc, a) => acc + a.current_price, 0),
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-6">
        {/* Profile Header */}
        <div className="mb-12 opacity-0 animate-fade-up">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="heading-display text-3xl md:text-4xl mb-2">
                {profile?.display_name || 'The Vault'}
              </h1>
              <p className="ui-caption mb-2">
                Your personal sanctuary at ATELIER
              </p>
              <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                isDesigner 
                  ? 'bg-accent/20 text-accent' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isDesigner ? 'Designer' : 'Collector'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 opacity-0 animate-fade-up delay-100">
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
        <div className="opacity-0 animate-fade-up delay-200">
          {isDesigner ? (
            <Tabs defaultValue="portfolio" className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-8 h-auto pb-0">
                <TabsTrigger 
                  value="portfolio" 
                  className="ui-label data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent pb-3"
                >
                  Portfolio
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
                  Submit New
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="portfolio" className="pt-8">
                <ItemGrid items={designerAuctions} emptyText="No pieces in portfolio" isLoading={auctionsLoading} />
              </TabsContent>
              
              <TabsContent value="analytics" className="pt-8">
                <div className="text-center py-16 border border-dashed border-border rounded-sm">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="heading-editorial text-xl text-muted-foreground mb-2">Analytics Coming Soon</p>
                  <p className="ui-caption">Track your performance and revenue insights</p>
                </div>
              </TabsContent>
              
              <TabsContent value="submit" className="pt-8">
                <div className="text-center py-16 border border-dashed border-border rounded-sm">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="heading-editorial text-xl text-muted-foreground mb-2">Submit a New Piece</p>
                  <p className="ui-caption mb-6">Share your creation with collectors worldwide</p>
                  <button className="px-8 py-3 bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
                    <span className="ui-label">Begin Submission</span>
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs defaultValue="watching" className="w-full">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-8 h-auto pb-0">
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
              </TabsList>
              
              <TabsContent value="watching" className="pt-8">
                <ItemGrid items={activeAuctions} emptyText="No live auctions" isLoading={auctionsLoading} />
              </TabsContent>
              
              <TabsContent value="acquisitions" className="pt-8">
                <ItemGrid items={soldAuctions} emptyText="No acquisitions yet" isLoading={auctionsLoading} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
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
}

const ItemGrid = ({ items, emptyText, isLoading }: ItemGridProps) => {
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
        <Link to="/floor" className="ui-label text-accent hover:text-accent/80 mt-4 inline-block">
          Browse The Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link
          key={item.id}
          to={`/piece/${item.id}`}
          className="group bg-card border border-border rounded-sm overflow-hidden hover:border-accent transition-colors duration-300"
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
      ))}
    </div>
  );
};

export default Vault;
