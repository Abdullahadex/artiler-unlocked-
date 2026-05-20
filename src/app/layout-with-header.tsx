'use client';

import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Paths that a waitlisted user is allowed to access
const WAITLIST_ALLOWED_PATHS = ['/', '/auth', '/waitlist', '/intel', '/vault', '/privacy', '/terms'];

export default function LayoutWithHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === '/';
  
  const { profile, loading, isWaitlisted } = useAuth();
  const prevWaitlistedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    // Toast logic for approval transition
    if (prevWaitlistedRef.current === true && isWaitlisted === false) {
      toast.success('ACCESS GRANTED: Your account has been verified.', {
        description: 'You now have full access to the Floor.',
        duration: 8000,
      });
    }
    prevWaitlistedRef.current = isWaitlisted;

    // Redirection logic
    if (isWaitlisted) {
      // Check if they are trying to access a restricted path
      const isAllowed = WAITLIST_ALLOWED_PATHS.some(path => 
        pathname === path || pathname.startsWith(path + '/')
      );
      
      if (!isAllowed) {
        router.push('/waitlist');
      }
    }
  }, [profile, isWaitlisted, pathname, loading, router]);

  return (
    <>
      {!isLanding && <Header />}
      {children}
    </>
  );
}

