'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

export default function LayoutWithHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <>
      {!isLanding && <Header />}
      {children}
    </>
  );
}

