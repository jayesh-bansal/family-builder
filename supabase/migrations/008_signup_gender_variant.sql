-- Update handle_new_user() to capture gender and family_variant from auth metadata.
-- This ensures that when a user signs up with gender and variant selected,
-- those values are saved to their profile immediately.

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

  insert into public.profiles (id, full_name, email, phone, gender, family_variant)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'gender', null),
    coalesce(new.raw_user_meta_data->>'family_variant', 'global')
  );
  return new;
end;
$$ language plpgsql security definer;
