import type { Bid } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface LedgerBid {
  id: string;
  collectorId: string;
  amount: number;
  timestamp: Date;
}

interface LiveLedgerProps {
  bids: LedgerBid[];
  highlightFirst?: boolean;
}

const LiveLedger = ({ bids, highlightFirst = true }: LiveLedgerProps) => {
  if (bids.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="ui-caption">No bids yet</p>
        <p className="text-muted-foreground text-sm mt-1">Be the first to place a bid</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="ui-label text-muted-foreground mb-4">Live Ledger</h4>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
        {bids.map((bid, index) => (
          <div
            key={bid.id}
            className={`flex items-center justify-between py-3 px-4 rounded-sm transition-all duration-300 ${
              index === 0 && highlightFirst
                ? 'bg-accent/10 border border-accent/30'
                : 'bg-card border border-border'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              {/* Anonymized Collector ID */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                index === 0 && highlightFirst
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                #{bid.collectorId.slice(0, 2)}
              </div>
              
              <div>
                <span className="ui-label">
                  Collector #{bid.collectorId}
                </span>
                <span className="ui-caption block">
                  {formatDistanceToNow(bid.timestamp, { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className={`font-serif text-lg ${
                index === 0 && highlightFirst ? 'text-accent' : ''
              }`}>
                €{bid.amount.toLocaleString()}
              </span>
              {index === 0 && highlightFirst && (
                <span className="ui-label text-accent block text-[10px]">
                  LEADING
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveLedger;
