'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItemProps = {
  href: string;
  label: string;
  isActive: boolean;
};

function NavItem({ href, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'inline-flex h-14 shrink-0 items-center border-b-2 px-2.5 text-sm font-medium transition-colors sm:px-3',
        isActive
          ? 'border-indigo-600 text-zinc-900 dark:border-indigo-400 dark:text-zinc-50'
          : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

/**
 * Primary in-app routes for candidates; styled as top-bar tabs (underline active state).
 */
export function CandidatePrimaryNav() {
  const pathname = usePathname() ?? '';

  const jobsActive = pathname === '/jobs' || pathname.startsWith('/jobs/');
  const profileActive = pathname === '/profile' || pathname.startsWith('/profile/');

  return (
    <nav aria-label="Main" className="flex h-14 min-w-0 items-stretch">
      <NavItem href="/jobs" label="Jobs" isActive={jobsActive} />
      <NavItem href="/profile" label="Profile" isActive={profileActive} />
    </nav>
  );
}
