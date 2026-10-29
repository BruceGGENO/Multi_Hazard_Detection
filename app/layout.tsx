import type { Metadata } from 'next';
import './globals.css';
import './operations.css';
import './incidents.css';
export const metadata: Metadata = { title: 'Rwanda Response Hub | Multi-Hazard Command Center', description: 'Early warning and disaster response coordination for Rwanda.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
