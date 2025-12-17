'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAuctions } from '@/hooks/useAuctions';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, Package, TrendingUp, AlertCircle, Download, RefreshCw, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: auctions, isLoading, refetch: refetchAuctions } = useAuctions();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Refresh profile on mount to ensure we have the latest role
  useEffect(() => {
    if (user && !authLoading) {
      refreshProfile();
    }
  }, [user, authLoading, refreshProfile]);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/dashboard');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch analytics');
      }
      return res.json();
    },
    enabled: !!user && profile?.role === 'admin',
    refetchInterval: 30000,
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking role
    if (!authLoading) {
    if (!user || profile?.role !== 'admin') {
      router.push('/');
    }
    }
  }, [user, profile, router, authLoading]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <p className="ui-label text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return null;
  }

  const stats = {
    totalAuctions: auctions?.length || 0,
    activeAuctions: auctions?.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').length || 0,
    soldAuctions: auctions?.filter(a => a.status === 'SOLD').length || 0,
    totalRevenue: auctions?.filter(a => a.status === 'SOLD').reduce((acc, a) => acc + a.current_price, 0) || 0,
    totalUsers: analytics?.totalUsers || 0,
    totalBids: analytics?.totalBids || 0,
    conversionRate: analytics?.conversionRate || '0',
    averageBidAmount: analytics?.averageBidAmount || 0,
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchAuctions(),
        refetchAnalytics(),
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const exportData = (type: 'auctions' | 'users' | 'bids') => {
    try {
      let data: unknown[] = [];
      let filename = '';

      if (type === 'auctions') {
        data = (auctions || []) as unknown[];
        filename = 'auctions.json';
      } else if (type === 'users') {
        data = (analytics?.users || []) as unknown[];
        filename = 'users.json';
      } else if (type === 'bids') {
        data = (analytics?.bids || []) as unknown[];
        filename = 'bids.json';
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${type} data`);
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'auctions':
        setSelectedTab('auctions');
        break;
      case 'users':
        setSelectedTab('users');
        break;
      case 'analytics':
        setSelectedTab('analytics');
        break;
      default:
        toast.info(`${action} feature coming soon`);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="heading-display text-4xl">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading || analyticsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading || analyticsLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportData('auctions')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="p-5 bg-card border border-border rounded-sm">
            <Package className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Total Auctions</p>
            <p className="heading-display text-2xl">{stats.totalAuctions}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <TrendingUp className="w-5 h-5 mb-3 text-accent" />
            <p className="ui-label text-muted-foreground mb-1">Active</p>
            <p className="heading-display text-2xl text-accent">{stats.activeAuctions}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <Users className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Sold</p>
            <p className="heading-display text-2xl">{stats.soldAuctions}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <TrendingUp className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Revenue</p>
            <p className="heading-display text-2xl">€{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <Users className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Total Users</p>
            <p className="heading-display text-2xl">{stats.totalUsers}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <BarChart3 className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Total Bids</p>
            <p className="heading-display text-2xl">{stats.totalBids}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <TrendingUp className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Conversion</p>
            <p className="heading-display text-2xl">{stats.conversionRate}%</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <BarChart3 className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Avg Bid</p>
            <p className="heading-display text-2xl">€{stats.averageBidAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="auctions">Auctions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-card border border-border rounded-sm">
                <h3 className="heading-display text-xl mb-4">Recent Activity</h3>
                {analyticsLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="space-y-3">
                    {analytics?.events?.slice(0, 5).map((event: { event_name: string; created_at: string }, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-border">
                        <span className="ui-label">{event.event_name}</span>
                        <span className="ui-caption text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 bg-card border border-border rounded-sm">
                <h3 className="heading-display text-xl mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('auctions')}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Manage Auctions
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('users')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('analytics')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="auctions" className="pt-8">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {auctions?.map((auction) => (
                  <div key={auction.id} className="p-4 bg-card border border-border rounded-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-serif text-lg">{auction.title}</h3>
                        <p className="ui-caption">{auction.designer?.display_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif">€{auction.current_price.toLocaleString()}</p>
                        <span className="ui-label text-xs">{auction.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="pt-8">
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="heading-editorial text-xl text-muted-foreground">User Management Coming Soon</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="pt-8">
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-6 bg-card border border-border rounded-sm">
                  <p className="ui-label text-muted-foreground mb-2">Top Events</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-24" />
                  ) : (
                    <div className="space-y-2">
                      {['bid_placed', 'auction_viewed', 'user_signed_up'].map((event) => {
                        const count = analytics?.events?.filter((e: { event_name: string }) => e.event_name === event).length || 0;
                        return (
                          <div key={event} className="flex justify-between">
                            <span className="ui-caption">{event.replace('_', ' ')}</span>
                            <span className="ui-label">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="p-6 bg-card border border-border rounded-sm">
                  <p className="ui-label text-muted-foreground mb-2">Performance</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-24" />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="ui-caption">Conversion Rate</span>
                        <span className="ui-label">{stats.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="ui-caption">Avg Bid Amount</span>
                        <span className="ui-label">€{stats.averageBidAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6 bg-card border border-border rounded-sm">
                  <p className="ui-label text-muted-foreground mb-2">Activity</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-24" />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="ui-caption">Total Events</span>
                        <span className="ui-label">{analytics?.events?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="ui-caption">Last 24h</span>
                        <span className="ui-label">
                          {analytics?.events?.filter((e: { created_at: string }) => {
                            const eventTime = new Date(e.created_at);
                            const dayAgo = new Date(Date.now() - 86400000);
                            return eventTime > dayAgo;
                          }).length || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

