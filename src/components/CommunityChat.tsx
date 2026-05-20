'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Shield, MessageSquare, Zap, Activity, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Protocol Safety: Communication Filtering Constants
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+(?:\s*\[at\]\s*|\s*@\s*|\s*at\s*)[a-zA-Z0-9.-]+\s*(\.\s*|\s*dot\s*)[a-zA-Z]{2,})|(\bemail\b|\bmail\b)/i;
const SOCIAL_REGEX = /(@[a-z0-9_.]+|ig:|insta|twitter|tiktok|snap|sc|snapchat|facebook|linkedin|tg:|tele|telegram|discord|tt:|\bsnap\b|\bhandle\b|\busername\b)/i;
const BLOCKED_PHRASES = [
  'whatsapp', 'telegram', 'paypal', 'cashapp', 'venmo', 'zelle',
  'dm me', 'message me', 'contact me', 'wire transfer', 'send me',
  'msg me', 'text me', 'call me', 'what is your', 'whats your', 'what is ur',
  'whats ur', 'your handle', 'ur handle', 'your email', 'ur email', 'your snap',
  'ur snap', 'your ig', 'ur ig', 'your insta', 'ur insta', 'ur number', 'your number',
  'ur #', 'your #', 'numb', 'dot com', 'dot net', 'at gmail', 'at yahoo',
  '@gmail', '@yahoo', '[at]', '(at)', 'dm:', 'ig:', 'sc:'
];

interface Message {
  id: string;
  content: string;
  createdAt: string;
  nodeId: string;
  displayName: string;
  reputation: number;
}

interface CommunityChatProps {
  auctionId?: string;
  title?: string;
  onClose?: () => void;
}


