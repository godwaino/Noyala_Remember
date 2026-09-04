-- Local development seed only. Never run against a production project;
-- Supabase's local stack runs this automatically on `supabase db reset`.
-- No real personal information — see Master Build Prompt §17.

-- A single fake auth user so people/important_dates/memories have an owner
-- to be RLS-scoped to. Password is "noyala-dev-seed" — local dev only.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'dev@noyala.test',
  crypt('noyala-dev-seed', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (
  user_id, display_name, timezone, locale, default_tone,
  preferred_reminder_channel, onboarding_completed_at
) values (
  '11111111-1111-1111-1111-111111111111',
  'Dev User',
  'Europe/London',
  'en',
  'thoughtful',
  'email',
  now()
)
on conflict (user_id) do nothing;

-- People -----------------------------------------------------------------

insert into public.people (id, user_id, first_name, last_name, relationship_type, notes)
values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
    'Amara', 'Okafor', 'friend', 'Met at university; loves ceramics.'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
    'Priya', 'Nair', 'family', 'Cousin; birth year not shared with the family.'),
  ('23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
    'James', 'Whitfield', 'colleague', 'Former manager, stays in touch quarterly.'),
  ('24444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
    'Sofia', 'Bianchi', 'partner', 'Leap-day birthday.')
on conflict (id) do nothing;

-- Important dates ----------------------------------------------------------
-- Computed relative to CURRENT_DATE so a fresh `supabase db reset` always
-- has a "today", "+1 day", "+7 days" and "+14 days" case to look at locally.
-- Automated tests must freeze the clock instead of relying on this file —
-- see packages/domain's date-logic tests once Stage 2 adds them.

insert into public.important_dates (user_id, person_id, type, label, month, day, year, timezone)
values
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111',
    'birthday', 'Birthday', extract(month from current_date)::int, extract(day from current_date)::int,
    1994, 'Europe/London'),
  ('11111111-1111-1111-1111-111111111111', '23333333-3333-3333-3333-333333333333',
    'birthday', 'Birthday', extract(month from current_date + 1)::int, extract(day from current_date + 1)::int,
    1985, 'Europe/London'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
    'birthday', 'Birthday', extract(month from current_date + 7)::int, extract(day from current_date + 7)::int,
    null, 'Europe/London'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111',
    'anniversary', 'Friendship anniversary', extract(month from current_date + 14)::int, extract(day from current_date + 14)::int,
    2016, 'Europe/London'),
  ('11111111-1111-1111-1111-111111111111', '24444444-4444-4444-4444-444444444444',
    'birthday', 'Birthday', 2, 29, 2000, 'Europe/London');

-- Memories -----------------------------------------------------------------

insert into public.memories (user_id, person_id, content, category, sensitivity)
values
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111',
    'Just started a pottery class on Tuesday evenings.', 'interest', 'standard'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111',
    'Going through a difficult breakup this spring.', 'general', 'sensitive'),
  ('11111111-1111-1111-1111-111111111111', '23333333-3333-3333-3333-333333333333',
    'Recently promoted to VP of Engineering.', 'work', 'standard');

-- Message history (previous-message history) --------------------------------

insert into public.message_history (user_id, person_id, final_content, channel, action, acted_at)
values (
  '11111111-1111-1111-1111-111111111111',
  '23333333-3333-3333-3333-333333333333',
  'Happy birthday, James! Hope the new role is treating you well.',
  'email',
  'marked_sent',
  now() - interval '1 year'
);
