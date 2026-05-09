-- ============================================================
-- Road Ready Platform — Initial Schema
-- Run in Supabase SQL Editor (new, separate project)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'super_admin', 'company_admin', 'dispatcher', 'technician', 'fleet_manager'
);

CREATE TYPE job_status AS ENUM (
  'scheduled', 'en_route', 'arrived', 'in_progress',
  'waiting_on_customer', 'waiting_on_parts',
  'completed', 'report_generated', 'report_sent',
  'follow_up_needed', 'cancelled'
);

CREATE TYPE service_type AS ENUM (
  'tire_replacement', 'tire_repair', 'rotation', 'inspection',
  'emergency_roadside', 'fleet_service', 'other'
);

CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'severe');

CREATE TYPE payment_status AS ENUM ('pending', 'invoiced', 'paid', 'overdue', 'waived');

CREATE TYPE report_tone AS ENUM ('professional', 'friendly', 'fun');

CREATE TYPE report_status AS ENUM ('draft', 'generated', 'approved', 'sent', 'viewed');

CREATE TYPE reminder_type AS ENUM (
  'checkin_30d', 'rotation_5mo', 'inspection_6mo', 'annual',
  'custom_date', 'custom_mileage', 'fleet_recurring',
  'seasonal', 'review_request', 'reactivation', 'warranty_expiration'
);

-- ── Companies ─────────────────────────────────────────────────────────────────
CREATE TABLE companies (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text NOT NULL,
  slug                      text UNIQUE NOT NULL,
  logo_url                  text,
  primary_color             text DEFAULT '#C41230',
  phone                     text,
  email                     text,
  address                   text,
  city                      text,
  state                     text,
  google_review_url         text,
  review_platform           text DEFAULT 'google',
  default_report_tone       report_tone DEFAULT 'friendly',
  report_approval_required  boolean DEFAULT false,
  plan                      text DEFAULT 'starter',
  is_active                 boolean DEFAULT true,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- ── Users (links to auth.users) ───────────────────────────────────────────────
CREATE TABLE users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  uuid REFERENCES companies(id),
  role        user_role NOT NULL DEFAULT 'technician',
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  phone       text,
  email       text,
  avatar_url  text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── Customers ─────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  phone       text,
  email       text,
  address     text,
  city        text,
  state       text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX customers_company_idx ON customers(company_id);

-- ── Fleet Companies ───────────────────────────────────────────────────────────
CREATE TABLE fleet_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  name            text NOT NULL,
  account_number  text,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  address         text,
  notes           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- ── Vehicles ──────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id),
  customer_id       uuid REFERENCES customers(id),
  fleet_company_id  uuid REFERENCES fleet_companies(id),
  unit_number       text,
  year              text,
  make              text,
  model             text,
  trim              text,
  color             text,
  vin               text,
  license_plate     text,
  state_reg         text,
  default_tire_size text,
  mileage           integer,
  notes             text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE INDEX vehicles_customer_idx ON vehicles(customer_id);
CREATE INDEX vehicles_fleet_idx ON vehicles(fleet_company_id);
CREATE INDEX vehicles_company_idx ON vehicles(company_id);

-- ── Jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id),
  customer_id           uuid REFERENCES customers(id),
  vehicle_id            uuid REFERENCES vehicles(id),
  fleet_company_id      uuid REFERENCES fleet_companies(id),
  assigned_tech_id      uuid REFERENCES users(id),
  service_type          service_type NOT NULL DEFAULT 'tire_replacement',
  status                job_status NOT NULL DEFAULT 'scheduled',
  tire_count            integer DEFAULT 4,
  scheduled_start       timestamptz,
  arrival_window_start  timestamptz,
  arrival_window_end    timestamptz,
  started_at            timestamptz,
  arrived_at            timestamptz,
  completed_at          timestamptz,
  report_generated_at   timestamptz,
  report_sent_at        timestamptz,
  payment_status        payment_status DEFAULT 'pending',
  invoice_number        text,
  service_city          text,
  service_state         text,
  service_lat           numeric,
  service_lng           numeric,
  internal_notes        text,
  customer_notes        text,
  report_tone           report_tone DEFAULT 'friendly',
  requires_approval     boolean DEFAULT false,
  approved_by           uuid REFERENCES users(id),
  approved_at           timestamptz,
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE INDEX jobs_company_idx ON jobs(company_id);
CREATE INDEX jobs_tech_idx ON jobs(assigned_tech_id);
CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_scheduled_idx ON jobs(scheduled_start);
CREATE INDEX jobs_customer_idx ON jobs(customer_id);

