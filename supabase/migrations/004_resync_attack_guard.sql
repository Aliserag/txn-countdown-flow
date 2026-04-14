-- Harden resync_state against inflation attacks.
--
-- The anon key is required to call PostgREST endpoints, and while it is stored
-- server-side only (non-NEXT_PUBLIC env var), it is not a revocable secret. An
-- attacker who obtains it could POST directly to the RPC endpoint with a
-- p_cadence value of e.g. 999_900_000 — passing the existing non-regression
-- guard (p_cadence >= cadence_count) while jumping the counter by hundreds of
-- millions, then waiting a single real block to cross 1B.
--
-- Mitigation: cap the per-call increase for each component at 20M. This comfortably
-- covers months of legitimate offline growth (natural rate: ~157 K cadence tx/day)
-- while making a single-call inflation attack impossible.
--
-- The ideal long-term fix is to revoke GRANT TO anon and use the service-role key
-- server-side. This SQL guard provides defence-in-depth in the meantime.

CREATE OR REPLACE FUNCTION resync_state(
  p_cadence      BIGINT,
  p_evm          BIGINT,
  p_block_height BIGINT,
  p_evm_total    BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INT;
  s             transaction_state%ROWTYPE;
BEGIN
  UPDATE transaction_state
  SET cadence_count     = p_cadence,
      evm_count         = p_evm,
      last_block_height = p_block_height,
      last_evm_total    = p_evm_total,
      last_evm_sync     = NOW(),
      updated_at        = NOW()
  WHERE id = 1
    -- Per-component non-regression (from migration 003)
    AND p_cadence >= cadence_count
    AND p_evm     >= evm_count
    AND (p_cadence + p_evm) > (cadence_count + evm_count)
    -- Per-call increase cap: blocks single-request inflation attacks.
    -- 20M allows for ~4 months of downtime; attacker cannot jump 100M+ in one call.
    AND p_cadence <= cadence_count + 20000000
    AND p_evm     <= evm_count     + 20000000;

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

GRANT EXECUTE ON FUNCTION resync_state(BIGINT, BIGINT, BIGINT, BIGINT) TO anon;
