'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If we land here and there's no session hash or active session, 
    // the user might have clicked an invalid or expired link
    const hash = window.location.hash;
    if (!hash && !session) {
      toast.error('Invalid or expired password reset link');
      router.push('/auth');
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully');
        setTimeout(() => {
          router.push('/floor'); // Or wherever they should go after login
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
            Set New Password
          </h2>
          <p className="ui-caption">
            Please enter your new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="ui-label">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-card border-border focus:border-accent"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12">
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
