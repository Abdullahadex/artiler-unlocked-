import { createClient } from '@/integrations/supabase/server';
import { ShieldCheck, Award, Lock, Fingerprint, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 3600; // Cache for an hour

interface AuditLog {
  id: string;
  old_status: string | null;
  new_status: string;
  recorded_at: string;
}

/**
 * [PROTOCOL_V6.0]: Cryptographic Provenance Portal
 * The digital-to-physical bridge for luxury unboxing.
 */
export default async function ProvenancePage({ params }: { params: Promise<{ hash: string }> }) {
  const supabase = await createClient();
  const { hash } = await params;

  if (!supabase) {
    notFound();
  }

  // 1. Fetch Item by Provenance Hash
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: auction, error } = await (supabase as any)
    .from('auctions')
    .select('*')
    .eq('provenance_hash', hash)
    .single();

  if (error || !auction) {
    notFound();
  }

  // 2. Fetch Audit Logs separately to avoid deep type recursion in build
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawLogs } = await (supabase as any)
    .from('warehouse_audit_logs')
    .select('*')
    .eq('auction_id', auction.id);

  const logs = (rawLogs as AuditLog[]) || [];

  const creationDate = new Date(auction.created_at).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });


  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 sm:p-12 font-serif">
      {/* Visual background texture */}
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-xl space-y-12 relative z-10 opacity-0 animate-fade-up">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-150" />
              <div className="relative border border-accent/30 p-8 rounded-full bg-black/40 backdrop-blur-md">
                <ShieldCheck className="w-16 h-16 text-accent" strokeWidth={1} />
              </div>
            </div>
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl tracking-widest uppercase">
            PROVENANCE_CERTIFICATE
          </h1>
          <p className="ui-label text-accent/60 tracking-[0.3em] text-[10px] uppercase">
            Protocol Verified • Warehouse Secured
          </p>
        </div>

        {/* Certificate Body */}
        <div className="border border-accent/20 bg-black/40 backdrop-blur-xl p-8 sm:p-12 space-y-10 relative overflow-hidden group">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-accent/40" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-accent/40" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-accent/40" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-accent/40" />

          {/* Item Details */}
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="ui-label text-accent opacity-50 text-[10px] uppercase tracking-widest">Masterpiece Title</span>
              <h2 className="text-2xl sm:text-3xl text-foreground">{auction.title}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/5">
              <div className="space-y-1">
                <span className="ui-label text-accent opacity-50 text-[10px] uppercase tracking-widest">Protocol Date</span>
                <p className="text-sm">{creationDate}</p>
              </div>
              <div className="space-y-1">
                <span className="ui-label text-accent opacity-50 text-[10px] uppercase tracking-widest">Fulfillment State</span>
                <p className="text-sm uppercase tracking-tighter font-mono">{auction.status}</p>
              </div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="space-y-6 pt-8 border-t border-white/5">
            <h3 className="ui-label text-accent text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Warehouse Audit Ledger
            </h3>
            <div className="space-y-6">
              {logs.length > 0 ? (
                logs.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).map((log, idx) => (
                  <div key={log.id} className="flex gap-4 items-start group/log">
                    <div className="pt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/40 group-hover/log:bg-accent transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-white/90 uppercase tracking-tight">
                        Status Transition: <span className="text-accent">{log.old_status || 'INTAKE'}</span> 
                        <ArrowRight className="inline w-3 h-3 mx-2 opacity-40" /> 
                        <span className="text-accent">{log.new_status}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(log.recorded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">Verification protocols active. Audit trail initiated.</p>
              )}
            </div>
          </div>

          {/* Cryptographic Footprint */}
          <div className="pt-8 opacity-40 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/5 p-4 flex flex-col items-center gap-3">
              <Fingerprint className="w-5 h-5 text-accent" strokeWidth={1} />
              <p className="text-[9px] font-mono text-center break-all leading-relaxed uppercase">
                NODE_HASH: {hash}
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="text-center pt-8">
          <Link href="/floor">
            <button className="ui-label text-accent text-xs tracking-widest border-b border-accent/20 pb-1 hover:border-accent transition-all">
              RETURN_TO_THE_FLOOR
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
