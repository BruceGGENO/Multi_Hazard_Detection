import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Rwanda Response Hub | Multi-Hazard Command Center', description: 'NST2-aligned early warning and disaster response demonstration dashboard.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
