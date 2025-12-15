'use client';

// Analytics utility for tracking user behavior and metrics

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

class Analytics {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'production' && 
                   typeof window !== 'undefined' && 
                   !!process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
  }

  track(event: AnalyticsEvent) {
    if (!this.enabled) {
      console.log('[Analytics]', event.name, event.properties);
      return;
    }

    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.name, event.properties);
    }

    // Also send to custom analytics endpoint
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.error);
  }

  pageView(path: string) {
    this.track({
      name: 'page_view',
      properties: { path },
    });
  }

  bidPlaced(auctionId: string, amount: number) {
    this.track({
      name: 'bid_placed',
      properties: { auctionId, amount },
    });
  }

  auctionViewed(auctionId: string) {
    this.track({
      name: 'auction_viewed',
      properties: { auctionId },
    });
  }

  auctionCreated(auctionId: string) {
    this.track({
      name: 'auction_created',
      properties: { auctionId },
    });
  }

  userSignedUp(method: string) {
    this.track({
      name: 'user_signed_up',
      properties: { method },
    });
  }
}

export const analytics = new Analytics();

