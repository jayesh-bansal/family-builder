-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  bio text,
  birth_date date,
  death_date date,
  location text,
  phone text,
  email text,
  is_placeholder boolean default false,
  created_by uuid references public.profiles(id),
  tree_visibility text default 'family_only' check (tree_visibility in ('public', 'family_only', 'private')),
  language_preference text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relationships table
create table public.relationships (
  id uuid default uuid_generate_v4() primary key,
  person_id uuid references public.profiles(id) on delete cascade not null,
  related_person_id uuid references public.profiles(id) on delete cascade not null,
  relationship_type text not null check (relationship_type in (
    'parent', 'child', 'spouse', 'sibling',
    'grandparent', 'grandchild',
    'step_parent', 'step_child',
    'adopted_parent', 'adopted_child',
    'half_sibling', 'godparent', 'godchild',
    'close_friend'
  )),
  is_confirmed boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(person_id, related_person_id, relationship_type)
);

-- Invitations table
create table public.invitations (
  id uuid default uuid_generate_v4() primary key,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  inviter_id uuid references public.profiles(id) on delete cascade not null,
  placeholder_id uuid references public.profiles(id) on delete set null,
  email text not null,
  relationship_type text not null check (relationship_type in (
    'parent', 'child', 'spouse', 'sibling',
    'grandparent', 'grandchild',
    'step_parent', 'step_child',
    'adopted_parent', 'adopted_child',
    'half_sibling', 'godparent', 'godchild',
    'close_friend'
  )),
  status text default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('invite', 'tree_linked', 'member_joined', 'info_updated')),
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.relationships enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (tree_visibility = 'public' or id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid() or created_by = auth.uid());

-- Relationships policies
create policy "Users can view relationships they're part of"
  on public.relationships for select
  using (person_id = auth.uid() or related_person_id = auth.uid() or created_by = auth.uid());

create policy "Users can create relationships"
  on public.relationships for insert
  with check (created_by = auth.uid());

create policy "Users can update relationships they created"
  on public.relationships for update
  using (created_by = auth.uid());

create policy "Users can delete relationships they created"
  on public.relationships for delete
  using (created_by = auth.uid());

-- Invitations policies
create policy "Users can view their invitations"
  on public.invitations for select
  using (inviter_id = auth.uid() or email = auth.email());

create policy "Users can create invitations"
  on public.invitations for insert
  with check (inviter_id = auth.uid());

create policy "Users can update invitations sent to them"
  on public.invitations for update
  using (email = auth.email());

-- Notifications policies
create policy "Users can view their notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update their notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-creating profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- Indexes for performance
create index idx_relationships_person on public.relationships(person_id);
create index idx_relationships_related on public.relationships(related_person_id);
create index idx_invitations_token on public.invitations(token);
create index idx_invitations_email on public.invitations(email);
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id) where is_read = false;
