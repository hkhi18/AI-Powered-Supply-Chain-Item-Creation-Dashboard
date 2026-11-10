// Server Component: top bar, logo and navigation
import Link from 'next/link';
import NavLinks from './NavLinks';
import { dbMode } from '@/lib/db';
import { ORG } from '@/lib/config';

export default async function Header() {
  const mode = await dbMode();
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>{ORG.name} · {ORG.department}</span>
          <span className="spacer" />
          <span className="badge-version">v1.0.0 · {mode === 'pglite' ? 'PostgreSQL (embedded)' : 'PostgreSQL'}</span>
        </div>
      </div>
      <header className="header">
        <div className="container">
          <Link href="/" className="brand">
            <img src="/kfshrc-logo.svg" alt="KFSHRC" />
            <span className="brand-text">
              <strong>SCM Item Creation</strong>
              <span>AI-assisted item master &amp; UNSPSC classification</span>
            </span>
          </Link>
          <NavLinks />
        </div>
      </header>
    </>
  );
}
