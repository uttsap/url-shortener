DO $$
BEGIN
    -- Create parent partitioned table
    CREATE TABLE IF NOT EXISTS url_shortener.urls (
        id BIGINT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        expiry_time TIMESTAMPTZ,
        PRIMARY KEY (id)
    ) PARTITION BY RANGE (id);

    -- Create partitions
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p0 PARTITION OF url_shortener.urls
        FOR VALUES FROM (0) TO (10000000);
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p1 PARTITION OF url_shortener.urls
        FOR VALUES FROM (10000000) TO (20000000);
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p2 PARTITION OF url_shortener.urls
        FOR VALUES FROM (20000000) TO (30000000);
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p3 PARTITION OF url_shortener.urls
        FOR VALUES FROM (30000000) TO (40000000);

    -- Create global alias table to enforce uniqueness
    CREATE TABLE IF NOT EXISTS url_shortener.aliases (
        alias TEXT PRIMARY KEY,
        url_id BIGINT NOT NULL REFERENCES url_shortener.urls(id) ON DELETE CASCADE
    );
END $$;
