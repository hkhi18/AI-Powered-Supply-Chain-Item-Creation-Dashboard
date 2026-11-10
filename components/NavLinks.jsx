'use client';
// Client Component: highlights the current page using the usePathname() hook
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/', 'Dashboard'],
  ['/items', 'Items'],
  ['/new', 'New item']
];

export default function NavLinks() {
  const path = usePathname();
  const isActive = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <nav className="nav">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={isActive(href) ? 'active' : ''}>{label}</Link>
      ))}
    </nav>
  );
}
