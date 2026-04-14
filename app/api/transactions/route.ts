import { NextRequest } from 'next/server';
import { supabase, TransactionState } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FLOW_ACCESS_API = 'https://rest-mainnet.onflow.org/v1';
const EVM_FLOWSCAN_API = 'https://evm.flowscan.io/api/v2';
const POLL_INTERVAL = 3000;
const EVM_POLL_INTERVAL = 30000;
const TARGET_MILESTONE = 1_000_000_000;
// Re-sync from live APIs if DB is this many blocks behind the chain tip.
const STALE_THRESHOLD = 100;

const BASELINE = {
  blockHeight: 148_358_201,
  cadence: 907_924_122,
  evm: 60_766_734,
  cadenceTxPerBlock: 1.82,
  evmTxPerBlock: 0.235,
};

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchLatestBlock(): Promise<any> {
  try {
    const res = await fetchWithTimeout(`${FLOW_ACCESS_API}/blocks?height=sealed`);
    if (!res.ok) return null;
    const blocks = await res.json();
    return blocks[0] ?? null;
  } catch { return null; }
}

// Authoritative on-chain Cadence tx count via execution_results.
// Returns null on fetch failure (retry next poll), 0 for genuine empty blocks.
async function fetchBlockTxCount(blockId: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(`${FLOW_ACCESS_API}/execution_results?block_id=${blockId}`, 4000);
    if (!res.ok) {
      console.error(`fetchBlockTxCount: HTTP ${res.status} for block ${blockId}`);
      return null;
    }
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return 0;
    const chunks: any[] = results[0]?.chunks ?? [];
    return chunks.reduce((sum, c) => sum + (parseInt(c.number_of_transactions, 10) || 0), 0);
  } catch (err) {
    console.error(`fetchBlockTxCount error for block ${blockId}:`, err);
    return null;
  }
}

// Sample real tx IDs from a block's first collection for feed display.
// Best-effort — never affects counting.
async function fetchSampleTxIds(blockId: string, blockHeight: number): Promise<any[]> {
  try {
    const blockRes = await fetchWithTimeout(`${FLOW_ACCESS_API}/blocks/${blockId}?expand=payload`, 3000);
    if (!blockRes.ok) return [];
    const block = await blockRes.json();
    const guarantees = block?.payload?.collection_guarantees ?? [];
    if (guarantees.length === 0) return [];

    const colRes = await fetchWithTimeout(
      `${FLOW_ACCESS_API}/collections/${guarantees[0].collection_id}`, 2000
    );
    if (!colRes.ok) return [];
    const txIds: string[] = (await colRes.json())?.transactions ?? [];

    return txIds.slice(0, 6).map((txId: string) => ({
      id: txId,
      type: 'cadence' as const,
      proposer: `0x${txId.slice(0, 16)}`,
      blockHeight,
      simulated: false,
    }));
  } catch { return []; }
}

async function fetchLiveEvmTotal(): Promise<number> {
  try {
    const res = await fetchWithTimeout(`${EVM_FLOWSCAN_API}/stats`);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseInt(data?.total_transactions || '0', 10);
  } catch { return 0; }
}

