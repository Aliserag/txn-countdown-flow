-- Fix resync_state: require per-component non-regression in addition to total-level check.
-- Previously the guard was only on the sum, allowing cadence to go backward if EVM
-- was sufficiently higher (and vice versa). Now both components must be >= current values.

CREATE OR REPLACE FUNCTION resync_state(
  p_cadence     BIGINT,
  p_evm         BIGINT,
  p_block_height BIGINT,
  p_evm_total   BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  rows_affected INT;
  s             transaction_state%ROWTYPE;
BEGIN
  -- Only overwrite if both components are non-decreasing AND total is strictly higher.
  -- This prevents a stale Cadence estimate from rolling back the Cadence count even
  -- when a high EVM value would have made the sum-level check pass.
  UPDATE transaction_state
  SET cadence_count     = p_cadence,
      evm_count         = p_evm,
      last_block_height = p_block_height,
      last_evm_total    = p_evm_total,
      last_evm_sync     = NOW(),
      updated_at        = NOW()
  WHERE id = 1
    AND p_cadence >= cadence_count
    AND p_evm     >= evm_count
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

GRANT EXECUTE ON FUNCTION resync_state(BIGINT, BIGINT, BIGINT, BIGINT) TO anon;
