'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeleteAuction } from '@/hooks/useAuctions';
import { Loader2, Zap, Shield, Activity, Share2, CornerRightDown, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import CommunityChat from '@/components/CommunityChat';

interface ProposedItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  signals_count: number;
  created_at: string;
  designer_id: string;
  status: 'PROPOSED';
}

export default function IntelLobby() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  
  const isAdmin = profile?.role === 'admin';
  const deleteAuction = useDeleteAuction(isAdmin);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['proposed-intel'],
    queryFn: async () => {
      if (!supabase) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('auctions')
        .select('*')
        .eq('status', 'PROPOSED')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProposedItem[];
    },
    refetchInterval: 10000,
  });

  const { data: userSignals = [] } = useQuery({
    queryKey: ['user-signals', user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('interest_signals')
        .select('auction_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(s => s.auction_id);
    },
    enabled: !!user,
  });

  // --- Real-time Data Synchronization ---
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('intel-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auctions',
        },
        () => {
          // Invalidate and refetch when any auction changes (e.g. signal_count increments)
          queryClient.invalidateQueries({ queryKey: ['proposed-intel'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // ACCESS RESTRICTED TO FULLY AUTHORIZED NODES ONLY (REMOVED REDIRECT)
  // We'll allow them to see the frequency, but buttons are locked if waitlisted.
  useEffect(() => {
    // Redirection removed to allow nodes to see the discourse.
  }, [profile, router]);

  const signalInterest = useMutation({
    mutationFn: async (auctionId: string) => {
      if (!supabase || !user) throw new Error('Authentication required');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/intel/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ 
          auctionId,
          refreshToken: session?.refresh_token 
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Server processing error');
      }
      return auctionId;
    },
    onSuccess: (id) => {
      toast.success('Interest recorded. Trending up.');
      // Success triggers immediate invalidation, but Realtime handles other clients
      queryClient.invalidateQueries({ queryKey: ['proposed-intel'] });
      queryClient.invalidateQueries({ queryKey: ['user-signals'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error recording interest. Try again.');
    }
  });

  return (
    <>
    <div className="min-h-screen bg-background text-foreground font-mono pt-24 pb-16 overflow-hidden relative">
      {/* Background Matrix Effect (Subtle) */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none">
        <div className="h-full w-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Waitlist Welcome Banner */}
        {profile?.is_waitlisted && profile.role !== 'admin' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-6 bg-accent/5 border border-accent/20 rounded-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="ui-label text-[10px] text-accent uppercase tracking-widest">Waitlist Active</span>
            </div>
            <p className="ui-caption text-sm text-muted-foreground leading-relaxed font-medium">
              Your collector application is under manual review. While you wait, explore community proposals and signal your demand to drive the next unlock.
            </p>
          </motion.div>
        )}

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16 border-b border-white/10 pb-10">
          <div className="space-y-3">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none"
            >
              COMMUNITY HUB
            </motion.h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-widest font-bold opacity-70">
              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-accent" /> Status: Online</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-accent" /> Verified Members</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Live Updates</span>
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-4">
            <div className="flex flex-col items-start lg:items-end opacity-50">
              <span className="text-[10px] font-black tracking-widest uppercase">ID: {user?.id.substring(0, 12)}</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter">ACCESS_CLEARED</span>
            </div>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => setShowGlobalChat(!showGlobalChat)}
              className={`w-full sm:w-auto text-[11px] font-black uppercase tracking-[0.2em] px-8 h-14 border-accent/20 hover:border-accent transition-all duration-500 relative group overflow-hidden ${
                showGlobalChat ? 'bg-accent text-accent-foreground' : 'bg-black/40 backdrop-blur-md'
              }`}
            >
              <div className="absolute inset-0 bg-accent/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center justify-center gap-3">
                <MessageSquare className={`w-4 h-4 ${showGlobalChat ? 'text-accent-foreground' : 'text-accent'}`} />
                {showGlobalChat ? 'Close Chat' : 'Member Discussion'}
              </div>
            </Button>
          </div>
        </div>

        {/* Status Grid - Optimized for all screens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {[
            { label: 'Proposed Pieces', value: items.length, icon: Activity },
            { label: 'Market Interest', value: 'OPTIMAL', icon: Zap },
            { label: 'Security Health', value: '100%', icon: Shield },
            { label: 'Community Status', value: 'ONLINE', icon: Activity, pulse: true }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-5 border border-white/5 bg-white/[0.02] backdrop-blur-sm group hover:bg-white/[0.05] transition-colors"
            >
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                <stat.icon className="w-3 h-3 text-accent/50" /> {stat.label}
              </p>
              <div className="flex items-center gap-2">
                {stat.pulse && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                <p className={`text-xl sm:text-2xl font-black tracking-tighter ${stat.pulse ? 'text-emerald-500' : 'text-foreground group-hover:text-accent transition-colors'}`}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The Hub Feed */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-[10px] text-accent/50 uppercase tracking-[0.3em] font-black animate-pulse">Loading Discussions...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-white/10 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">No discussions yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {items.map((item, index) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group flex flex-col h-full border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 hover:shadow-[0_0_40px_-5px_rgba(var(--accent),0.1)]"
              >
                {/* Visual Glitch Header */}
                <div className="h-0.5 w-full bg-accent/20 group-hover:bg-accent/50 transition-colors" />

                {/* Content */}
                <div className="aspect-[4/5] relative overflow-hidden bg-black/40">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm('Delete proposed piece?')) {
                          deleteAuction.mutate(item.id);
                        }
                      }}
                      className="absolute top-4 left-4 z-10 w-8 h-8 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Proposal (Admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {item.images?.[0] ? (
                    <Image 
                      src={item.images[0]} 
                      alt="" 
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover p-6 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Share2 className="w-12 h-12 text-white/5" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 tracking-tighter uppercase">DEMAND: HIGH</span>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-1 gap-6">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-black uppercase tracking-tighter leading-tight group-hover:text-accent transition-colors">{item.title}</h3>
                      <span className="text-[10px] text-accent font-black opacity-30 mt-1">v.04</span>
                    </div>
                    <div className="text-[9px] font-black text-accent uppercase tracking-widest opacity-80 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Member ID: {item.designer_id.substring(0, 8)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity flex-1 font-medium">
                    {item.description}
                  </p>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Interest Level
                      </span>
                      <span className="text-accent">{item.signals_count}/3 Required</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className={`flex-1 h-12 uppercase tracking-widest text-[11px] font-black transition-all ${
                          userSignals.includes(item.id) 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                            : 'bg-white/[0.05] border-white/10 hover:bg-accent hover:text-accent-foreground hover:border-accent'
                        }`}
                        onClick={() => signalInterest.mutate(item.id)}
                        disabled={signalInterest.isPending || userSignals.includes(item.id)}
                      >
                        {signalInterest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                         userSignals.includes(item.id) ? 'Interest Noted' : 'Support Piece'}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className={`w-12 h-12 border-white/10 transition-all ${activeChatId === item.id ? 'bg-accent text-accent-foreground border-accent' : 'bg-white/[0.05] hover:border-accent hover:text-accent'}`}
                        onClick={() => setActiveChatId(activeChatId === item.id ? null : item.id)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline Discussion Expansion */}
                  <AnimatePresence>
                    {activeChatId === item.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 400, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 border-t border-white/10 pt-4 overflow-hidden"
                      >
                        <CommunityChat auctionId={item.id} title={`Discussion: ${item.title.substring(0, 8)}`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-24 text-center border-t border-white/10 pt-12 pb-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-50">
            End of Community Proposals
          </p>
        </div>
      </div>

      <style jsx global>{`

        @keyframes flicker-item {
          from { opacity: 0; filter: blur(4px); transform: translateY(10px); }
          to { opacity: 1; filter: blur(0px); transform: translateY(0px); }
        }
        .flicker-item {
          opacity: 0;
          animation: flicker-item 0.8s ease-out forwards;
        }
        @keyframes glitch-line {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-glitch-line {
          animation: glitch-line 4s linear infinite;
        }
      `}</style>
    </div>

    {/* Community side drawer */}
    <AnimatePresence>
      {showGlobalChat && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-[100dvh] w-full md:w-[450px] z-[60] shadow-2xl border-l border-white/5"
        >
          <div className="absolute left-0 top-1/2 -translate-x-full md:block hidden">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowGlobalChat(false)}
              className="bg-black/80 border-white/10 text-white hover:text-accent group h-24 rounded-l-md rounded-r-none px-1"
            >
              <CornerRightDown className="w-4 h-4 rotate-90 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <CommunityChat title="COMMUNITY DISCUSSION" onClose={() => setShowGlobalChat(false)} />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
