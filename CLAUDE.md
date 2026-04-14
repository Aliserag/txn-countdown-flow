# Flow 1B Transaction Countdown - Developer Guide

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Architecture

### Data Flow
```
Page Load → GET /api/stats → Initialize Zustand stores → Connect SSE stream
Real-time: Flow REST API → SSE endpoint → Client stores → Animated UI
```

### Key Formula
```
Total Transactions = Cadence Transactions + EVM Transactions
```
- **Cadence**: From flowscan.io (893M+ as of Jan 2026)
- **EVM**: From flowscan.io/evm (58M+ as of Jan 2026)
- These are SEPARATE counts that must be added together

### API Routes
- `GET /api/stats` - Initial transaction counts (fetches live EVM, estimates Cadence)
- `GET /api/transactions` - SSE stream of new transactions

### State Management (Zustand)
- `stores/statsStore.ts` - Total/Cadence/EVM counts, milestone tracking
- `stores/transactionStore.ts` - Recent transaction list (max 100)

### Data Sources
| Source | Endpoint | Data |
|--------|----------|------|
| Flowscan EVM API | `evm.flowscan.io/api/v2/stats` | Live EVM count |
| Flow Access API | `rest-mainnet.onflow.org/v1/blocks` | Block height |
| Find Labs (optional) | `api.find.xyz/status/v1/flow/stat` | Live Cadence count |

### Baseline Data (app/api/transactions/route.ts)
When APIs unavailable, estimates from baseline + block delta:
- Block: 148,380,615 (updated Apr 13, 2026)
- Cadence: 907,941,661 (updated Apr 13, 2026, synced to flowscan)
- EVM: 60,766,734 (updated Apr 13, 2026)
- Growth rate: ~1.82 Cadence tx/block, ~0.235 EVM tx/block
- **Update this baseline periodically** — stale rates cause large drift near the 1B milestone

## Project Structure

```
app/
├── api/stats/route.ts        # Initial stats endpoint
├── api/transactions/route.ts # SSE transaction stream
├── page.tsx                  # Main page
└── globals.css               # Tailwind + custom styles

components/
├── countdown/                # CountdownDisplay, MilestoneProgress
├── transactions/             # TransactionFeed, TransactionRow, TypeBadge
├── stats/                    # StatsPanel, StatCard
└── celebration/              # WinnerModal, Confetti

hooks/
├── useTransactionStream.ts   # SSE subscription
├── useCountdown.ts           # Countdown calculation
└── useConnectionStatus.ts    # Connection status

stores/
├── statsStore.ts             # Transaction counts state
└── transactionStore.ts       # Transaction list state

lib/
├── flow/api.ts               # Flow API utilities + baseline
├── flow/types.ts             # TypeScript types
└── utils/                    # Formatters, animations
```

## Environment Variables

```env
# Optional: For live Cadence count via Find Labs API
# Account must have "status/v1" API group — contact Find Labs to enable it
FINDLABS_USERNAME=your_username
FINDLABS_PASSWORD=your_password
```

## Deployment

Configured for Vercel (see vercel.json). Push to GitHub and import in Vercel.

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Zustand (state)
- Framer Motion (animations)
- @tanstack/react-virtual (virtualization)
- canvas-confetti (celebration effects)
