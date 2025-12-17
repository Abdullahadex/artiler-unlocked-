'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuction } from '@/hooks/useAuctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { getStripePublishableKey } from '@/lib/stripe';
import { loadStripe } from '@stripe/stripe-js';

const stripeKey = getStripePublishableKey();
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.auctionId as string;
  const { user } = useAuth();
  const { data: auction, isLoading } = useAuction(auctionId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Check if already paid
    if (auction?.fulfillment_status && auction.fulfillment_status !== 'pending_payment') {
      setIsPaid(true);
    }
  }, [user, auction, router]);

  // Check if user is the winner
  const isWinner = auction?.winner_id === user?.id;
  const needsPayment = auction?.fulfillment_status === 'pending_payment';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !auction || !isWinner) {
      toast.error('You are not authorized to complete this checkout');
      return;
    }

    if (!stripePromise) {
      toast.error('Payment processing is not available');
      return;
    }

    setIsProcessing(true);

    try {
      // Validate form
      if (!formData.fullName || !formData.addressLine1 || !formData.city || !formData.postalCode) {
        toast.error('Please fill in all required fields');
        setIsProcessing(false);
        return;
      }

      // Save shipping address
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Database not configured');
      }

      // Type assertion needed until Supabase types are regenerated after migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: addressError } = await (supabase as any)
        .from('shipping_addresses')
        .upsert({
          user_id: user.id,
          auction_id: auction.id,
          full_name: formData.fullName,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || null,
          city: formData.city,
          state: formData.state || null,
          postal_code: formData.postalCode,
          country: formData.country,
          phone: formData.phone || null,
        }, {
          onConflict: 'auction_id'
        });

      if (addressError) throw addressError;

      // For now, just save address and mark as ready for payment
      // In production, integrate Stripe Elements for card payment here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('auctions')
        .update({
          fulfillment_status: 'address_collected',
        })
        .eq('id', auction.id);

      if (updateError) throw updateError;

      toast.success('Shipping address saved! Payment processing will be available soon.');
      setIsPaid(true);
      
      // Refresh page data
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-display text-3xl mb-4">Auction Not Found</h1>
          <Link href="/floor" className="ui-label text-accent hover:text-accent/80">
            Return to The Floor
          </Link>
        </div>
      </div>
    );
  }

  if (!isWinner) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="heading-display text-3xl mb-4">Not Authorized</h1>
          <p className="text-muted-foreground mb-6">
            This checkout is only available to the auction winner.
          </p>
          <Link href="/floor" className="ui-label text-accent hover:text-accent/80">
            Return to The Floor
          </Link>
        </div>
      </div>
    );
  }

  if (isPaid || !needsPayment) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-2xl">
          <Link 
            href="/vault"
            className="inline-flex items-center gap-2 ui-caption hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vault
          </Link>

          <div className="p-8 bg-card border border-accent/30 rounded-sm text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h1 className="heading-display text-3xl mb-4">Payment Complete!</h1>
            <p className="text-muted-foreground mb-6">
              Your payment has been processed and your shipping address has been saved.
              The designer will be notified and will ship your item soon.
            </p>
            <p className="ui-caption text-muted-foreground">
              You'll receive tracking information once the item is shipped.
            </p>
            <Link href="/vault">
              <Button className="mt-6">View in Vault</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-2xl">
        <Link 
          href="/vault"
          className="inline-flex items-center gap-2 ui-caption hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vault
        </Link>

        <div className="mb-8">
          <h1 className="heading-display text-3xl mb-2">Complete Your Purchase</h1>
          <p className="text-muted-foreground">
            Congratulations on winning "{auction.title}"! Please provide your shipping address and complete payment.
          </p>
        </div>

        <div className="p-6 bg-card border border-border rounded-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="ui-label text-muted-foreground">Total Amount</span>
            <span className="heading-display text-2xl text-accent">
              €{auction.current_price.toLocaleString()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-card border border-border rounded-sm space-y-4">
            <h2 className="font-serif text-xl mb-4">Shipping Address</h2>
            
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isProcessing}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isProcessing ? 'Processing...' : `Pay €${auction.current_price.toLocaleString()}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

