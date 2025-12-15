export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="heading-display text-4xl mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="heading-display text-2xl mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using ATELIER, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">2. Auction Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              All auctions are conducted in good faith. Bids are binding commitments. Once a bid is placed, it cannot be withdrawn unless the auction is cancelled.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">3. Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Winning bidders must complete payment within 48 hours of auction end. Payment failure may result in cancellation and the item being offered to the next highest bidder.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">4. Designer Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              Designers are responsible for accurate item descriptions and timely shipping. ATELIER acts as a platform and is not responsible for item authenticity or condition.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">5. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              All disputes will be handled through our support system. ATELIER reserves the right to mediate disputes and make final decisions.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              ATELIER is not liable for any indirect, incidental, or consequential damages arising from use of the platform.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="ui-caption">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

