-- Migration: create soil_health_records and loan_queries tables
-- Apply using Supabase SQL editor or `supabase db push` / migrations flow

CREATE TABLE IF NOT EXISTS public.soil_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  soil_type text,
  ph numeric,
  n numeric,
  p numeric,
  k numeric,
  organic_carbon numeric,
  moisture numeric,
  date_created timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loan_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  crop_type text,
  land_size text,
  district_state text,
  purpose text,
  created_at timestamptz DEFAULT now()
);
