-- Run as postgres in pgAdmin's Query Tool on the rwanda_response database.
-- Adds the workflow tables without changing existing users or reports.
BEGIN;
CREATE TABLE IF NOT EXISTS public.record_reviews (
  record_id uuid PRIMARY KEY REFERENCES public.records(id),
  reviewer_id uuid NOT NULL REFERENCES public.users(id),
  decision text NOT NULL CHECK(decision IN ('verified','rejected')),
  reason text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.incident_dispatches (
  id uuid PRIMARY KEY,
  record_id uuid UNIQUE NOT NULL REFERENCES public.records(id),
  district text NOT NULL,
  destination text NOT NULL DEFAULT 'command-center',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.record_reviews, public.incident_dispatches TO rwanda_response_app;
COMMIT;