const ChatMessageItem = memo(({ msg, isCurrentUser }: { msg: Message, isCurrentUser: boolean }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`group relative p-2.5 rounded-lg transition-colors duration-300 ${isCurrentUser ? 'bg-accent/5 border border-accent/10' : 'hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className={`font-black text-[10px] tracking-tight uppercase px-1.5 py-0.5 rounded ${isCurrentUser ? 'bg-accent text-accent-foreground' : 'text-accent bg-accent/5 border border-accent/10 sm:bg-transparent sm:border-0 sm:p-0'}`}>
          {isCurrentUser ? 'YOU' : msg.displayName}
        </span>
        <span className="text-[9px] text-muted-foreground font-bold opacity-30">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {msg.reputation > 50 && (
          <Shield className="w-3 h-3 text-emerald-500 opacity-80" />
        )}
      </div>
      <p className={`text-[13px] leading-relaxed break-words font-medium pl-0 sm:pl-0 tracking-tight ${isCurrentUser ? 'text-foreground' : 'text-foreground/90'}`}>
        {msg.content}
      </p>
    </motion.div>
  );
});
ChatMessageItem.displayName = 'ChatMessageItem';

export default function CommunityChat({ auctionId, title = 'Community Feed', onClose }: CommunityChatProps) {
  const { user, profile, loading } = useAuth();
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['discourse', auctionId || 'global'],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      
      let query = supabase
        .from('protocol_discourse')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            display_name,
            reputation_score
          )
        `)
        .order('created_at', { ascending: true })
        .limit(50);

      if (auctionId) {
        query = query.eq('auction_id', auctionId);
      } else {
        query = query.is('auction_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      interface RawMessage {
        id: string;
        content: string | null;
        created_at: string;
        user_id: string | null;
        profiles: {
          display_name: string | null;
          reputation_score: number | null;
        } | null;
      }

      return (data as unknown as RawMessage[]).map((m) => {
        return {
          id: m.id,
          content: m.content || '',
          createdAt: m.created_at,
          nodeId: m.user_id?.substring(0, 4).toUpperCase() || 'USER',
          displayName: m.profiles?.display_name || `User_${m.user_id?.substring(0, 4).toUpperCase()}`,
          reputation: m.profiles?.reputation_score || 0
        };
      });
    },
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelId = `chat-sync-${auctionId || 'global'}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'protocol_discourse',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['discourse', auctionId || 'global'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) throw new Error('Authentication required');

      // 1. Email Obfuscation & Solicitations
      if (EMAIL_REGEX.test(content)) throw new Error('Communication restricted: Contact disclosure prohibited.');

      // 2. Phone / digits / obfuscated numbers
      const phoneDigits = content.replace(/\D/g, '');
      const hasObfuscatedPhone = /(\d[\s.-]*){8,}/.test(content);
      if (phoneDigits.length >= 8 || hasObfuscatedPhone) throw new Error('Communication restricted: Phone disclosure prohibited.');

      // 3. Social Media & handles
      if (SOCIAL_REGEX.test(content)) throw new Error('Communication restricted: Social recruitment prohibited.');

      // 4. Critical Blocked Keywords
      const contentLower = content.toLowerCase();
      if (BLOCKED_PHRASES.some(phrase => contentLower.includes(phrase))) {
        throw new Error('Communication restricted: Off-platform protocols detected.');
      }

      const { data, error } = await supabase
        .from('protocol_discourse')
        .insert({
          content: content.substring(0, 500),
          auction_id: auctionId || null,
          user_id: user.id
        })
        .select('id, content, created_at, user_id')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onMutate: async (content: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['discourse', auctionId || 'global'] });

      // Snapshot the previous messages
      const previousMessages = queryClient.getQueryData<Message[]>(['discourse', auctionId || 'global']);

      // Optimistically add the new message to the cache
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        content: content.substring(0, 500),
        createdAt: new Date().toISOString(),
        nodeId: user?.id?.substring(0, 4).toUpperCase() || 'USER',
        displayName: profile?.display_name || `User_${user?.id?.substring(0, 4).toUpperCase()}`,
        reputation: profile?.reputation_score || 0,
      };

      queryClient.setQueryData<Message[]>(
        ['discourse', auctionId || 'global'],
        (old) => [...(old || []), optimisticMessage]
      );

      // Clear the input immediately for snappy UX
      setMessage('');

      // Return context with the snapshotted value for rollback
      return { previousMessages };
    },
    onError: (err: Error, _content: string, context) => {
      // Roll back to the previous messages on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['discourse', auctionId || 'global'], context.previousMessages);
      }
      toast.error(err.message || 'Message delivery failed.');
    },
    onSettled: () => {
      // Sync with server state after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: ['discourse', auctionId || 'global'] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate(message);
  }, [message, sendMessage]);

  return (
    <div className="flex flex-col h-full bg-black/40 border-l border-white/5 font-mono text-xs overflow-hidden backdrop-blur-xl">
      {/* Header - Mobile Optimized Spacing/Size */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-accent">
            <Zap className="w-4 h-4" />
            <span className="font-black tracking-[0.15em] text-[11px] uppercase">{title}</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-bold">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="sm:hidden w-8 h-8 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Message Feed - Better Mobile Contrast & Spacing */}
      <div 
        ref={scrollRef}
        className="flex-1 p-5 overflow-y-auto space-y-6 scroll-smooth custom-scrollbar bg-gradient-to-b from-transparent to-black/20"
      >
        <AnimatePresence initial={false}>
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-[10px] tracking-[0.2em] font-bold">Connecting...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 gap-3">
              <MessageSquare className="w-6 h-6" />
              <span className="text-[10px] tracking-widest">No messages yet</span>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageItem 
                key={msg.id} 
                msg={msg} 
                isCurrentUser={msg.nodeId === user?.id?.substring(0, 4).toUpperCase()} 
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Message Input - Optimized for Mobile Typing Experience & Safe Areas */}
      <div className="p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:pb-5 border-t border-white/10 bg-black/95 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              id="community-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoComplete="off"
              placeholder={
                loading ? "Verifying..." :
                !user?.id ? "Sign in to chat" : 
                "Type a message..."
              }
              disabled={loading || !user?.id || sendMessage.isPending}
              className="bg-white/5 border-white/10 pl-4 text-base sm:text-[13px] h-12 sm:h-11 focus-visible:ring-accent/40 placeholder:text-white/20 rounded-lg transition-all"
            />
          </div>
          <Button 
            type="submit" 
            size="icon"
            disabled={loading || !user || !message.trim() || sendMessage.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 w-12 sm:h-11 sm:w-11 rounded-lg shadow-lg shadow-accent/10 flex-shrink-0"
          >
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        {!user?.id && !loading && (
          <div className="mt-3 text-center pb-2">
            <button 
              onClick={() => toast.info('Authentication Required')}
              className="text-[9px] text-accent uppercase tracking-[0.2em] font-black hover:opacity-80 transition-opacity"
            >
              Join the conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