-- ── Job Status History ────────────────────────────────────────────────────────
CREATE TABLE job_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status      job_status NOT NULL,
  changed_by  uuid REFERENCES users(id),
  note        text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX job_status_history_job_idx ON job_status_history(job_id);

-- ── Tire Records ──────────────────────────────────────────────────────────────
CREATE TABLE tire_records (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                    uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  vehicle_id                uuid REFERENCES vehicles(id),
  position                  text NOT NULL,
  old_brand                 text,
  old_model                 text,
  old_size                  text,
  old_dot                   text,
  old_tread_depth           numeric,
  old_issues                text[] DEFAULT '{}',
  risk_level                risk_level,
  estimated_life_left_pct   numeric,
  estimated_life_left_text  text,
  estimated_miles_remaining integer,
  new_brand                 text,
  new_model                 text,
  new_size                  text,
  new_dot                   text,
  new_tread_depth           numeric DEFAULT 10,
  psi_after                 numeric,
  torque_checked            boolean DEFAULT false,
  tpms_checked              boolean DEFAULT false,
  valve_stem_replaced       boolean DEFAULT false,
  wheel_inspected           boolean DEFAULT false,
  tech_note                 text,
  internal_note             text,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);
CREATE INDEX tire_records_job_idx ON tire_records(job_id);
CREATE UNIQUE INDEX tire_records_position_unique ON tire_records(job_id, position);

-- ── Photos ────────────────────────────────────────────────────────────────────
CREATE TABLE photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tire_record_id  uuid REFERENCES tire_records(id),
  vehicle_id      uuid REFERENCES vehicles(id),
  position        text,
  photo_type      text NOT NULL,
  before_or_after text DEFAULT 'n/a' CHECK (before_or_after IN ('before', 'after', 'n/a')),
  storage_path    text NOT NULL,
  thumbnail_path  text,
  url             text,
  thumbnail_url   text,
  uploaded_by     uuid REFERENCES users(id),
  upload_state    text DEFAULT 'complete' CHECK (upload_state IN ('pending', 'complete', 'failed')),
  taken_at        timestamptz,
  gps_lat         numeric,
  gps_lng         numeric,
  approved        boolean DEFAULT true,
  quality_warning text,
  show_in_report  boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX photos_job_idx ON photos(job_id);
CREATE INDEX photos_tire_idx ON photos(tire_record_id);

-- ── Reports ───────────────────────────────────────────────────────────────────
CREATE TABLE reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                uuid NOT NULL UNIQUE REFERENCES jobs(id),
  company_id            uuid NOT NULL REFERENCES companies(id),
  customer_id           uuid REFERENCES customers(id),
  vehicle_id            uuid REFERENCES vehicles(id),
  public_slug           text UNIQUE NOT NULL DEFAULT replace(replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', ''),
  status                report_status DEFAULT 'draft',
  tone                  report_tone DEFAULT 'friendly',
  good_call_badges      text[] DEFAULT '{}',
  risk_summary          jsonb,
  time_saved_minutes    integer,
  time_saved_breakdown  jsonb,
  tire_facts            text[] DEFAULT '{}',
  warranty_summary      jsonb,
  next_service_date     date,
  next_service_notes    text,
  view_count            integer DEFAULT 0,
  first_viewed_at       timestamptz,
  last_viewed_at        timestamptz,
  pdf_generated_at      timestamptz,
  pdf_storage_path      text,
  sent_at               timestamptz,
  sent_via              text,
  sent_to_phone         text,
  sent_to_email         text,
  generated_by          uuid REFERENCES users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
CREATE INDEX reports_job_idx ON reports(job_id);
CREATE INDEX reports_slug_idx ON reports(public_slug);
CREATE INDEX reports_company_idx ON reports(company_id);

-- ── Report Views ──────────────────────────────────────────────────────────────
CREATE TABLE report_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  viewed_at   timestamptz DEFAULT now(),
  ip_hash     text,
  user_agent  text,
  device_type text
);
CREATE INDEX report_views_report_idx ON report_views(report_id);

-- ── Checklist Items ───────────────────────────────────────────────────────────
CREATE TABLE checklist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  item_key      text NOT NULL,
  label         text NOT NULL,
  required      boolean DEFAULT true,
  completed     boolean DEFAULT false,
  completed_by  uuid REFERENCES users(id),
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX checklist_job_key ON checklist_items(job_id, item_key);

