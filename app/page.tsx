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
      <main className="min-h-screen bg-flow-background bg-grid-pattern">
        {/* Header */}
        <header className="border-b border-flow-border/20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-white text-center">
              Flow <span className="text-flow-primary">1 Billion</span> Txns Countdown
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Countdown Section */}
          <section className="text-center py-8">
            <CountdownDisplay />
          </section>

          {/* Progress Bar */}
          <section className="py-4">
            <MilestoneProgress />
          </section>

          {/* Stats Panel */}
          <section className="py-4">
            <StatsPanel />
          </section>

          {/* Transaction Feed */}
          <section className="py-4">
            <TransactionFeed />
          </section>

          {/* Footer */}
          <footer className="text-center py-8 text-gray-500 text-sm">
            <p>
              Real-time data from{' '}
              <a
                href="https://flowscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-flow-primary hover:underline"
              >
                Flowscan
              </a>
              {' '}and{' '}
              <a
                href="https://developers.flow.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-flow-primary hover:underline"
              >
                Flow Access API
              </a>
            </p>
          </footer>
        </div>

        {/* Celebration Modal */}
        <WinnerModal />
      </main>
    </DataProvider>
  );
}
