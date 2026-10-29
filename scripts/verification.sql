CREATE TABLE IF NOT EXISTS record_reviews (
  record_id uuid PRIMARY KEY REFERENCES records(id),
  reviewer_id uuid NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK(decision IN ('verified','rejected')),
  reason text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS incident_dispatches (
  id uuid PRIMARY KEY,
  record_id uuid UNIQUE NOT NULL REFERENCES records(id),
  district text NOT NULL,
  destination text NOT NULL DEFAULT 'command-center',
  created_at timestamptz NOT NULL DEFAULT now()
);
