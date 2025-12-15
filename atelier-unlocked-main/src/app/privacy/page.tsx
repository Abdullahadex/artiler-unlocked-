export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="heading-display text-4xl mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="heading-display text-2xl mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly, including name, email, payment information, and auction activity.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to process transactions, send notifications, improve our services, and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">3. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data. Payment information is processed through secure third-party providers.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">4. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, update, or delete your personal information. Contact us to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies to enhance your experience. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="heading-display text-2xl mb-4">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Supabase for data storage, Stripe for payments, and email services for notifications. These services have their own privacy policies.
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

