CREATE TABLE IF NOT EXISTS calendar_releases (
  event_hash text PRIMARY KEY,
  event_date date NOT NULL,
  event_name text NOT NULL,
  currency text,
  impact text,
  actual_value text,
  forecast_value text,
  previous_value text,
  source_id text,
  match_status text DEFAULT 'none',
  raw_event jsonb,
  saved_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_releases_event_date_idx
  ON calendar_releases (event_date DESC);

CREATE INDEX IF NOT EXISTS calendar_releases_currency_idx
  ON calendar_releases (currency);
