-- Circle invitation expiry + a pre-auth lookup path (web redesign,
-- /invite/[token]).
--
-- 1. circle_invitations had no expiry at all — a pending invitation stayed
--    "valid" forever, and the design's "expired" state had nothing behind
--    it. Adds `expires_at`, defaulting to 14 days from creation.
--
-- 2. The invite page is deliberately reachable before sign-in (a person
--    clicks the link, then decides whether to sign in and accept). Every
--    existing circle_invitations RLS policy requires either managing the
--    circle or being signed in as the invitee (auth.email() match) — an
--    anonymous visitor satisfies neither, so there is no direct-select
--    path to look the invitation up by token. get_circle_invitation_by_token
--    is a narrow SECURITY DEFINER function granted to `anon`, returning
--    only what the page needs to render its state (never the inviter's
--    identity or the circle's other members).

alter table public.circle_invitations
  add column expires_at timestamptz not null default (now() + interval '14 days');

comment on column public.circle_invitations.expires_at is
  'Set at insert time (default now() + 14 days), not computed at read '
  'time, so a later change to the default window does not retroactively '
  'expire or extend invitations already sent.';

create or replace function public.get_circle_invitation_by_token(invitation_token uuid)
returns table (
  state text,
  circle_name text,
  invited_email text,
  role text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.circle_invitations;
  found_circle_name text;
begin
  select * into inv
  from public.circle_invitations
  where token = invitation_token;

  if inv is null then
    return query select 'invalid'::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  select c.name into found_circle_name
  from public.circles c
  where c.id = inv.circle_id;

  return query select
    case
      when inv.status = 'accepted' then 'accepted'
      when inv.status in ('declined', 'revoked') then 'withdrawn'
      when inv.status = 'pending' and inv.expires_at <= now() then 'expired'
      else 'valid'
    end,
    found_circle_name,
    inv.invited_email,
    inv.role,
    inv.expires_at;
end;
$$;

comment on function public.get_circle_invitation_by_token(uuid) is
  'Pre-auth lookup for /invite/[token]. Returns a single derived `state` '
  '(valid/expired/withdrawn/accepted/invalid) rather than raw status so '
  'the page never has to duplicate the expiry/status logic. Deliberately '
  'excludes invited_by_user_id and anything about other circle members.';

revoke all on function public.get_circle_invitation_by_token(uuid) from public;
grant execute on function public.get_circle_invitation_by_token(uuid) to anon, authenticated;
