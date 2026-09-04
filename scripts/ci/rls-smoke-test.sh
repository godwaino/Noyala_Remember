#!/bin/bash
# Cross-user RLS isolation smoke test for CI. Seeds two fake users directly
# (test-only — never do this against a real project) and confirms one
# cannot read, write or delete the other's rows. Complements, but does not
# replace, the verification already run against a live Supabase project
# for Stage 1 — see docs/stage-reports/stage-1.md.
set -u

USER_A=aaaaaaaa-0000-0000-0000-000000000001
USER_B=bbbbbbbb-0000-0000-0000-000000000002
PASS=0
FAIL=0

psql -v ON_ERROR_STOP=1 <<SQL
insert into auth.users (id, email) values
  ('$USER_A', 'a@example.com'),
  ('$USER_B', 'b@example.com');

insert into public.profiles (user_id, display_name, timezone, preferred_reminder_channel) values
  ('$USER_A', 'User A', 'Europe/London', 'email'),
  ('$USER_B', 'User B', 'Europe/London', 'email');

insert into public.people (id, user_id, first_name, relationship_type) values
  ('aaaaaaaa-1111-0000-0000-000000000001', '$USER_A', 'Alice-Friend', 'friend'),
  ('bbbbbbbb-1111-0000-0000-000000000002', '$USER_B', 'Bob-Friend', 'friend');

insert into public.important_dates (id, user_id, person_id, type, label, month, day, timezone) values
  ('aaaaaaaa-2222-0000-0000-000000000001', '$USER_A', 'aaaaaaaa-1111-0000-0000-000000000001', 'birthday', 'Birthday', 6, 1, 'Europe/London');

insert into public.memories (id, user_id, person_id, content) values
  ('aaaaaaaa-3333-0000-0000-000000000001', '$USER_A', 'aaaaaaaa-1111-0000-0000-000000000001', 'A secret about Alice');

insert into public.outbox_jobs (id, type, payload, deduplication_key) values
  ('aaaaaaaa-6666-0000-0000-000000000001', 'reminder.deliver', '{}', 'job-a');
SQL

as_user_a() {
  psql -t -A -c "
    set role authenticated;
    select set_config('request.jwt.claim.sub', '$USER_A', false);
    $1
  " 2>&1
}

as_service_role() {
  psql -t -A -c "
    set role service_role;
    $1
  " 2>&1
}

expect_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" == "$expected" ]; then
    echo "PASS: $label"; PASS=$((PASS+1))
  else
    echo "FAIL: $label (expected [$expected], got [$actual])"; FAIL=$((FAIL+1))
  fi
}

expect_error() {
  local label="$1" output="$2"
  if echo "$output" | grep -qi "row-level security\|permission denied"; then
    echo "PASS: $label"; PASS=$((PASS+1))
  else
    echo "FAIL: $label (expected an RLS/permission error, got: $output)"; FAIL=$((FAIL+1))
  fi
}

out=$(as_user_a "select count(*) from people;" | tail -1)
expect_eq "user A sees only their own person" "1" "$out"

out=$(as_user_a "select count(*) from people where user_id = '$USER_B';" | tail -1)
expect_eq "user A cannot see user B's person" "0" "$out"

out=$(as_user_a "insert into people (user_id, first_name, relationship_type) values ('$USER_B', 'Eve', 'other');")
expect_error "cross-user INSERT into people is rejected" "$out"

out=$(as_user_a "select coalesce(string_agg(content, '|'), '') from memories where user_id = '$USER_B';" | tail -1)
expect_eq "user A cannot read user B's memory content" "" "$out"

out=$(as_user_a "select count(*) from outbox_jobs;" | tail -1)
expect_eq "authenticated role sees zero outbox jobs (default-deny, no policy)" "0" "$out"

out=$(as_service_role "select count(*) from outbox_jobs;" | tail -1)
expect_eq "service_role bypasses RLS and sees the outbox job" "1" "$out"

out=$(as_user_a "select * from claim_outbox_job('reminder.deliver');")
expect_error "authenticated role cannot execute claim_outbox_job" "$out"

echo "==================================="
echo "RLS smoke test: $PASS passed, $FAIL failed"
echo "==================================="
exit $FAIL
