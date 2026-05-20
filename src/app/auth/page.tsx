'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'collector' | 'designer'>('collector');
  const [collectionInterest, setCollectionInterest] = useState('fashion');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, profile, refreshProfile, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && profile) {
      if (profile.is_waitlisted && profile.role !== 'admin') {
        if (profile.role === 'designer') {
          router.push('/vault');
        } else {
          router.push('/intel');
        }
      } else {
        router.push('/floor');
      }
    }
  }, [user, profile, router]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, displayName, role, collectionInterest);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Registration successful! Please check your email to confirm your account.', { duration: 8000 });
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          let message = error.message;
          if (message.includes('Invalid login credentials')) {
            message = 'Invalid credentials';
          } else if (message.includes('Email not confirmed')) {
            message = 'Please verify your email address to continue.';
          }
          toast.error(message);
        } else {
          toast.success('Welcome back.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!configured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md opacity-0 animate-fade-up">
          <div className="text-center mb-10 p-6 border border-destructive/50 bg-destructive/10 rounded-sm">
            <h1 className="heading-display text-2xl mb-2 text-destructive uppercase tracking-tight">
              CONFIGURATION REQUIRED
            </h1>
            <p className="ui-caption text-sm mb-4">
              Supabase environment variables are missing. Please configure:
            </p>
            <div className="text-left space-y-2 text-sm font-mono bg-background p-4 rounded border border-border">
              <div>NEXT_PUBLIC_SUPABASE_URL</div>
              <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</div>
            </div>
            <p className="ui-caption text-xs mt-4">
              Settings &rarr; Environment variables &rarr; Add variables
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md opacity-0 animate-fade-up">
        <div className="text-center mb-10">
          <h2 className="heading-display text-2xl mb-2 uppercase tracking-wide">
            {isSignUp ? 'Join the Archive' : 'Welcome Back'}
          </h2>
          <p className="ui-caption">
            {isSignUp 
              ? 'Create an account to begin the journey' 
              : 'Sign in to continue current session'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="ui-label">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Display Name"
                  className="bg-card border-border focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="ui-label">Role Selection</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('collector')}
                    className={`p-4 border-2 rounded-sm transition-all ${
                      role === 'collector'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <p className="ui-label mb-1">Collector</p>
                    <p className="ui-caption text-xs uppercase opacity-70">Acquire and Bid</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('designer')}
                    className={`p-4 border-2 rounded-sm transition-all ${
                      role === 'designer'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <p className="ui-label mb-1">Designer</p>
                    <p className="ui-caption text-xs uppercase opacity-70">Curate and List</p>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectionInterest" className="ui-label">Primary Interest</Label>
                <select
                  id="collectionInterest"
                  name="collectionInterest"
                  value={collectionInterest}
                  onChange={(e) => setCollectionInterest(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent appearance-none transition-all"
                >
                  <option value="fashion">Fashion & Couture</option>
                  <option value="watches">Timepieces</option>
                  <option value="art">Fine Art</option>
                  <option value="jewelry">Jewelry</option>
                  <option value="sneakers">Rare Sneakers</option>
                  <option value="general">Curation of All</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="ui-label">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={`bg-card border-border focus:border-accent ${errors.email ? 'border-destructive' : ''}`}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="ui-label">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`bg-card border-border focus:border-accent ${errors.password ? 'border-destructive' : ''}`}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            {!isSignUp && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12">
            {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ui-caption text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            {isSignUp ? 'ALREADY HAVE AN ACCOUNT? SIGN IN' : 'NEW TO THE ARCHIVE? JOIN US'}
          </button>
        </div>
      </div>
    </div>
  );
}
