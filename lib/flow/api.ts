import { Stats } from './types';

const EVM_FLOWSCAN_API_URL = 'https://evm.flowscan.io/api/v2';
const FLOW_ACCESS_API = 'https://rest-mainnet.onflow.org/v1';
const FINDLABS_API_URL = 'https://api.find.xyz';

// Baseline from Flowscan (Jan 29, 2026)
// Total = Cadence (flowscan.io) + EVM (flowscan.io/evm)
// These are SEPARATE counts that must be added together
const BASELINE = {
  blockHeight: 140_493_759,
  cadenceTransactions: 893_633_531,  // From flowscan.io "Transactions Total"
  evmTransactions: 58_919_576,       // From flowscan.io/evm "Total Transactions"
  timestamp: Date.now(),
};

// Timeout utility
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function fetchInitialStats(): Promise<Stats> {
  let totalEvm = 0;
  let totalCadence = 0;
  let blockHeight = 0;

  // Check for Find Labs API key
  const findLabsApiKey = process.env.FINDLABS_API_KEY;

  // Fetch data from available sources
  const fetches: Promise<any>[] = [
    // EVM count from Flowscan EVM API (public)
    fetchWithTimeout(`${EVM_FLOWSCAN_API_URL}/stats`, {}, 8000)
      .then(r => r.json())
      .catch(() => null),

    // Block height from Flow Access API (public)
    fetchWithTimeout(`${FLOW_ACCESS_API}/blocks?height=sealed`, {}, 8000)
      .then(r => r.json())
      .catch(() => null),
  ];

  // Add Find Labs API if key is available (for Cadence count)
  if (findLabsApiKey) {
    fetches.push(
      fetchWithTimeout(`${FINDLABS_API_URL}/status/v1/stats`, {
        headers: { 'X-API-KEY': findLabsApiKey },
      }, 8000)
        .then(r => r.json())
        .catch(() => null)
    );
  }

  const results = await Promise.all(fetches);

  // Parse EVM stats (from evm.flowscan.io)
  if (results[0]) {
    totalEvm = parseInt(results[0]?.total_transactions || '0', 10);
  }

  // Parse block height
  if (results[1]?.[0]?.header?.height) {
    blockHeight = parseInt(results[1][0].header.height, 10);
  }

  // Parse Find Labs stats for Cadence count (if available)
  if (results[2]) {
    totalCadence = parseInt(results[2]?.transaction_count || '0', 10);
  }

  // If we have Find Labs data for Cadence, use it
  if (totalCadence > 0 && totalEvm > 0) {
    return {
      total: totalCadence + totalEvm,  // Total = Cadence + EVM
      cadence: totalCadence,
      evm: totalEvm,
      timestamp: Date.now(),
      blockHeight,
    };
  }

  // Otherwise, estimate Cadence from baseline + block delta
  if (blockHeight > 0) {
    // Calculate new Cadence transactions since baseline
    const blockDelta = blockHeight - BASELINE.blockHeight;
    // Average ~6.3 Cadence transactions per block
    const txPerBlock = 6.3;
    const estimatedNewCadenceTx = Math.max(0, blockDelta * txPerBlock);
    totalCadence = Math.round(BASELINE.cadenceTransactions + estimatedNewCadenceTx);

    // Use live EVM count if available, otherwise estimate
    if (totalEvm === 0) {
      // Estimate EVM growth (~400 tx/block based on recent data)
      const evmTxPerBlock = 0.4;
      totalEvm = Math.round(BASELINE.evmTransactions + (blockDelta * evmTxPerBlock));
    }

    return {
      total: totalCadence + totalEvm,  // Total = Cadence + EVM
      cadence: totalCadence,
      evm: totalEvm,
      timestamp: Date.now(),
      blockHeight,
    };
  }

  // Fallback to baseline
  const baselineTotal = BASELINE.cadenceTransactions + BASELINE.evmTransactions;
  return {
    total: baselineTotal,
    cadence: BASELINE.cadenceTransactions,
    evm: BASELINE.evmTransactions,
    timestamp: Date.now(),
    blockHeight: BASELINE.blockHeight,
  };
}

export async function fetchRecentTransactions(_limit: number = 50): Promise<any[]> {
  // Recent transactions are now streamed via SSE instead of fetched in bulk
  return [];
}
