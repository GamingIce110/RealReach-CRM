-- EstateFlow CRM base schema
create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text unique not null,
  role text not null check (role in ('admin','sales_manager','sales_agent','field_executive','social_media_manager')),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  source text not null,
  property_type text not null,
  budget_min bigint,
  budget_max bigint,
  preferred_location text,
  status text not null,
  temperature text not null,
  assigned_agent_id uuid references profiles(id),
  notes text,
  next_followup_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  location text not null,
  address text,
  property_type text not null,
  price bigint not null,
  size text,
  bedrooms int,
  bathrooms int,
  floor text,
  furnishing_status text,
  availability_status text not null,
  description text,
  amenities jsonb not null default '[]'::jsonb,
  developer text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists property_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  file_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists property_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  file_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_property_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  channel text not null,
  share_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  actor_id uuid references profiles(id),
  type text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  agent_id uuid references profiles(id),
  call_sid text,
  conference_sid text,
  status text,
  duration int,
  recording_url text,
  started_at timestamptz,
  ended_at timestamptz,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  agent_id uuid references profiles(id),
  channel text not null,
  template_name text,
  content text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  assigned_to uuid references profiles(id),
  channel text not null,
  template text,
  due_at timestamptz,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id),
  check_in_time timestamptz,
  check_out_time timestamptz,
  check_in_latitude numeric,
  check_in_longitude numeric,
  check_out_latitude numeric,
  check_out_longitude numeric,
  status text,
  notes text,
  selfie_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null,
  caption text,
  media_url text,
  status text not null,
  scheduled_at timestamptz,
  assigned_to uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references profiles(id),
  status text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists integration_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  mode text not null default 'dry-run',
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_phone_number text,
  whatsapp_sender_number text,
  resend_api_key text,
  lead_webhook_secret text,
  openai_api_key text,
  lead_assignment_mode text not null default 'Round Robin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id),
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subscription_id text unique,
  customer_id text,
  plan text not null check (plan in ('basic','pro','agency')),
  status text not null,
  renewal_date timestamptz,
  trial_end timestamptz,
  billing_email text,
  seats_used int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table team_members enable row level security;
alter table lead_sources enable row level security;
alter table leads enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table property_documents enable row level security;
alter table lead_property_shares enable row level security;
alter table activities enable row level security;
alter table calls enable row level security;
alter table messages enable row level security;
alter table followups enable row level security;
alter table attendance enable row level security;
alter table social_posts enable row level security;
alter table tasks enable row level security;
alter table integration_settings enable row level security;
alter table notifications enable row level security;
alter table subscriptions enable row level security;
alter table analytics_events enable row level security;

create or replace function public.org_id_from_jwt()
returns uuid
language sql
stable
as $$
  select (auth.jwt() ->> 'organization_id')::uuid
$$;

create policy "Org scoped select" on profiles for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped insert" on profiles for insert with check (organization_id = public.org_id_from_jwt());
create policy "Org scoped update" on profiles for update using (organization_id = public.org_id_from_jwt());

create policy "Org scoped leads select" on leads for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped leads insert" on leads for insert with check (organization_id = public.org_id_from_jwt());
create policy "Org scoped leads update" on leads for update using (organization_id = public.org_id_from_jwt());

create policy "Org scoped properties select" on properties for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped properties insert" on properties for insert with check (organization_id = public.org_id_from_jwt());
create policy "Org scoped properties update" on properties for update using (organization_id = public.org_id_from_jwt());

create policy "Org scoped attendance select" on attendance for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped attendance insert" on attendance for insert with check (organization_id = public.org_id_from_jwt());
create policy "Org scoped attendance update" on attendance for update using (organization_id = public.org_id_from_jwt());

create policy "Org scoped social select" on social_posts for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped social insert" on social_posts for insert with check (organization_id = public.org_id_from_jwt());
create policy "Org scoped social update" on social_posts for update using (organization_id = public.org_id_from_jwt());

create policy "Org scoped generic select" on activities for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped generic select calls" on calls for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped generic select messages" on messages for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped generic select followups" on followups for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped generic select notifications" on notifications for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped subscriptions select" on subscriptions for select using (organization_id = public.org_id_from_jwt());
create policy "Org scoped subscriptions update" on subscriptions for update using (organization_id = public.org_id_from_jwt());
create policy "Org scoped analytics select" on analytics_events for select using (organization_id = public.org_id_from_jwt());
