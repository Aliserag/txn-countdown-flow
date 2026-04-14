-- All four functions are SECURITY DEFINER: they run as their owner (postgres superuser)
-- regardless of what role calls them. This lets the anon key invoke them while RLS
-- blocks the anon role from directly mutating either table.
--
-- Atomicity guarantee: each function does a single conditional UPDATE statement.
-- PostgreSQL UPDATE is atomic — there is no TOCTOU window. Two concurrent callers
-- racing on the same block height: exactly one UPDATE matches the WHERE condition
-- and gets ROW_COUNT = 1; the other gets ROW_COUNT = 0 and returns updated=false.

-- ─── increment_cadence ────────────────────────────────────────────────────────
-- Advances cadence_count and last_block_height only if block_height_new is strictly
-- greater than the current last_block_height. Safe to call concurrently from
-- multiple SSE instances; only the first caller for each block height wins.
CREATE OR REPLACE FUNCTION increment_cadence(block_height_new INTEGER, cadence_delta BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
  s             transaction_state%ROWTYPE;
BEGIN
  UPDATE transaction_state
  SET cadence_count     = cadence_count + cadence_delta,
      last_block_height = block_height_new,
      updated_at        = NOW()
  WHERE id = 1
    AND last_block_height < block_height_new;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  SELECT * INTO s FROM transaction_state WHERE id = 1;

  RETURN jsonb_build_object(
    'cadence_count', s.cadence_count,
    'evm_count',     s.evm_count,
    'total',         s.cadence_count + s.evm_count,
    'updated',       rows_affected > 0
  );
END;
$$;

-- ─── sync_evm ─────────────────────────────────────────────────────────────────
-- Updates evm_count by the delta between the new live EVM total and the watermark
-- (last_evm_total). Only fires if new_evm_total > last_evm_total.
-- Multiple concurrent callers for the same new_evm_total: exactly one wins.
CREATE OR REPLACE FUNCTION sync_evm(new_evm_total BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
  s             transaction_state%ROWTYPE;
BEGIN
  UPDATE transaction_state
  SET evm_count      = evm_count + (new_evm_total - last_evm_total),
      last_evm_total = new_evm_total,
      last_evm_sync  = NOW(),
      updated_at     = NOW()
  WHERE id = 1
    AND last_evm_total < new_evm_total;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  SELECT * INTO s FROM transaction_state WHERE id = 1;

  RETURN jsonb_build_object(
    'cadence_count', s.cadence_count,
    'evm_count',     s.evm_count,
    'total',         s.cadence_count + s.evm_count,
    'updated',       rows_affected > 0
  );
END;
$$;

-- ─── resync_state ─────────────────────────────────────────────────────────────
-- Force-writes all four counter fields. Used on startup when DB state is stale.
-- The caller must pass a p_total_guard: the update only fires if p_cadence + p_evm
-- is strictly greater than the current cadence_count + evm_count. This prevents
-- overwriting a higher accurate DB value with a lower live-API estimate.
CREATE OR REPLACE FUNCTION resync_state(
  p_cadence      BIGINT,
  p_evm          BIGINT,
  p_block_height INTEGER,
  p_evm_total    BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
  s             transaction_state%ROWTYPE;
BEGIN
  -- Only overwrite if the supplied estimate is larger than what we already have
  UPDATE transaction_state
  SET cadence_count     = p_cadence,
      evm_count         = p_evm,
      last_block_height = p_block_height,
      last_evm_total    = p_evm_total,
      last_evm_sync     = NOW(),
      updated_at        = NOW()
  WHERE id = 1
    AND (p_cadence + p_evm) > (cadence_count + evm_count);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  SELECT * INTO s FROM transaction_state WHERE id = 1;

  RETURN jsonb_build_object(
    'cadence_count', s.cadence_count,
    'evm_count',     s.evm_count,
    'total',         s.cadence_count + s.evm_count,
    'updated',       rows_affected > 0
  );
END;
$$;

-- ─── claim_winner ─────────────────────────────────────────────────────────────
-- Inserts a prize winner record. The UNIQUE(milestone) constraint guarantees that
-- only one row is ever inserted per milestone value. Returns TRUE only for the
-- very first successful insert (all subsequent calls for the same milestone return
-- FALSE via ON CONFLICT DO NOTHING + the NULL check on inserted_id).
CREATE OR REPLACE FUNCTION claim_winner(
  p_milestone        BIGINT,
  p_transaction_id   TEXT,
  p_transaction_type TEXT,
  p_block_height     INTEGER,
  p_proposer         TEXT,
  p_total            BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_id INTEGER;
BEGIN
  INSERT INTO milestone_winner
    (milestone, transaction_id, transaction_type, block_height, proposer, total_at_detection)
  VALUES
    (p_milestone, p_transaction_id, p_transaction_type, p_block_height, p_proposer, p_total)
  ON CONFLICT (milestone) DO NOTHING
  RETURNING id INTO inserted_id;

  RETURN inserted_id IS NOT NULL;
END;
$$;

-- Grant execute to anon so the server-side Next.js code (using the anon key) can call these
GRANT EXECUTE ON FUNCTION increment_cadence(INTEGER, BIGINT)            TO anon;
GRANT EXECUTE ON FUNCTION sync_evm(BIGINT)                              TO anon;
GRANT EXECUTE ON FUNCTION resync_state(BIGINT, BIGINT, INTEGER, BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION claim_winner(BIGINT, TEXT, TEXT, INTEGER, TEXT, BIGINT) TO anon;
