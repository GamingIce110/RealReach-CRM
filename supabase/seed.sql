-- RealReach CRM seed data
insert into organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'RealReach CRM')
on conflict (id) do nothing;

insert into profiles (id, organization_id, full_name, phone, email, role, is_available)
values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ananya Mehra', '+919820001001', 'admin@realreachcrm.com', 'admin', true),
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ravi Khanna', '+919820001002', 'manager@realreachcrm.com', 'sales_manager', true),
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Priya Sood', '+919820001003', 'agent1@realreachcrm.com', 'sales_agent', true),
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Karan Arora', '+919820001004', 'agent2@realreachcrm.com', 'sales_agent', true),
  ('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ishita Dey', '+919820001005', 'field@realreachcrm.com', 'field_executive', true),
  ('71111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Neeraj Jain', '+919820001006', 'social@realreachcrm.com', 'social_media_manager', true)
on conflict (id) do nothing;

insert into integration_settings (organization_id, mode, lead_assignment_mode)
values ('11111111-1111-1111-1111-111111111111', 'dry-run', 'Round Robin')
on conflict do nothing;

insert into subscriptions (
  organization_id,
  subscription_id,
  customer_id,
  plan,
  status,
  renewal_date,
  trial_end,
  billing_email,
  seats_used
)
values (
  '11111111-1111-1111-1111-111111111111',
  'sub_demo_reach_001',
  'ctm_demo_reach_001',
  'pro',
  'trialing',
  now() + interval '14 days',
  now() + interval '14 days',
  'admin@realreachcrm.com',
  4
)
on conflict do nothing;

insert into lead_sources (organization_id, name)
values
  ('11111111-1111-1111-1111-111111111111', '36 Acre'),
  ('11111111-1111-1111-1111-111111111111', 'MagicBricks'),
  ('11111111-1111-1111-1111-111111111111', 'Housing'),
  ('11111111-1111-1111-1111-111111111111', 'Facebook'),
  ('11111111-1111-1111-1111-111111111111', 'Instagram'),
  ('11111111-1111-1111-1111-111111111111', 'Website'),
  ('11111111-1111-1111-1111-111111111111', 'Referral'),
  ('11111111-1111-1111-1111-111111111111', 'Manual')
on conflict do nothing;
