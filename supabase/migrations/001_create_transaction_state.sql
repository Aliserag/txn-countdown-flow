-- Singleton row: the single authoritative source of truth for all transaction counts.
-- All mutations go through SECURITY DEFINER RPC functions (see 002_rpc_functions.sql).
-- Anon key can SELECT; it cannot INSERT/UPDATE/DELETE directly.

CREATE TABLE IF NOT EXISTS transaction_state (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  cadence_count    BIGINT   NOT NULL DEFAULT 0,
  evm_count        BIGINT   NOT NULL DEFAULT 0,
  last_block_height INTEGER NOT NULL DEFAULT 0,
  -- last_evm_total is the raw total from the Flowscan EVM API.
  -- evm_count is the running delta we've tracked since the baseline was set.
  -- After resync_state, last_evm_total = evm_count (they're equal at the seed point).
  -- After sync_evm(N):  evm_count += (N - last_evm_total), last_evm_total = N.
  last_evm_total   BIGINT   NOT NULL DEFAULT 0,
  last_evm_sync    TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with April 13 2026 baseline values from flowscan.io / evm.flowscan.io
INSERT INTO transaction_state (id, cadence_count, evm_count, last_block_height, last_evm_total)
VALUES (1, 907924122, 60766734, 148358201, 60766734)
ON CONFLICT (id) DO NOTHING;

-- Prize winner record. UNIQUE(milestone) is the on-chain-equivalent guarantee:
-- exactly one row can ever be inserted for a given milestone value.
CREATE TABLE IF NOT EXISTS milestone_winner (
  id                SERIAL PRIMARY KEY,
  milestone         BIGINT NOT NULL UNIQUE,
  transaction_id    TEXT   NOT NULL,
  transaction_type  TEXT   NOT NULL CHECK (transaction_type IN ('cadence', 'evm')),
  block_height      INTEGER NOT NULL,
  proposer          TEXT,
  total_at_detection BIGINT NOT NULL,
  detected_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: enabled with read-only policy for anon.
-- All writes go through SECURITY DEFINER functions which run as the owner (postgres).
ALTER TABLE transaction_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read" ON transaction_state FOR SELECT TO anon USING (true);

ALTER TABLE milestone_winner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read" ON milestone_winner FOR SELECT TO anon USING (true);
