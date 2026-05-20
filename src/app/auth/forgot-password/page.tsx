'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset link sent to your email.');
        setTimeout(() => {
          router.push('/auth');
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md opacity-0 animate-fade-up">
        <div className="text-center mb-10">
          <h2 className="heading-display text-2xl mb-2 uppercase tracking-wide">
            Reset Password
          </h2>
          <p className="ui-caption">
            Enter your email to receive a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="ui-label">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="bg-card border-border focus:border-accent"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12">
            {isLoading ? 'Processing...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/auth')}
            className="ui-caption text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            RETURN TO SIGN IN
          </button>
        </div>
      </div>
    </div>
  );
}
