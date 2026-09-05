#!/bin/bash
# Outbox crash-recovery smoke test for CI. Verifies claim_outbox_job's
# stale-processing reclaim (see 20260905000000_reclaim_stale_outbox_jobs.sql)
# — a real gap review.md flagged: a worker that crashes after claiming a
# job but before recording success/failure must not leave that job stuck
# forever, but a job that's already exhausted its attempts must dead-letter
# rather than be reclaimed forever.
set -u
PASS=0
FAIL=0

psql -v ON_ERROR_STOP=1 <<'SQL'
insert into public.outbox_jobs (id, type, payload, deduplication_key, status, attempt_count, max_attempts, updated_at) values
  ('dddddddd-0001-0000-0000-000000000001', 'crash.test', '{}', 'crash-fresh', 'pending', 0, 5, now()),
  ('dddddddd-0002-0000-0000-000000000002', 'crash.test', '{}', 'crash-stale-retriable', 'processing', 2, 5, now() - interval '15 minutes'),
  ('dddddddd-0003-0000-0000-000000000003', 'crash.test', '{}', 'crash-stale-exhausted', 'processing', 5, 5, now() - interval '15 minutes'),
  ('dddddddd-0004-0000-0000-000000000004', 'crash.test', '{}', 'crash-recent-processing', 'processing', 1, 5, now() - interval '1 minute');
SQL

as_service_role() {
  # `SET ROLE` emits its own "SET" status line even under -t -A, so only
  # the final line is the actual query result.
  psql -t -A -c "set role service_role; $1" 2>&1 | tail -1
}

expect_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" == "$expected" ]; then
    echo "PASS: $label"; PASS=$((PASS+1))
  else
    echo "FAIL: $label (expected [$expected], got [$actual])"; FAIL=$((FAIL+1))
  fi
}

# Claim four times: fresh pending, stale-but-retriable processing, the
# stale-exhausted one (dead-lettered, claims nothing), then nothing left
# (the 1-minute-stale job is well under the 10-minute threshold).
as_service_role "select * from claim_outbox_job('crash.test');" >/dev/null
as_service_role "select * from claim_outbox_job('crash.test');" >/dev/null
as_service_role "select * from claim_outbox_job('crash.test');" >/dev/null
as_service_role "select * from claim_outbox_job('crash.test');" >/dev/null

out=$(as_service_role "select status || ':' || attempt_count from outbox_jobs where deduplication_key = 'crash-fresh';")
expect_eq "fresh pending job claimed normally" "processing:1" "$out"

out=$(as_service_role "select status || ':' || attempt_count from outbox_jobs where deduplication_key = 'crash-stale-retriable';")
expect_eq "stale processing job with attempts left is reclaimed" "processing:3" "$out"

out=$(as_service_role "select status from outbox_jobs where deduplication_key = 'crash-stale-exhausted';")
expect_eq "stale processing job with no attempts left is dead-lettered" "dead_letter" "$out"

out=$(as_service_role "select status from outbox_jobs where deduplication_key = 'crash-recent-processing';")
expect_eq "recently-claimed processing job is left alone" "processing" "$out"

echo "==================================="
echo "Outbox smoke test: $PASS passed, $FAIL failed"
echo "==================================="
exit $FAIL
