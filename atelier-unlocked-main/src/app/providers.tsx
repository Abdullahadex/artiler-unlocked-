'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRealtimeAuctions } from "@/hooks/useRealtimeAuctions";
import { PaymentProvider } from "@/components/PaymentProvider";
import { useState } from "react";

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeAuctions();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PaymentProvider>
            <TooltipProvider>
              <RealtimeProvider>
                <Toaster />
                <Sonner />
                {children}
              </RealtimeProvider>
            </TooltipProvider>
          </PaymentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

