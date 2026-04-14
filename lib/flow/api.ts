import { Stats } from './types';

const EVM_FLOWSCAN_API_URL = 'https://evm.flowscan.io/api/v2';
const FLOW_ACCESS_API = 'https://rest-mainnet.onflow.org/v1';
const FINDLABS_API_URL = 'https://api.find.xyz';
// Flow Foundation's own explorer API — no auth required.
// transactions_count will appear here once historical backfill completes (indexed from Dec 29, 2025).
const FLOW_EXPLORER_API_URL = 'https://api.explorer.flow.com';

// Baseline from Flowscan (Apr 13, 2026)
// Total = Cadence (flowscan.io) + EVM (flowscan.io/evm)
// These are SEPARATE counts that must be added together
const BASELINE = {
  blockHeight: 148_358_201,
  cadenceTransactions: 907_924_122,  // From api.find.xyz/status/v1/flow/stat
  evmTransactions: 60_766_734,       // From evm.flowscan.io/api/v2/stats
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

// Generates a short-lived Bearer token using Basic Auth credentials.
// Returns null if credentials are missing or the request fails.
async function generateFindLabsToken(): Promise<string | null> {
  const username = process.env.FINDLABS_USERNAME;
  const password = process.env.FINDLABS_PASSWORD;
  if (!username || !password) return null;

  try {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const response = await fetchWithTimeout(
      `${FINDLABS_API_URL}/auth/v1/generate`,
      { method: 'POST', headers: { 'Authorization': `Basic ${credentials}` } },
      8000
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchInitialStats(): Promise<Stats> {
  let totalEvm = 0;
  let totalCadence = 0;
  let blockHeight = 0;

  // Fetch public data sources and optionally a Find Labs token in parallel
  const [evmData, blockData, findLabsToken, explorerData] = await Promise.all([
    // EVM count from Flowscan EVM API (public)
    fetchWithTimeout(`${EVM_FLOWSCAN_API_URL}/stats`, {}, 8000)
      .then(r => r.json())
      .catch(() => null),

    // Block height from Flow Access API (public)
    fetchWithTimeout(`${FLOW_ACCESS_API}/blocks?height=sealed`, {}, 8000)
      .then(r => r.json())
      .catch(() => null),

    // Find Labs token (requires FINDLABS_USERNAME + FINDLABS_PASSWORD env vars)
    generateFindLabsToken(),

    // Flow Foundation's explorer API — no auth required, will have transactions_count once backfill completes
    fetchWithTimeout(`${FLOW_EXPLORER_API_URL}/status/v1/flow/stat`, {}, 8000)
      .then(r => r.json())
      .catch(() => null),
  ]);

  // Parse EVM stats (from evm.flowscan.io)
  if (evmData) {
    totalEvm = parseInt(evmData?.total_transactions || '0', 10);
  }

  // Parse block height
  if (blockData?.[0]?.header?.height) {
    blockHeight = parseInt(blockData[0].header.height, 10);
  }

  // Priority 1: Find Labs (requires credentials — most reliable when available)
  if (findLabsToken) {
    try {
      const statResponse = await fetchWithTimeout(
        `${FINDLABS_API_URL}/status/v1/flow/stat`,
        { headers: { 'Authorization': `Bearer ${findLabsToken}` } },
        8000
      );
      if (statResponse.ok) {
        const statData = await statResponse.json();
        // Response shape: { data: [{ transactions_count: number, ... }] }
        totalCadence = parseInt(statData?.data?.[0]?.transactions_count || '0', 10);
      }
    } catch {
      // Fall through to next source
    }
  }

  // Priority 2: Flow Foundation's own explorer API (no auth required)
  // transactions_count will appear once historical backfill is complete (from Dec 29, 2025)
  if (totalCadence === 0 && explorerData?.data?.[0]?.transactions_count) {
    totalCadence = parseInt(explorerData.data[0].transactions_count || '0', 10);
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
    // Measured Apr 13, 2026: ~1.82 Cadence transactions per block
    const txPerBlock = 1.82;
    const estimatedNewCadenceTx = Math.max(0, blockDelta * txPerBlock);
    totalCadence = Math.round(BASELINE.cadenceTransactions + estimatedNewCadenceTx);

    // Use live EVM count if available, otherwise estimate
    if (totalEvm === 0) {
      // Measured Apr 13, 2026: ~0.235 EVM tx/block
      const evmTxPerBlock = 0.235;
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
