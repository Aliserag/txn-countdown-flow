import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side only — never import in client components.
// Uses the anon key; mutations are gated behind SECURITY DEFINER RPC functions
// which enforce atomicity and run as postgres (bypassing RLS).
// The anon key is stored as a non-NEXT_PUBLIC env var so it never reaches the browser.

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

// Direct named export — no Proxy indirection
export const supabase = {
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args),
  rpc: (...args: Parameters<SupabaseClient['rpc']>) => getSupabase().rpc(...args),
} as unknown as SupabaseClient;

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
