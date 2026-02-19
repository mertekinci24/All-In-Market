-- ================================================
-- Sky-Market V1.4.0: Technical Logs Table
-- Purpose: Central error/event logging for the 
--          Chrome Extension and Edge Functions.
-- ================================================

CREATE TABLE IF NOT EXISTS technical_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Severity: 'error' | 'warn' | 'info' | 'debug'
    level           TEXT NOT NULL DEFAULT 'error'
                    CHECK (level IN ('error', 'warn', 'info', 'debug')),

    -- Source module that reported the log
    source          TEXT NOT NULL DEFAULT 'extension',

    -- Human-readable summary of the event
    message         TEXT NOT NULL,

    -- Raw JS error stack trace (nullable for info/debug)
    stack           TEXT,

    -- Arbitrary JSON payload (product data snapshot, request body, etc.)
    metadata        JSONB DEFAULT '{}'::jsonb,

    -- Extension version at the time of the log
    extension_version TEXT,

    -- URL the user was on when the error occurred
    page_url        TEXT
);

-- Index for quick dashboard queries
CREATE INDEX IF NOT EXISTS idx_technical_logs_level
    ON technical_logs (level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_technical_logs_source
    ON technical_logs (source, created_at DESC);

-- RLS: Allow inserts from anon key (extension), restrict reads to authenticated
ALTER TABLE technical_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon inserts"
    ON technical_logs FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated reads"
    ON technical_logs FOR SELECT
    TO authenticated
    USING (true);
