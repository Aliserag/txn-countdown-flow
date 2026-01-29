# Flow 1 Billion Transaction Countdown

Real-time countdown to Flow blockchain's 1 billionth transaction, showing live EVM vs Cadence transaction breakdown.

![Flow 1B Countdown](https://img.shields.io/badge/Flow-1B%20Countdown-00EF8B?style=for-the-badge)

## Features

- **Live Countdown** - Animated display showing transactions remaining to 1 billion
- **Progress Bar** - Visual progress toward the 1B milestone
- **Stats Panel** - Real-time Total, Cadence, and EVM transaction counts
- **Transaction Feed** - Live stream of new transactions with type indicators
- **Winner Celebration** - Confetti and modal when 1B is reached

## Data Sources

### Transaction Count Formula

```
Total Transactions = Cadence Transactions + EVM Transactions
```

| Source | URL | Data |
|--------|-----|------|
| **Cadence** | [flowscan.io](https://flowscan.io) | "Transactions Total" from Analytics section |
| **EVM** | [flowscan.io/evm](https://flowscan.io/evm) | "Total Transactions" from Analytics section |

### APIs Used

| API | Endpoint | Data Retrieved |
|-----|----------|----------------|
| **Flowscan EVM** | `https://evm.flowscan.io/api/v2/stats` | Live EVM transaction count |
| **Flow Access** | `https://rest-mainnet.onflow.org/v1/blocks` | Current block height |
| **Find Labs** (optional) | `https://api.find.xyz/status/v1/stats` | Live Cadence count (requires API key) |

### Baseline Data (Jan 29, 2026)

When APIs are unavailable, the app uses these baseline values and estimates new transactions based on block height delta:

```typescript
{
  blockHeight: 140_493_759,
  cadenceTransactions: 893_633_531,  // From flowscan.io
  evmTransactions: 58_919_576,       // From flowscan.io/evm
  // Total: 952,553,107
}
```

### Accuracy Notes

- **EVM count**: Fetched live from Flowscan EVM API (highly accurate)
- **Cadence count**: Estimated from baseline + (block delta × 6.3 tx/block)
- **For fully accurate Cadence data**: Add a Find Labs API key

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# Optional: For accurate Cadence transaction count
FINDLABS_API_KEY=your_api_key_here
```

To get a Find Labs API key, join their [Telegram channel](https://t.me/FindLabs).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: Zustand with subscribeWithSelector
- **Animation**: Framer Motion
- **Virtualization**: @tanstack/react-virtual
- **Confetti**: canvas-confetti

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── stats/route.ts        # Initial stats endpoint
│   │   └── transactions/route.ts # SSE transaction stream
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── countdown/                # Countdown display
│   ├── transactions/             # Transaction feed
│   ├── stats/                    # Stats cards
│   └── celebration/              # Winner modal & confetti
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
└── lib/
    ├── flow/                     # Flow API utilities
    └── utils/                    # Formatters & animations
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add `FINDLABS_API_KEY` environment variable (optional)
4. Deploy

## Resources

- [Flowscan](https://flowscan.io) - Block explorer
- [Flowscan EVM](https://flowscan.io/evm) - EVM explorer
- [Find Labs API](https://api.find.xyz/swagger/index.html) - API documentation
- [Flow Developer Portal](https://developers.flow.com) - Flow documentation

## License

MIT
