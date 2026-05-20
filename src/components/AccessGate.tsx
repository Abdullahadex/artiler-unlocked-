'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, Fingerprint, Lock, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccessGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, termsAccepted, acceptTerms } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);

  if (loading || !user || termsAccepted) {
    return <>{children}</>;
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const { error } = await acceptTerms();
      if (error) {
        console.error('[ACCESS_GATE]: Failed to synchronize agreement:', error);
      }
    } catch (error) {
      console.error('[ACCESS_GATE]: System error:', error);
    } finally {
      setIsAccepting(false);
    }
  };


  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none">{children}</div>
      
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-2xl bg-card border border-accent/30 p-8 md:p-12 shadow-2xl relative overflow-hidden"
          >
            {/* Background Accents */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield className="w-32 h-32 text-accent" />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3 text-accent mb-6">
                <ShieldAlert className="w-6 h-6" />
                <h2 className="heading-display text-xl uppercase tracking-[0.2em]">Platform Terms & Agreement</h2>
              </div>

              <div className="space-y-6 font-mono text-sm leading-relaxed text-muted-foreground uppercase h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                <section className="space-y-2">
                  <p className="text-foreground font-bold">COMMUNITY POLICY</p>
                  <p>
                    By entering the platform, you agree to our community marketplace terms. 
                    Any attempt to move transactions off-platform results in immediate account suspension to ensure the security of our community.
                  </p>
                </section>

                <section className="space-y-2">
                  <p className="text-foreground font-bold">ASSET AUTHENTICITY</p>
                  <p>
                    Sellers are committed to providing only authentic archive inventory. 
                    Any counterfeit items or deceptive behavior will result in a permanent ban from the network.
                  </p>
                </section>

                <section className="space-y-2">
                  <p className="text-foreground font-bold">SECURE SETTLEMENT</p>
                  <p>
                    Every acquisition is secured via our managed settlement service. 
                    Buyers must coordinate with a designated representative within 48 hours of winning a piece to finalize shipping and payment details.
                  </p>
                </section>

                <section className="space-y-2">
                  <p className="text-foreground font-bold">DATA PRIVACY</p>
                  <p>
                    We prioritize your privacy. All metadata and personal information associated with item uploads are protected to maintain the security of both buyers and sellers.
                  </p>
                </section>
                
                <section className="space-y-2 pt-4 border-t border-border/50">
                  <p className="text-accent font-bold tracking-widest text-[10px]">VERIFICATION REQUIRED</p>
                  <p className="text-[10px]">
                    BY AGREEING TO THESE TERMS, YOU COMMIT TO THE POLICIES OF THE ATELIER NETWORK.
                  </p>
                </section>
              </div>

              <div className="pt-8 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-border">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase group">
                  <Lock className="w-3 h-3 group-hover:text-accent transition-colors" />
                  <span>Secure System Connection</span>
                </div>
                
                <Button 
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-12 py-6 h-auto uppercase tracking-widest text-xs font-bold shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
                >
                  {isAccepting ? 'ACCEPTING...' : 'ACCEPT & ENTER PLATFORM'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
