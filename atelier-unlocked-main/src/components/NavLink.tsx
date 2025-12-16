'use client';

import Link, { type LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type NavLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: LinkProps['href'];
  className?: string;
  activeClassName?: string;
  exact?: boolean;
} & Omit<LinkProps, 'href'>;

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, exact, ...props }, ref) => {
    const pathname = usePathname();
    const hrefString = typeof href === 'string' ? href : null;

    const isActive =
      !!hrefString &&
      (exact ? pathname === hrefString : pathname === hrefString || pathname.startsWith(`${hrefString}/`));

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  }
);

NavLink.displayName = 'NavLink';

export { NavLink };
