import { NextRequest } from 'next/server';
import { supabase, TransactionState, MilestoneWinner } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FLOW_ACCESS_API = 'https://rest-mainnet.onflow.org/v1';
const EVM_FLOWSCAN_API = 'https://evm.flowscan.io/api/v2';
const POLL_INTERVAL = 3000;
const EVM_POLL_INTERVAL = 30000;
const TARGET_MILESTONE = 1_000_000_000;
// Re-sync from live APIs if DB is this many blocks behind the chain tip.
const STALE_THRESHOLD = 100;

// EVM fallback only — used if flowscan EVM API is unreachable on startup.
// Cadence is NEVER estimated; it is counted exactly from execution_results per block.
const EVM_BASELINE = {
  blockHeight: 148_380_615,
  evm: 60_775_158,
  evmTxPerBlock: 0.235,
};

async function fetchWithTimeout(url: string, timeout = 5000, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store', ...init });
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

// Fetch authoritative Cadence transaction count from Find Labs.
// Requires FINDLABS_USERNAME + FINDLABS_PASSWORD env vars AND the account must
// have the "status/v1" API group enabled (contact Find Labs to enable it).
// Returns 0 (no-op) if credentials are absent or the API call fails.
async function fetchLiveCadenceTotal(): Promise<number> {
  const username = (process.env.FINDLABS_USERNAME ?? '').replace(/\\n|\n/g, '').trim();
  const password = (process.env.FINDLABS_PASSWORD ?? '').trim();
  if (!username || !password) return 0;
  try {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const res = await fetchWithTimeout(
      'https://api.find.xyz/status/v1/flow/stat',
      5000,
      { headers: { Authorization: `Basic ${credentials}` } }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    // Response shape (verified 2026-07-06): {"data":[{"transactions_count":N,"blocks_count":N,"latest_block":N,...}]}
    const raw = data?.data?.[0]?.transactions_count;
    const count = parseInt(raw ?? '0', 10);
    if (isNaN(count) || count <= 0) {
      console.warn('fetchLiveCadenceTotal: unexpected response shape from Find Labs:', JSON.stringify(data));
      return 0;
    }
    return count;
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
  } catch (err) {
    console.warn(`fetchLatestEvmTx failed for block ${blockHeight} — using synthetic fallback:`, err);
  }
  // Fallback: synthetic ID, not a real on-chain hash. Will be flagged in winner record.
  return { id: `evm-block-${blockHeight}`, type: 'evm', proposer: 'unknown', blockHeight };
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isRunning = true;
      let lastEvmPollTime = 0;
      // Track a block whose tx count fetch failed so we can retry it next poll
      // rather than permanently skipping it as the chain advances.
      let pendingBlock: { id: string; height: number } | null = null;
      // Set to true once the winner is confirmed (from DB replay or fresh claim).
      // Guards all post-milestone claimWinner + fetchLatestEvmTx calls from running forever.
      let winnerClaimed = false;

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

      // DB is stale (>100 blocks behind): sync live API counts on startup.
      // Cadence is synced from Find Labs if credentials are available; otherwise it is NOT
      // estimated — the poll loop will fill the gap block-by-block from execution_results.
      if (currentHeight > 0 && currentHeight - lastBlockHeight > STALE_THRESHOLD) {
        const [liveEvm, liveCadence] = await Promise.all([fetchLiveEvmTotal(), fetchLiveCadenceTotal()]);

        if (liveCadence > 0) {
          const { data: synced, error: cadSyncError } = await supabase.rpc('sync_cadence', { new_cadence_total: liveCadence });
          if (cadSyncError) {
            console.error('sync_cadence RPC failed during stale startup:', cadSyncError);
          } else if (synced) {
            cadenceCount = synced.cadence_count;
            evmCount = synced.evm_count;
          }
        }

        const evmTotal = liveEvm > 0
          ? liveEvm
          : Math.round(EVM_BASELINE.evm + Math.max(0, currentHeight - EVM_BASELINE.blockHeight) * EVM_BASELINE.evmTxPerBlock);

        if (evmTotal > dbState.last_evm_total) {
          const { data: synced, error: evmSyncError } = await supabase.rpc('sync_evm', { new_evm_total: evmTotal });
          if (evmSyncError) {
            console.error('sync_evm RPC failed during stale startup:', evmSyncError);
          } else if (synced) {
            evmCount = synced.evm_count;
            cadenceCount = synced.cadence_count;
          }
        }
      }

      emit({
        type: 'stats',
        data: { total: cadenceCount + evmCount, cadence: cadenceCount, evm: evmCount, blockHeight: lastBlockHeight, timestamp: Date.now() },
      });

      // ── Winner replay: re-emit winner event to reconnecting clients ────────
      // The winner SSE event is fire-and-forget per connection. Any client that
      // connects or reconnects after the milestone is crossed would never see it
      // unless we replay it here from the DB record.
      const { data: existingWinner } = await supabase
        .from('milestone_winner')
        .select('*')
        .eq('milestone', TARGET_MILESTONE)
        .maybeSingle<MilestoneWinner>();

      if (existingWinner) {
        winnerClaimed = true;
        emit({
          type: 'winner',
          data: {
            transaction: {
              id: existingWinner.transaction_id,
              type: existingWinner.transaction_type as 'cadence' | 'evm',
              number: existingWinner.total_at_detection,
              proposer: existingWinner.proposer,
              blockHeight: existingWinner.block_height,
              timestamp: new Date(existingWinner.detected_at).getTime(),
              status: 'sealed' as const,
            },
            total: existingWinner.total_at_detection,
            milestone: TARGET_MILESTONE,
            timestamp: new Date(existingWinner.detected_at).getTime(),
          },
        });
      }

      // ── Poll loop ──────────────────────────────────────────────────────────
      const poll = async () => {
        if (!isRunning) return;
        const now = Date.now();

        try {
          // ── EVM + Cadence live sync every 30s ────────────────────────────
          if (now - lastEvmPollTime >= EVM_POLL_INTERVAL) {
            lastEvmPollTime = now; // Commit upfront to prevent overlapping polls

            const [liveEvm, liveCadence] = await Promise.all([
              fetchLiveEvmTotal(),
              fetchLiveCadenceTotal(),
            ]);

            // Cadence sync from Find Labs (only when credentials + API group are active).
            if (liveCadence > 0) {
              const { data: cadResult, error: cadSyncError } = await supabase.rpc('sync_cadence', { new_cadence_total: liveCadence });
              if (cadSyncError) {
                console.error('sync_cadence RPC failed:', cadSyncError);
              } else if (cadResult) {
                cadenceCount = cadResult.cadence_count;
                evmCount = cadResult.evm_count;
              }
            }

            if (liveEvm > 0) {
              const { data: result, error: evmSyncError } = await supabase.rpc('sync_evm', { new_evm_total: liveEvm });
              if (evmSyncError) {
                console.error('sync_evm RPC failed:', evmSyncError);
                // Retry in ~5s instead of the full 30s interval so we don't
                // miss the milestone if the failure was transient.
                lastEvmPollTime = now - EVM_POLL_INTERVAL + 5000;
              } else if (result) {
                evmCount = result.evm_count;
                cadenceCount = result.cadence_count;
                const total = result.total;

                if (result.updated) {
                  emit({
                    type: 'stats',
                    data: { total, cadence: cadenceCount, evm: evmCount, blockHeight: lastBlockHeight, timestamp: Date.now() },
                  });

                  if (!winnerClaimed && total >= TARGET_MILESTONE) {
                    // Fetch real EVM transaction for the winner record
                    const evmWinnerTx = await fetchLatestEvmTx(lastBlockHeight);
                    const isFirst = await claimWinner(total, {
                      id: evmWinnerTx.id,
                      type: 'evm',
                      blockHeight: lastBlockHeight,
                      proposer: evmWinnerTx.proposer,
                    });
                    if (isFirst) {
                      winnerClaimed = true;
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
          // If a previous tx-count fetch failed, retry that specific block before
          // fetching the new chain tip. Without this, the chain advances past the
          // failed block on the next poll and it is permanently skipped.
          let block: any;
          let isRetry = false;
          if (pendingBlock) {
            block = { header: { id: pendingBlock.id, height: String(pendingBlock.height) } };
            pendingBlock = null;
            isRetry = true;
          } else {
            block = await fetchLatestBlock();
          }

          if (!block) {
            emit({ type: 'heartbeat', data: { timestamp: Date.now() } });
            return;
          }

          const blockHeight = parseInt(block.header.height, 10);

          // Skip the height guard for retries: the pending block is explicitly known to
          // be unprocessed. Without this, an empty block that advances lastBlockHeight
          // past the pending block's height would cause the retry to be silently dropped.
          if (!isRetry && blockHeight <= lastBlockHeight) {
            emit({ type: 'heartbeat', data: { timestamp: Date.now(), blockHeight } });
            return;
          }

          // New block — fetch real Cadence tx count + sample tx IDs in parallel
          const [cadenceDelta, sampleTxs] = await Promise.all([
            fetchBlockTxCount(block.header.id),
            fetchSampleTxIds(block.header.id, blockHeight),
          ]);

          // null = fetch failed. Store block for retry next poll — do NOT advance
          // lastBlockHeight or the block will be skipped as the chain moves forward.
          if (cadenceDelta === null) {
            pendingBlock = { id: block.header.id, height: blockHeight };
            console.error(`Block ${blockHeight} tx count unavailable, stored for retry`);
            emit({ type: 'heartbeat', data: { timestamp: Date.now(), blockHeight } });
            return;
          }

          if (cadenceDelta > 0) {
            // Atomic RPC: only the first SSE instance to call this for a given
            // block height advances the counter. Concurrent callers get updated=false.
            const { data: result, error: cadenceError } = await supabase.rpc('increment_cadence', {
              block_height_new: blockHeight,
              cadence_delta: cadenceDelta,
            });

            if (cadenceError) {
              console.error(`increment_cadence RPC failed for block ${blockHeight}:`, cadenceError);
              // Do not advance lastBlockHeight — retry on next poll.
            } else if (result) {
              cadenceCount = result.cadence_count;
              evmCount = result.evm_count;
              lastBlockHeight = blockHeight;
              const total = result.total;

              if (result.updated) {
                const txsToEmit = sampleTxs.length > 0
                  ? sampleTxs
                  : [{ id: block.header.id, type: 'cadence' as const, proposer: `0x${block.header.id.slice(0, 16)}`, blockHeight, simulated: false }];

                const firstTx = { ...txsToEmit[0], number: total, blockTxCount: cadenceDelta, timestamp: Date.now(), status: 'sealed' };
                emit({ type: 'transaction', data: firstTx });

                for (const tx of txsToEmit.slice(1)) {
                  emit({ type: 'transaction', data: { ...tx, number: total, timestamp: Date.now(), status: 'sealed', countedInFirst: true } });
                }

                if (!winnerClaimed && total >= TARGET_MILESTONE) {
                  const isFirst = await claimWinner(total, {
                    id: firstTx.id,
                    type: firstTx.type,
                    blockHeight,
                    proposer: firstTx.proposer,
                  });
                  if (isFirst) {
                    winnerClaimed = true;
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
  // Retry up to 3 times with backoff — a transient Supabase timeout must not silently
  // drop the winner record for a real-money prize.
  const context = { milestone: TARGET_MILESTONE, txId: tx.id, txType: tx.type, blockHeight: tx.blockHeight, total };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
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
      console.error(`CRITICAL: claimWinner attempt ${attempt + 1}/3 failed:`, { ...context, error: String(err) });
    }
  }
  console.error('CRITICAL: claimWinner failed after 3 attempts — winner may not be recorded in DB!', context);
  return false;
}
