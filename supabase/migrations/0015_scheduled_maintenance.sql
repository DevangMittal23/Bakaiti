-- Daily scoring is idempotent across retries, scheduler replicas and time-window calls.
BEGIN;
CREATE TABLE public.maintenance_runs (
  job_name text NOT NULL,
  run_date date NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_name, run_date)
);
ALTER TABLE public.maintenance_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.maintenance_runs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_scheduled_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  now_utc timestamp := now() AT TIME ZONE 'UTC';
  inserted integer;
  score_result text := 'skipped';
BEGIN
  PERFORM public.expire_stale_pulses();
  IF extract(hour FROM now_utc) >= 3 THEN
    INSERT INTO public.maintenance_runs (job_name, run_date)
    VALUES ('signal_scores', now_utc::date) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    IF inserted = 1 THEN
      PERFORM public.calculate_all_signal_scores();
      score_result := 'ok';
    END IF;
  END IF;
  RETURN jsonb_build_object('pulse_cleanup', 'ok', 'signal_scores', score_result);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_scheduled_maintenance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_maintenance() TO service_role;
COMMIT;
