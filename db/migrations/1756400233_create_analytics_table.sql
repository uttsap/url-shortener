DO $$ BEGIN CREATE TABLE IF NOT EXISTS url_shortener.clicks (
    id BIGSERIAL PRIMARY KEY,
    url_alias TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_agent TEXT,
    ip INET,
    referrer TEXT,
    latency BIGINT,
    error TEXT
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clicks_url_alias ON url_shortener.clicks(url_alias);
CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON url_shortener.clicks(timestamp);
CREATE INDEX IF NOT EXISTS idx_clicks_ip ON url_shortener.clicks(ip);
END $$;