-- ── Warranties ────────────────────────────────────────────────────────────────
CREATE TABLE warranties (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tire_record_id      uuid NOT NULL REFERENCES tire_records(id) ON DELETE CASCADE,
  job_id              uuid REFERENCES jobs(id),
  brand               text,
  model               text,
  size                text,
  dot                 text,
  mileage_warranty    integer,
  road_hazard_months  integer,
  manufacturer_notes  text,
  workmanship_days    integer DEFAULT 90,
  invoice_number      text,
  rotation_interval   integer DEFAULT 6000,
  warranty_url        text,
  created_at          timestamptz DEFAULT now()
);

-- ── Reminders ─────────────────────────────────────────────────────────────────
CREATE TABLE reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  customer_id     uuid REFERENCES customers(id),
  vehicle_id      uuid REFERENCES vehicles(id),
  job_id          uuid REFERENCES jobs(id),
  type            reminder_type NOT NULL,
  scheduled_for   timestamptz NOT NULL,
  sent_at         timestamptz,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'cancelled', 'failed')),
  channel         text DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'both')),
  message         text,
  booking_link    text,
  target_phone    text,
  target_email    text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX reminders_scheduled_idx ON reminders(scheduled_for, status);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES companies(id),
  user_id     uuid REFERENCES users(id),
  type        text NOT NULL,
  title       text NOT NULL,
  body        text,
  read        boolean DEFAULT false,
  job_id      uuid REFERENCES jobs(id),
  report_id   uuid REFERENCES reports(id),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications(user_id, read);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id),
  user_id       uuid REFERENCES users(id),
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   uuid,
  prev_state    jsonb,
  new_state     jsonb,
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX audit_resource_idx ON audit_logs(resource_type, resource_id);

-- ── Updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER companies_updated_at   BEFORE UPDATE ON companies   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at   BEFORE UPDATE ON customers   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vehicles_updated_at    BEFORE UPDATE ON vehicles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at        BEFORE UPDATE ON jobs        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tire_records_updated_at BEFORE UPDATE ON tire_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reports_updated_at     BEFORE UPDATE ON reports     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_views    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's company_id
CREATE OR REPLACE FUNCTION auth_company_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_user_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role::text FROM users WHERE id = auth.uid()
$$;

-- ── Companies RLS ──────────────────────────────────────────────
CREATE POLICY "users_see_own_company" ON companies
  FOR SELECT USING (id = auth_company_id());

-- ── Users RLS ─────────────────────────────────────────────────
CREATE POLICY "users_see_company_members" ON users
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- ── Customers RLS ─────────────────────────────────────────────
CREATE POLICY "company_members_see_customers" ON customers
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "admin_dispatcher_manage_customers" ON customers
  FOR ALL USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('super_admin', 'company_admin', 'dispatcher')
  );

-- ── Vehicles RLS ──────────────────────────────────────────────
CREATE POLICY "company_members_see_vehicles" ON vehicles
  FOR SELECT USING (company_id = auth_company_id());

CREATE POLICY "admin_dispatcher_manage_vehicles" ON vehicles
  FOR ALL USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('super_admin', 'company_admin', 'dispatcher')
  );

-- ── Jobs RLS ──────────────────────────────────────────────────
CREATE POLICY "admin_dispatcher_see_all_jobs" ON jobs
  FOR SELECT USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('super_admin', 'company_admin', 'dispatcher')
  );

CREATE POLICY "tech_see_assigned_jobs" ON jobs
  FOR SELECT USING (
    company_id = auth_company_id()
    AND auth_user_role() = 'technician'
    AND assigned_tech_id = auth.uid()
  );

CREATE POLICY "admin_dispatcher_manage_jobs" ON jobs
  FOR ALL USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('super_admin', 'company_admin', 'dispatcher')
  );

CREATE POLICY "tech_update_assigned_jobs" ON jobs
  FOR UPDATE USING (
    company_id = auth_company_id()
    AND assigned_tech_id = auth.uid()
  );

-- ── Job Status History RLS ─────────────────────────────────────
CREATE POLICY "company_members_see_status_history" ON job_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
      AND (auth_user_role() IN ('super_admin','company_admin','dispatcher')
           OR jobs.assigned_tech_id = auth.uid())
    )
  );

CREATE POLICY "company_members_insert_status_history" ON job_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
    )
  );

-- ── Tire Records RLS ───────────────────────────────────────────
CREATE POLICY "company_members_see_tire_records" ON tire_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
      AND (auth_user_role() IN ('super_admin','company_admin','dispatcher')
           OR jobs.assigned_tech_id = auth.uid())
    )
  );

