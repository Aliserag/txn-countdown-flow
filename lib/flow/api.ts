import { Stats } from './types';

const EVM_FLOWSCAN_API_URL = 'https://evm.flowscan.io/api/v2';
const FLOW_ACCESS_API = 'https://rest-mainnet.onflow.org/v1';
const FINDLABS_API_URL = 'https://api.find.xyz';

// Baseline from Flowscan (Jan 29, 2026)
// These will be used if API calls fail
const BASELINE = {
  blockHeight: 140_492_637,
  totalTransactions: 893_630_136,
  evmTransactions: 58_916_619,
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
  let totalTransactions = 0;
  let totalEvm = 0;
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

  // Add Find Labs API if key is available
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

  // Parse EVM stats
  if (results[0]) {
    totalEvm = parseInt(results[0]?.total_transactions || '0', 10);
  }

  // Parse block height
  if (results[1]?.[0]?.header?.height) {
    blockHeight = parseInt(results[1][0].header.height, 10);
  }

  // Parse Find Labs stats (if available)
  if (results[2]) {
    totalTransactions = parseInt(results[2]?.transaction_count || '0', 10);
  }

  // If we have Find Labs data, use it directly
  if (totalTransactions > 0) {
    return {
      total: totalTransactions,
      cadence: totalTransactions - totalEvm,
      evm: totalEvm,
      timestamp: Date.now(),
      blockHeight,
    };
  }

  // Otherwise, estimate from baseline + block delta
  if (blockHeight > 0 && totalEvm > 0) {
    // Calculate new transactions since baseline
    const blockDelta = blockHeight - BASELINE.blockHeight;
    // Average ~6.3 transactions per block based on (893M / 140M blocks)
    const txPerBlock = 6.3;
    const estimatedNewTx = Math.max(0, blockDelta * txPerBlock);
    totalTransactions = Math.round(BASELINE.totalTransactions + estimatedNewTx);

    return {
      total: totalTransactions,
      cadence: totalTransactions - totalEvm,
      evm: totalEvm,
      timestamp: Date.now(),
      blockHeight,
    };
  }

  // Fallback to baseline
  return {
    total: BASELINE.totalTransactions,
    cadence: BASELINE.totalTransactions - BASELINE.evmTransactions,
    evm: BASELINE.evmTransactions,
    timestamp: Date.now(),
    blockHeight: BASELINE.blockHeight,
  };
}

export async function fetchRecentTransactions(_limit: number = 50): Promise<any[]> {
  // Recent transactions are now streamed via SSE instead of fetched in bulk
  return [];
}
