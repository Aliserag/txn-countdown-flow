import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side only — never import in client components.
// Lazy singleton so the client isn't created at module load time during build.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

// Convenience re-export for callers that want direct access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export interface TransactionState {
  id: number;
  cadence_count: number;
  evm_count: number;
  last_block_height: number;
  last_evm_total: number;
  last_evm_sync: string;
  updated_at: string;
}

export interface MilestoneWinner {
  id: number;
  milestone: number;
  transaction_id: string;
  transaction_type: string;
  block_height: number;
  proposer: string;
  total_at_detection: number;
  detected_at: string;
}
