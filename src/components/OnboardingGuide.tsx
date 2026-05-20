'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Activity, Package, HelpCircle, Vault, Unlock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const hasSeen = localStorage.getItem(`atelier_onboarding_${user.id}`);
      if (!hasSeen) {
        // slight delay so it doesn't jump scare them immediately on load
        const timer = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`atelier_onboarding_${user.id}`, 'true');
    }
    setOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-2 text-muted-foreground hover:text-accent transition-colors rounded-full hover:bg-muted/50 hidden md:flex items-center justify-center group"
        title="System Guide"
      >
        <HelpCircle className="w-5 h-5 opacity-50 group-hover:opacity-100" />
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-serif text-2xl tracking-tight">Welcome to the Archive</DialogTitle>
            <DialogDescription className="ui-caption text-sm mt-2">
              Atelier Unlocked uses unique terminology to maintain a secure and curated environment. Here is how the system works.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="flex gap-4">
              <div className="mt-1 bg-muted p-2 rounded-sm h-fit">
                <Package className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="ui-label font-bold text-foreground">The Floor</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The live marketplace. This is where fully verified and community-approved pieces are available for acquisition (bidding).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-muted p-2 rounded-sm h-fit">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="ui-label font-bold text-foreground">Community Hub</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The staging ground. Designers submit "Proposed Intel" here. Items cannot be bought yet; they must be evaluated by the community first.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-muted p-2 rounded-sm h-fit">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h4 className="ui-label font-bold text-foreground">Interest Signals</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Community upvotes. If a piece in the Community Hub receives enough signals, the system unlocks it and moves it to The Floor.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-muted p-2 rounded-sm h-fit">
                <Vault className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="ui-label font-bold text-foreground">The Vault</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The private workspace for verified creators to build their portfolios and submit items for pre-launch review.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 bg-muted p-2 rounded-sm h-fit">
                <Unlock className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="ui-label font-bold text-foreground">Unlocked vs Locked</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <strong>Locked:</strong> An item is actively accepting bids on The Floor. <strong>Unlocked:</strong> The auction has concluded and a winner is determined.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleClose} className="bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-widest text-[10px] font-bold">
              Acknowledge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
