-- Sovereign Sentinel Production Schema
-- Optimized for PostgreSQL 14+

CREATE TABLE IF NOT EXISTS keys (
    id SERIAL PRIMARY KEY,
    key_value VARCHAR(128) UNIQUE NOT NULL, -- Increased length for high-entropy keys
    bound_hwid VARCHAR(255) DEFAULT NULL,
    bound_fingerprint VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    note TEXT DEFAULT NULL,
    discord_user VARCHAR(255) DEFAULT NULL, -- Track the owner's Discord identity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS harvest_logs (
    id SERIAL PRIMARY KEY,
    key_value VARCHAR(64),
    hwid VARCHAR(255),
    ip_address VARCHAR(45),
    location TEXT,
    pc_name VARCHAR(255),
    cpu_info TEXT,
    gpu_info TEXT,
    ram_info TEXT,
    disk_info TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_keys_value ON keys(key_value);
CREATE INDEX IF NOT EXISTS idx_harvest_hwid ON harvest_logs(hwid);
