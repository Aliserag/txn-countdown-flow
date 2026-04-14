import { NextResponse } from 'next/server';
import { supabase, TransactionState } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EVM_FLOWSCAN_API = 'https://evm.flowscan.io/api/v2';
const FLOW_ACCESS_API = 'https://rest-mainnet.onflow.org/v1';

async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
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

export async function GET() {
  try {
    // Read DB state + live EVM in parallel
    const [dbResult, evmResult, blockResult] = await Promise.all([
      supabase.from('transaction_state').select('*').eq('id', 1).single<TransactionState>(),
      fetchWithTimeout(`${EVM_FLOWSCAN_API}/stats`).then(r => r.json()).catch(err => { console.error('EVM stats fetch failed:', err); return null; }),
      fetchWithTimeout(`${FLOW_ACCESS_API}/blocks?height=sealed`).then(r => r.json()).catch(err => { console.error('Block height fetch failed:', err); return null; }),
    ]);

    const dbState = dbResult.data;
    if (!dbState) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const liveEvm = parseInt(evmResult?.total_transactions || '0', 10);
    const blockHeight = blockResult?.[0]?.header?.height
      ? parseInt(blockResult[0].header.height, 10)
      : dbState.last_block_height;

    // If live EVM is fresher, sync it into DB
    let evmCount = dbState.evm_count;
    if (liveEvm > dbState.last_evm_total) {
      const { data: synced, error: syncError } = await supabase.rpc('sync_evm', { new_evm_total: liveEvm });
      if (syncError) {
        console.error('sync_evm RPC failed in /api/stats:', syncError);
      } else if (synced) {
        evmCount = synced.evm_count;
      }
    }

    return NextResponse.json(
      {
        total: dbState.cadence_count + evmCount,
        cadence: dbState.cadence_count,
        evm: evmCount,
        blockHeight,
        timestamp: Date.now(),
      },
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
