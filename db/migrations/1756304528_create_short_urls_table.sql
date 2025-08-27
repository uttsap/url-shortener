DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS url_shortener.urls (
        id BIGSERIAL PRIMARY KEY,
        alias TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        expiry_time TIMESTAMPTZ,
        click_count BIGINT DEFAULT 0
    );
END $$;