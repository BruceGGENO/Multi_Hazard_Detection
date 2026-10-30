import type { NextConfig } from 'next';
process.env.NEXT_TELEMETRY_DISABLED = '1';
const config: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' && /^\d+$/.test(process.env.LOCAL_NEXT_DEV_PORT ?? '')
    ? `.next-dev/${process.env.LOCAL_NEXT_DEV_PORT}` : '.next',
  poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
  ] }]; },
};
export default config;
