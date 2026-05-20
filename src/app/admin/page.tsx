'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAuctions } from '@/hooks/useAuctions';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, Package, TrendingUp, BarChart3, RefreshCw, Download, CheckCircle, Clock, Fingerprint, Activity, Unlock, Shield, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/integrations/supabase/client';
import AccessGate from '@/components/AccessGate';
import type { Profile, Auction } from '@/types/database';

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: auctions, isLoading, refetch: refetchAuctions } = useAuctions();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [approvingUser, setApprovingUser] = useState<string | null>(null);
  const supabase = getSupabaseClient();

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
  });



  // Fetch waitlisted users
  const { data: waitlistedUsers, isLoading: waitlistLoading, refetch: refetchWaitlist } = useQuery({
    queryKey: ['admin-waitlist'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_waitlisted', true)
        .neq('role', 'admin')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.role === 'admin',
  });

  // Fetch pending sellers
  const { data: pendingSellers, refetch: refetchSellers } = useQuery({
    queryKey: ['admin-pending-sellers'],
    queryFn: async () => {
      if (!supabase) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .in('seller_status', ['PENDING', 'APPROVED'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.role === 'admin',
  });

  // Fetch proposed intel
  const { data: proposedIntel, refetch: refetchIntel } = useQuery({
    queryKey: ['admin-proposed-intel'],
    queryFn: async () => {
      if (!supabase) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('auctions')
        .select('*')
        .eq('status', 'PROPOSED')
        .order('signals_count', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.role === 'admin',
  });

  // Fetch chat messages for moderation
  const { data: chatMessages, refetch: refetchChat } = useQuery({
    queryKey: ['admin-chat-moderation'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('protocol_discourse')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.role === 'admin',
  });

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) return;

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in.');
        return;
      }

      const res = await fetch('/api/admin/intel/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ messageId, action: 'delete_message' })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to suppress signal');

      toast.success('Community contribution removed.');
      refetchChat();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove contribution';
      toast.error(msg);
    }
  };

  // Fetch audit logs
  const { data: auditLogs, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('warehouse_audit_logs')
        .select(`
          *,
          auction:auctions(title)
        `)
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.role === 'admin',
  });

  // --- Real-time Admin Synchronization Protocol ---
  useEffect(() => {
    if (!supabase || profile?.role !== 'admin') return;

    const channel = supabase
      .channel('admin-global-sync')
      // Listen to profile changes (Waitlist & Seller Status)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
          queryClient.invalidateQueries({ queryKey: ['admin-pending-sellers'] });
          queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
        }
      )
      // Listen to auction changes (Intel Signals & New items)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-proposed-intel'] });
          queryClient.invalidateQueries({ queryKey: ['auctions'] });
          queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
        }
      )
      // Listen to audit changes (Warehouse Oversight)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'warehouse_audit_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
        }
      )
      // Listen to bid activity (Revenue & Bidding Analytics)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
          queryClient.invalidateQueries({ queryKey: ['auctions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profile, queryClient]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || profile?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, profile, router, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <p className="ui-label text-muted-foreground">Loading...</p>
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
    waitlistedCount: waitlistedUsers?.length || 0,
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchAuctions(), refetchAnalytics(), refetchWaitlist(), refetchSellers(), refetchIntel(), refetchChat()]);
      toast.success('Data updated');
    } catch {
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
    } catch {
      toast.error('Failed to export data');
    }
  };

  const handleApproveUser = async (userId: string, displayName: string) => {
    setApprovingUser(userId);
    try {
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        toast.error('Database unavailable');
        return;
      }

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in.');
        return;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId, action: 'approve_user' })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to approve user');

      toast.success(`${displayName || 'User'} approved — they now have full access.`);
      await refetchWaitlist();
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve user';
      toast.error(msg);
    } finally {
      setApprovingUser(null);
    }
  };


  const handleAuthorizeSeller = async (userId: string, approve: boolean) => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in.');
        return;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          userId, 
          action: approve ? 'authorize_seller' : 'slash_seller' 
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update seller status');

      toast.success(approve ? 'Seller authorized for publication.' : 'Seller privileges revoked.');
      refetchSellers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update seller status';
      toast.error(msg);
    }
  };

  const ensureUrlScheme = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    // Handle simple handles (e.g., instagram.com/user) vs just 'user'
    if (trimmed.includes('.') || trimmed.includes('/')) return `https://${trimmed}`;
    // Default to a search or assume it's a domain-less handle (risky, but better than nothing)
    return `https://${trimmed}`;
  };

  const handleUpdateFulfillment = async (auctionId: string, status: string) => {
    try {
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) return;

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in.');
        return;
      }

      const res = await fetch('/api/admin/auctions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ auctionId, action: 'update_fulfillment', status })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update fulfillment');

      toast.success('Fulfillment status updated.');
      refetchAuctions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update fulfillment';
      toast.error(msg);
    }
  };

  const handleRevokeSeller = async (sellerId: string) => {
    await handleAuthorizeSeller(sellerId, false);
  };


  const getHandshakeProofUrl = async (path: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase.storage.from('handshake-proofs').createSignedUrl(path, 300);
    if (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

  const handleExecuteUnlock = async (auctionId: string) => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in.');
        return;
      }

      const priorityUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/admin/auctions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          auctionId, 
          action: 'unlock_auction',
          priorityUntil
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to unlock auction');

      toast.success('Piece published to Market. 24h Priority window active.');
      refetchIntel();
      refetchAuctions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unlock auction';
      toast.error(msg);
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

        {/* Stats Grid - TODO: refactor this into a separate component, it's getting huge */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-8">
          <div className="p-5 bg-card border border-border rounded-sm">
            <Package className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Auctions</p>
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
            <p className="ui-label text-muted-foreground mb-1">Users</p>
            <p className="heading-display text-2xl">{stats.totalUsers}</p>
          </div>
          <div className="p-5 bg-card border border-border rounded-sm">
            <BarChart3 className="w-5 h-5 mb-3 text-muted-foreground" />
            <p className="ui-label text-muted-foreground mb-1">Bids</p>
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
          <div className="p-5 bg-card border border-accent/30 rounded-sm">
            <Clock className="w-5 h-5 mb-3 text-accent" />
            <p className="ui-label text-muted-foreground mb-1">Waitlisted</p>
            <p className="heading-display text-2xl text-accent">{stats.waitlistedCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 border border-border h-auto flex-wrap">
            <TabsTrigger value="overview" className="uppercase text-[10px] tracking-widest">Overview</TabsTrigger>
            <TabsTrigger value="waitlist" className="uppercase text-[10px] tracking-widest">
              Waitlist
              {stats.waitlistedCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-accent text-accent-foreground rounded-full">
                  {stats.waitlistedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sellers" className="uppercase text-[10px] tracking-widest">
              Designers
              {pendingSellers?.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-accent text-accent-foreground rounded-full">
                  {pendingSellers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="community" className="uppercase text-[10px] tracking-widest">
              Proposed Items
              {proposedIntel?.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-accent text-accent-foreground rounded-full">
                  {proposedIntel.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="auctions" className="uppercase text-[10px] tracking-widest">Active Auctions</TabsTrigger>
            <TabsTrigger value="sales" className="uppercase text-[10px] tracking-widest">Sales & Orders</TabsTrigger>
            <TabsTrigger value="audit" className="uppercase text-[10px] tracking-widest">Activity Logs</TabsTrigger>
            <TabsTrigger value="analytics" className="uppercase text-[10px] tracking-widest">Analytics</TabsTrigger>
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
                  <Button variant="outline" className="w-full justify-start" onClick={() => setSelectedTab('auctions')}>
                    <Package className="w-4 h-4 mr-2" />
                    Manage Auctions
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setSelectedTab('waitlist')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Review Waitlist
                    {stats.waitlistedCount > 0 && (
                      <span className="ml-auto text-xs text-accent">{stats.waitlistedCount} pending</span>
                    )}
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setSelectedTab('analytics')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sellers" className="pt-8 space-y-4">
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold uppercase tracking-tight">Pending Seller Applications</h2>
              </div>
              <div className="divide-y divide-border">
                {!pendingSellers || pendingSellers.filter(s => s.seller_status === 'PENDING').length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground uppercase text-xs italic">
                    No pending applications detected.
                  </div>
                ) : (
                  (pendingSellers as Profile[]).filter(s => s.seller_status === 'PENDING').map((seller) => (
                    <div key={seller.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <p className="font-bold text-lg leading-none">{seller.display_name || 'Anonymous User'}</p>
                        <p className="text-xs text-muted-foreground font-mono">[USER_{seller.id.substring(0, 8)}]</p>
                        <div className="flex gap-4 mt-2">
                          <div className="px-2 py-1 bg-accent/10 border border-accent/20 rounded text-[10px] font-bold text-accent">
                            CODE: {seller.handshake_code}
                          </div>
                          {seller.archive_portfolio ? (
                            <a 
                              href={ensureUrlScheme(seller.archive_portfolio)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              VIEW_PORTFOLIO <Download className="w-2 h-2" />
                            </a>
                          ) : (
                            <span className="text-[10px] flex items-center gap-1 text-muted-foreground/50 italic">
                              NO_PORTFOLIO_LINK
                            </span>
                          )}

                          {seller.proof_of_archive_url && (
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] h-auto p-0 flex items-center gap-1 text-accent hover:text-accent/80"
                               onClick={async () => {
                                 const url = await getHandshakeProofUrl(seller.proof_of_archive_url!);
                                 if (url) {
                                   window.open(url, '_blank');
                                 } else {
                                   toast.error('Failed to generate secure access link');
                                 }
                               }}
                            >
                              VIEW_IDENTITY_PROOF <Fingerprint className="w-2 h-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleAuthorizeSeller(seller.id, true)}
                          variant="outline" 
                          size="sm" 
                          className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground"
                        >
                          Approve Application
                        </Button>
                        <Button 
                          onClick={() => handleAuthorizeSeller(seller.id, false)}
                          variant="outline" 
                          size="sm" 
                          className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-sm overflow-hidden mt-8">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold uppercase tracking-tight text-emerald-500">Verified Sellers</h2>
              </div>
              <div className="divide-y divide-border">
                {!pendingSellers || pendingSellers.filter(s => s.seller_status === 'APPROVED').length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground uppercase text-xs italic">
                    No active sellers.
                  </div>
                ) : (
                  (pendingSellers as Profile[]).filter(s => s.seller_status === 'APPROVED').map((seller) => (
                    <div key={seller.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <p className="font-bold text-lg leading-none">{seller.display_name || 'Anonymous User'}</p>
                        <p className="text-xs text-muted-foreground font-mono">[USER_{seller.id.substring(0, 8)}]</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Authorized</span>
                          </div>
                          <div className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-[9px] font-bold text-accent uppercase tracking-widest">
                            Reputation: {seller.reputation_score || 0}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button 
                          onClick={() => handleRevokeSeller(seller.id)}
                          variant="outline" 
                          size="sm" 
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground group relative overflow-hidden"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <Zap className="w-3 h-3 group-hover:animate-pulse" />
                            REVOKE ACCESS [MEMBER_LOCK]
                          </span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="community" className="pt-8 space-y-4">
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold uppercase tracking-tight">Proposed Items (Community Voting)</h2>
              </div>
              <div className="divide-y divide-border">
                {!proposedIntel || proposedIntel.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground uppercase text-xs italic">
                    No active items in the queue.
                  </div>
                ) : (
                  (proposedIntel as Auction[]).map((item) => (
                    <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                          {item.images?.[0] && <img src={item.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-lg leading-none">{item.title}</p>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Community Evaluation Phase</p>
                          <div className="flex gap-3 mt-2">
                            <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                              INTEREST: {item.signals_count}
                            </div>
                            <div className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-[10px] font-bold text-accent uppercase tracking-widest">
                              REPUTATION_WEIGHT: {(item.signals_count * 0.8).toFixed(1)}
                            </div>
                          </div>
                          <div className="mt-2 text-[9px] text-muted-foreground font-mono uppercase">
                            Analysis: High interest from collectors.
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleExecuteUnlock(item.id)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-widest text-[10px] h-9 px-6"
                      >
                        <Unlock className="w-3 h-3 mr-2" /> Publish to Hub
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-sm overflow-hidden mt-6">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold uppercase tracking-tight">Community Message Moderation</h2>
              </div>
              <div className="divide-y divide-border">
                {!chatMessages || chatMessages.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground uppercase text-xs italic">
                    No community activity detected.
                  </div>
                ) : (
                  (chatMessages as ChatMessage[]).map((msg) => (
                    <div key={msg.id} className="p-4 flex items-center justify-between gap-6 group hover:bg-muted/10 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-accent font-mono">[USER_{msg.user_id.substring(0, 8)}]</span>
                          <span className="text-[9px] text-muted-foreground opacity-50">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">{msg.content}</p>
                      </div>
                      <Button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        DELETE MESSAGE
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="auctions" className="pt-8">
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-bold uppercase tracking-tight">Active Floor Inventory</h2>
                </div>
                <span className="ui-label text-[10px] text-muted-foreground uppercase">{stats.activeAuctions} Items Active</span>
              </div>
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" /></div>
                ) : auctions?.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground uppercase text-xs italic">No active auctions on The Floor.</div>
                ) : (
                  auctions?.filter(a => a.status === 'LOCKED' || a.status === 'UNLOCKED').map((auction) => (
                    <div key={auction.id} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                          {auction.images?.[0] && <img src={auction.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{auction.title}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{auction.designer?.display_name || 'Anonymous'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">€{auction.current_price.toLocaleString()}</p>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${auction.status === 'UNLOCKED' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                          {auction.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="pt-8">
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold uppercase tracking-tight">Completed Sales & Fulfillment</h2>
                </div>
                <span className="ui-label text-[10px] text-muted-foreground uppercase">{stats.soldAuctions} Pieces Sold</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="px-6 py-3 font-bold">Item</th>
                      <th className="px-6 py-3 font-bold">Designer</th>
                      <th className="px-6 py-3 font-bold">Winner</th>
                      <th className="px-6 py-3 font-bold">Price</th>
                      <th className="px-6 py-3 font-bold">Status</th>
                      <th className="px-6 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {!auctions || auctions.filter(a => a.status === 'SOLD').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground uppercase text-xs italic">
                          No completed sales recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auctions.filter(a => a.status === 'SOLD').map((sale) => (
                        <tr key={sale.id} className="hover:bg-muted/5 transition-colors group text-xs">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                {sale.images?.[0] && <img src={sale.images[0]} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="font-bold truncate max-w-[150px]">{sale.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground uppercase tracking-tight">
                            {sale.designer?.display_name || 'Anonymous'}
                          </td>
                          <td className="px-6 py-4">
                            {sale.winner ? (
                              <div className="space-y-0.5">
                                <p className="font-bold">{sale.winner.display_name || 'Verified Member'}</p>
                                <p className="text-[9px] text-muted-foreground font-mono">[ID: {sale.winner.id.substring(0, 6)}]</p>
                              </div>
                            ) : sale.winner_id ? (
                              <div className="space-y-0.5">
                                <p className="font-bold text-muted-foreground">ID_RESOLVED</p>
                                <p className="text-[9px] text-muted-foreground font-mono">[ID: {sale.winner_id.substring(0, 6)}]</p>
                              </div>
                            ) : (
                              <span className="text-destructive italic opacity-50">Winner Data Missing</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold">€{sale.current_price.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${
                              sale.fulfillment_status === 'shipped' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              sale.fulfillment_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}>
                              {sale.fulfillment_status || 'PENDING_PAYMENT'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                               {sale.fulfillment_status === 'pending_payment' && (
                                 <Button 
                                   onClick={() => handleUpdateFulfillment(sale.id, 'paid')}
                                   variant="outline" size="sm" className="h-7 px-2 text-[9px] uppercase border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                 >
                                   Confirm Payment
                                 </Button>
                               )}
                               {(!sale.fulfillment_status || sale.fulfillment_status === 'paid') && (
                                 <Button 
                                   onClick={() => handleUpdateFulfillment(sale.id, 'shipped')}
                                   variant="outline" size="sm" className="h-7 px-2 text-[9px] uppercase border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white"
                                 >
                                   Mark Shipped
                                 </Button>
                               )}
                               {sale.fulfillment_status === 'shipped' && (
                                 <Button 
                                   onClick={() => handleUpdateFulfillment(sale.id, 'delivered')}
                                   variant="outline" size="sm" className="h-7 px-2 text-[9px] uppercase border-accent/30 text-accent hover:bg-accent hover:text-white"
                                 >
                                   Mark Delivered
                                 </Button>
                               )}
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="pt-8 space-y-4">
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold uppercase tracking-tight">Access & Activity Ledger (Live)</h2>
              </div>
              <div className="divide-y divide-border">
                {!auditLogs || auditLogs.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground uppercase text-xs italic">
                    No warehouse activity detected.
                  </div>
                ) : (
                  (auditLogs as Array<{
                    id: string;
                    auction_id: string;
                    old_status: string | null;
                    new_status: string;
                    recorded_at: string;
                    auction: { title: string } | null;
                  }>).map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs font-mono">
                      <div className="space-y-1">
                        <p className="font-bold flex items-center gap-2">
                          <span className="text-accent">[{log.auction?.title || 'Unknown Piece'}]</span>
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {log.old_status || 'INTAKE'} <ArrowRight className="inline w-3 h-3 mx-1" /> {log.new_status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">{new Date(log.recorded_at).toLocaleTimeString()}</p>
                        <p className="text-[9px] opacity-30">{log.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="waitlist" className="pt-8">
            <div className="mb-6">
              <h2 className="heading-display text-2xl mb-2">Waitlisted Users</h2>
              <p className="ui-caption text-muted-foreground">
                Approve users to give them full access to The Floor. They can already upload pieces from their vault.
              </p>
            </div>

            {waitlistLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : waitlistedUsers && waitlistedUsers.length > 0 ? (
              <div className="space-y-4">
                {waitlistedUsers.map((wu: {
                  id: string;
                  display_name: string | null;
                  role: string;
                  created_at: string;
                  bio: string | null;
                }) => (
                  <div key={wu.id} className="p-5 bg-card border border-border rounded-sm flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-serif text-lg">{wu.display_name || 'Unnamed User'}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ui-label ${
                          wu.role === 'designer'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {wu.role}
                        </span>
                      </div>
                      <p className="ui-caption text-muted-foreground text-sm">
                        Joined {new Date(wu.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      {wu.bio && (
                        <p className="ui-caption text-sm mt-1 text-muted-foreground line-clamp-1">{wu.bio}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleApproveUser(wu.id, wu.display_name || 'User')}
                      disabled={approvingUser === wu.id}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approvingUser === wu.id ? 'Approving...' : 'Approve User'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-sm">
                <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <p className="heading-editorial text-xl text-muted-foreground mb-2">All clear</p>
                <p className="ui-caption">No users currently on the waitlist.</p>
              </div>
            )}
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
                            <span className="ui-caption">{event.replace(/_/g, ' ')}</span>
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
