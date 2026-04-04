-- Fix: handle_new_user() should not create duplicate profiles for the same email.
-- When a user signs up with email/password then later logs in via Google OAuth,
-- Supabase creates a new auth.users entry. This trigger should skip profile creation
-- if a profile with that email already exists (the app-level merge in getProfile.ts
-- handles re-pointing the profile to the new auth user).

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Only create a profile if one doesn't already exist with this email
  if new.email is not null then
    if exists (select 1 from public.profiles where email = new.email) then
      -- Profile already exists for this email; skip creation.
      -- The app-level getProfile() will merge the identity.
      return new;
    end if;
  end if;

  -- Also skip if a profile with this id already exists (idempotency)
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.phone
  );
  return new;
end;
$$ language plpgsql security definer;