CREATE POLICY "tech_manage_tire_records" ON tire_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
      AND (auth_user_role() IN ('super_admin','company_admin','dispatcher')
           OR jobs.assigned_tech_id = auth.uid())
    )
  );

-- ── Photos RLS ────────────────────────────────────────────────
CREATE POLICY "company_members_see_photos" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
      AND (auth_user_role() IN ('super_admin','company_admin','dispatcher')
           OR jobs.assigned_tech_id = auth.uid())
    )
  );

CREATE POLICY "tech_upload_photos" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
      AND jobs.assigned_tech_id = auth.uid()
    )
  );

-- ── Reports RLS ────────────────────────────────────────────────
-- Public read by slug (for customer report page — uses service role in API)
CREATE POLICY "public_read_by_slug" ON reports
  FOR SELECT USING (true);  -- enforced in app layer by slug lookup

CREATE POLICY "company_members_manage_reports" ON reports
  FOR ALL USING (company_id = auth_company_id());

-- ── Report Views RLS ───────────────────────────────────────────
CREATE POLICY "insert_report_views" ON report_views
  FOR INSERT WITH CHECK (true);  -- public insert (tracked from report page)

CREATE POLICY "company_see_report_views" ON report_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports WHERE reports.id = report_id
      AND reports.company_id = auth_company_id()
    )
  );

-- ── Checklist Items RLS ────────────────────────────────────────
CREATE POLICY "company_members_manage_checklist" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.company_id = auth_company_id()
      AND (auth_user_role() IN ('super_admin','company_admin','dispatcher')
           OR jobs.assigned_tech_id = auth.uid())
    )
  );

-- ── Warranties RLS ────────────────────────────────────────────
CREATE POLICY "company_members_see_warranties" ON warranties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tire_records tr JOIN jobs j ON j.id = tr.job_id
      WHERE tr.id = tire_record_id AND j.company_id = auth_company_id()
    )
  );

CREATE POLICY "company_members_manage_warranties" ON warranties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tire_records tr JOIN jobs j ON j.id = tr.job_id
      WHERE tr.id = tire_record_id AND j.company_id = auth_company_id()
    )
  );

-- ── Reminders RLS ─────────────────────────────────────────────
CREATE POLICY "company_members_manage_reminders" ON reminders
  FOR ALL USING (company_id = auth_company_id());

-- ── Notifications RLS ─────────────────────────────────────────
CREATE POLICY "users_see_own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid() OR company_id = auth_company_id());

-- ── Audit Logs RLS ────────────────────────────────────────────
CREATE POLICY "company_admins_see_audit" ON audit_logs
  FOR SELECT USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('super_admin', 'company_admin')
  );

CREATE POLICY "insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (company_id = auth_company_id());

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (run after enabling Storage)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('job-photos',     'job-photos',     false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('report-pdfs',    'report-pdfs',    false, 20971520, ARRAY['application/pdf']),
  ('company-assets', 'company-assets', true,  5242880,  ARRAY['image/jpeg','image/png','image/svg+xml','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-photos
CREATE POLICY "auth_users_upload_job_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_read_job_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "service_role_read_job_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job-photos'
    AND auth.role() = 'service_role'
  );

-- Storage policies for company-assets (public read)
CREATE POLICY "public_read_company_assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "admin_manage_company_assets" ON storage.objects
  FOR ALL USING (
    bucket_id = 'company-assets'
    AND auth.role() IN ('authenticated', 'service_role')
  );

-- Storage policies for report-pdfs
CREATE POLICY "service_role_manage_pdfs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'report-pdfs'
    AND auth.role() = 'service_role'
  );

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- Demo company (update after creating auth user)
INSERT INTO companies (id, name, slug, phone, email, city, state, google_review_url, default_report_tone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Onsite Tire',
  'onsite-tire',
  '(210) 555-0100',
  'service@onsitetire.com',
  'San Antonio',
  'TX',
  'https://g.page/r/your-google-review-link',
  'friendly'
) ON CONFLICT (id) DO NOTHING;

-- NOTE: After creating admin user in Supabase Auth dashboard,
-- insert into users table:
-- INSERT INTO users (id, company_id, role, first_name, last_name, email)
-- VALUES ('YOUR-AUTH-USER-UUID', '00000000-0000-0000-0000-000000000001', 'company_admin', 'Admin', 'User', 'admin@onsitetire.com');
