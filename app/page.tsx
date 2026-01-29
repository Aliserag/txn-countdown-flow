'use client';

import { DataProvider } from '@/components/providers/DataProvider';
import { CountdownDisplay } from '@/components/countdown/CountdownDisplay';
import { MilestoneProgress } from '@/components/countdown/MilestoneProgress';
import { StatsPanel } from '@/components/stats/StatsPanel';
import { TransactionFeed } from '@/components/transactions/TransactionFeed';
import { WinnerModal } from '@/components/celebration/WinnerModal';

export default function Home() {
  return (
    <DataProvider>
      {/* Ambient background effects */}
      <div className="ambient-glow" />
      <div className="noise-overlay" />

      <main className="relative z-10 min-h-screen">
        {/* Header - minimal, functional */}
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center">
            <h1 className="font-body text-sm font-medium text-text-secondary tracking-wide">
              Flow Network · Mainnet
            </h1>
          </div>
        </header>

        {/* Hero Section - The Star of the Show */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            {/* Label */}
            <div className="text-center mb-8 animate-fade-up">
              <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs font-mono text-text-tertiary uppercase tracking-widest">
                Total Transactions
              </span>
            </div>

            {/* Main Countdown */}
            <div className="animate-fade-up stagger-1">
              <CountdownDisplay />
            </div>

            {/* Progress to 1B */}
            <div className="mt-16 animate-fade-up stagger-2">
              <MilestoneProgress />
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="py-12 border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="animate-fade-up stagger-3">
              <StatsPanel />
            </div>
          </div>
        </section>

        {/* Transaction Feed */}
        <section className="py-12 border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="animate-fade-up stagger-4">
              <TransactionFeed />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center gap-4 text-xs text-text-muted">
              <p>
                Data from{' '}
                <a
                  href="https://flowscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-flow-green transition-colors"
                >
                  Flowscan
                </a>
                {' '}&{' '}
                <a
                  href="https://developers.flow.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-flow-green transition-colors"
                >
                  Flow Access API
                </a>
              </p>
              <p>
                made with &lt;3 by{' '}
                <a
                  href="https://x.com/0xSerag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-flow-green transition-colors"
                >
                  0xSerag
                </a>
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Celebration Modal */}
      <WinnerModal />
    </DataProvider>
  );
}
