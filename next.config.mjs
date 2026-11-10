// Next.js configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  // These packages run only on the server and must not be bundled by Next.js
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  // Never copy the local database folder into a build
  outputFileTracingExcludes: { '*': ['./pgdata/**'] }
};

export default nextConfig;
