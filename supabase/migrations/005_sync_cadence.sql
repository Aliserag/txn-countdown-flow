-- sync_cadence: set cadence_count to the authoritative live total from Find Labs.
--
-- Unlike sync_evm (which uses a delta from a watermark), the Find Labs API
-- returns an absolute transaction count. We set cadence_count directly.
--
-- Safety guards:
--   • Allows a downward correction of up to 1 000 transactions — enough to fix
--     the ~167-txn overcount introduced by a one-time manual baseline adjustment,
--     but too small for an attacker to exploit (halving the count, etc.).
--   • Blocks single-call inflation attacks with the same 20 M cap used in
--     resync_state (migration 004).
--
-- Intended usage: called every ~30 s alongside sync_evm. When FINDLABS_USERNAME /
-- FINDLABS_PASSWORD are set AND the account has the "status/v1" API group enabled,
-- the SSE route calls this automatically to keep cadence_count in sync with
-- the same source flowscan.io uses.

CREATE OR REPLACE FUNCTION sync_cadence(new_cadence_total BIGINT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
  s             transaction_state%ROWTYPE;
BEGIN
  UPDATE transaction_state
  SET cadence_count = new_cadence_total,
      updated_at    = NOW()
  WHERE id = 1
    -- Allow a small downward correction (fixes baseline overcount).
    AND new_cadence_total >= cadence_count - 1000
    -- Inflation guard: no single call can jump the counter by more than 20 M.
    AND new_cadence_total <= cadence_count + 20000000;

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

GRANT EXECUTE ON FUNCTION sync_cadence(BIGINT) TO anon;
