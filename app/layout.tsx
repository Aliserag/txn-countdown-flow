import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flow 1 Billion Countdown',
  description: 'Watch Flow blockchain reach its 1 billionth transaction in real-time',
  keywords: ['Flow', 'blockchain', 'transactions', 'countdown', 'EVM', 'Cadence'],
  openGraph: {
    title: 'Flow 1 Billion Countdown',
    description: 'Watch Flow blockchain reach its 1 billionth transaction in real-time',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flow 1 Billion Countdown',
    description: 'Watch Flow blockchain reach its 1 billionth transaction in real-time',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-flow-background min-h-screen">
        {children}
      </body>
    </html>
  );
}
