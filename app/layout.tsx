import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flow 1 Billion Txns Countdown',
  description: 'Watch Flow blockchain reach its 1 billionth transaction in real-time',
  keywords: ['Flow', 'blockchain', 'transactions', 'countdown', 'EVM', 'Cadence'],
  openGraph: {
    title: 'Flow 1 Billion Txns Countdown',
    description: 'Watch Flow blockchain reach its 1 billionth transaction in real-time',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flow 1 Billion Txns Countdown',
    description: 'Watch Flow blockchain reach its 1 billionth transaction in real-time',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-void min-h-screen text-text-primary">
        {children}
      </body>
    </html>
  );
}
