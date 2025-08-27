DO $$
BEGIN
    -- create counters table if not exists
    CREATE TABLE IF NOT EXISTS url_shortener.counters (
        shard_id INT PRIMARY KEY,
        value BIGINT NOT NULL
    );

    -- insert initial shards
    INSERT INTO url_shortener.counters (shard_id, value) VALUES
        (1, 1),
        (2, 1),
        (3, 1),
        (4, 1)
    ON CONFLICT DO NOTHING;
END $$;