// Fetch the most recent EVM transaction for the winner record.
// When EVM transactions push the total over the milestone we need a real,
// verifiable on-chain tx ID — not a synthetic placeholder.
async function fetchLatestEvmTx(blockHeight: number): Promise<{ id: string; type: 'evm'; proposer: string; blockHeight: number }> {
  try {
    const res = await fetchWithTimeout(`${EVM_FLOWSCAN_API}/transactions?limit=1`, 5000);
    if (!res.ok) throw new Error('EVM tx fetch failed');
    const data = await res.json();
    const tx = data?.items?.[0];
    if (tx?.hash) {
      return { id: tx.hash, type: 'evm', proposer: tx.from ?? 'unknown', blockHeight };
    }
  } catch { /* fall through */ }
  // If we can't get the actual tx, return a best-effort record with the block hash
  return { id: `evm-block-${blockHeight}`, type: 'evm', proposer: 'unknown', blockHeight };
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isRunning = true;
      let lastEvmPollTime = 0;

      const emit = (payload: object) => {
        if (!isRunning) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          console.error('SSE emit error — stream closed:', err);
          isRunning = false;
        }
      };

      emit({ type: 'heartbeat', data: { timestamp: Date.now() } });

      // ── Bootstrap: load authoritative state from Supabase ─────────────────
      const { data: dbState, error: dbError } = await supabase
        .from('transaction_state')
        .select('*')
        .eq('id', 1)
        .single<TransactionState>();

      if (dbError || !dbState) {
        console.error('Failed to load DB state:', dbError);
        emit({ type: 'error', data: { message: 'Database unavailable' } });
        return;
      }

      const latestBlock = await fetchLatestBlock();
      const currentHeight = latestBlock ? parseInt(latestBlock.header.height, 10) : 0;

      let cadenceCount = dbState.cadence_count;
      let evmCount = dbState.evm_count;
      let lastBlockHeight = dbState.last_block_height;

      // Re-sync if DB state is stale — but only if the estimate is larger than
      // what's already in the DB (prevents overwriting a higher accurate count).
      if (currentHeight > 0 && currentHeight - lastBlockHeight > STALE_THRESHOLD) {
        const liveEvm = await fetchLiveEvmTotal();
        const blockDelta = Math.max(0, currentHeight - BASELINE.blockHeight);
        const cadenceEst = Math.round(BASELINE.cadence + blockDelta * BASELINE.cadenceTxPerBlock);
        const evmEst = liveEvm > 0 ? liveEvm : Math.round(BASELINE.evm + blockDelta * BASELINE.evmTxPerBlock);

        // resync_state only writes if (p_cadence + p_evm) > current DB total
        const { data: resynced } = await supabase.rpc('resync_state', {
          p_cadence: cadenceEst,
          p_evm: evmEst,
          p_block_height: currentHeight - 1,
          p_evm_total: evmEst,
        });

        if (resynced) {
          cadenceCount = resynced.cadence_count;
          evmCount = resynced.evm_count;
          lastBlockHeight = currentHeight - 1;
        }
      }

      emit({
        type: 'stats',
        data: { total: cadenceCount + evmCount, cadence: cadenceCount, evm: evmCount, blockHeight: lastBlockHeight, timestamp: Date.now() },
      });

      // ── Poll loop ──────────────────────────────────────────────────────────
      const poll = async () => {
        if (!isRunning) return;
        const now = Date.now();

        try {
          // ── EVM sync every 30s ────────────────────────────────────────────
          if (now - lastEvmPollTime >= EVM_POLL_INTERVAL) {
            lastEvmPollTime = now;
            const liveEvm = await fetchLiveEvmTotal();

            if (liveEvm > 0) {
              const { data: result } = await supabase.rpc('sync_evm', { new_evm_total: liveEvm });
              if (result) {
                evmCount = result.evm_count;
                cadenceCount = result.cadence_count;
                const total = result.total;

                if (result.updated) {
                  emit({
                    type: 'stats',
                    data: { total, cadence: cadenceCount, evm: evmCount, blockHeight: lastBlockHeight, timestamp: Date.now() },
                  });

                  if (total >= TARGET_MILESTONE) {
                    // Fetch real EVM transaction for the winner record
                    const evmWinnerTx = await fetchLatestEvmTx(lastBlockHeight);
                    const isFirst = await claimWinner(total, {
                      id: evmWinnerTx.id,
                      type: 'evm',
                      blockHeight: lastBlockHeight,
                      proposer: evmWinnerTx.proposer,
                    });
                    if (isFirst) {
                      emit({ type: 'winner', data: {
                        transaction: { ...evmWinnerTx, number: total, timestamp: Date.now(), status: 'sealed' },
                        total,
                        milestone: TARGET_MILESTONE,
                        timestamp: Date.now(),
                      }});
                    }
                  }
                }
              }
            }
          }

          // ── Cadence block polling ─────────────────────────────────────────
          const block = await fetchLatestBlock();
          if (!block) {
            emit({ type: 'heartbeat', data: { timestamp: Date.now() } });
            return;
          }

          const blockHeight = parseInt(block.header.height, 10);

          if (blockHeight <= lastBlockHeight) {
            emit({ type: 'heartbeat', data: { timestamp: Date.now(), blockHeight } });
            return;
          }

          // New block — fetch real Cadence tx count + sample tx IDs in parallel
          const [cadenceDelta, sampleTxs] = await Promise.all([
            fetchBlockTxCount(block.header.id),
            fetchSampleTxIds(block.header.id, blockHeight),
          ]);

          // null means the API call failed — do NOT advance lastBlockHeight.
          // We'll retry on the next poll cycle rather than permanently skip the block.
          if (cadenceDelta === null) {
            console.error(`Block ${blockHeight} tx count unavailable, will retry next poll`);
            emit({ type: 'heartbeat', data: { timestamp: Date.now(), blockHeight } });
            return;
          }

          if (cadenceDelta > 0) {
            // Atomic RPC: only the first SSE instance to call this for a given
            // block height advances the counter. Concurrent callers get updated=false.
            const { data: result } = await supabase.rpc('increment_cadence', {
              block_height_new: blockHeight,
              cadence_delta: cadenceDelta,
            });

            if (result) {
              cadenceCount = result.cadence_count;
              evmCount = result.evm_count;
              lastBlockHeight = blockHeight;
              const total = result.total;

              if (result.updated) {
                const txsToEmit = sampleTxs.length > 0
                  ? sampleTxs
                  : [{ id: block.header.id.slice(0, 40), type: 'cadence' as const, proposer: `0x${block.header.id.slice(0, 16)}`, blockHeight, simulated: false }];

                const firstTx = { ...txsToEmit[0], number: total, blockTxCount: cadenceDelta, timestamp: Date.now(), status: 'sealed' };
                emit({ type: 'transaction', data: firstTx });

                for (const tx of txsToEmit.slice(1)) {
                  emit({ type: 'transaction', data: { ...tx, number: total, timestamp: Date.now(), status: 'sealed', countedInFirst: true } });
                }

                if (total >= TARGET_MILESTONE) {
                  const isFirst = await claimWinner(total, {
                    id: firstTx.id,
                    type: firstTx.type,
                    blockHeight,
                    proposer: firstTx.proposer,
                  });
                  if (isFirst) {
                    emit({ type: 'winner', data: {
                      transaction: firstTx,
                      total,
                      milestone: TARGET_MILESTONE,
                      timestamp: Date.now(),
                    }});
                  }
                }
              }
            }
          } else {
            // Empty block — advance local height tracker only.
            // No DB write: the next non-empty block's increment_cadence call will
            // still satisfy the WHERE condition (new_height > last_block_height_in_db).
            lastBlockHeight = blockHeight;
          }

          emit({ type: 'heartbeat', data: { timestamp: Date.now(), blockHeight } });
        } catch (err) {
          console.error('Poll error:', err);
          emit({ type: 'heartbeat', data: { timestamp: Date.now() } });
        }
      };

      await poll();
      const intervalId = setInterval(poll, POLL_INTERVAL);

      request.signal.addEventListener('abort', () => {
        isRunning = false;
        clearInterval(intervalId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
    },
  });
}

async function claimWinner(
  total: number,
  tx: { id: string; type: string; blockHeight: number; proposer: string }
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('claim_winner', {
      p_milestone: TARGET_MILESTONE,
      p_transaction_id: tx.id,
      p_transaction_type: tx.type,
      p_block_height: tx.blockHeight,
      p_proposer: tx.proposer,
      p_total: total,
    });
    return data === true;
  } catch (err) {
    console.error('CRITICAL: claimWinner RPC failed — winner may not be recorded in DB!', {
      milestone: TARGET_MILESTONE,
      txId: tx.id,
      txType: tx.type,
      blockHeight: tx.blockHeight,
      total,
      error: String(err),
    });
    return false;
  }
}
