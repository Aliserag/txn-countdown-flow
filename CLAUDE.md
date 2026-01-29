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
| Find Labs (optional) | `api.find.xyz/status/v1/stats` | Live Cadence count |

### Baseline Data (lib/flow/api.ts)
When APIs unavailable, estimates from baseline + block delta:
- Block: 140,493,759
- Cadence: 893,633,531
- EVM: 58,919,576
- Growth rate: ~6.3 Cadence tx/block, ~0.4 EVM tx/block

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
# Optional: For accurate Cadence count (requires Find Labs "status" API group)
FINDLABS_API_KEY=your_api_key_here
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
