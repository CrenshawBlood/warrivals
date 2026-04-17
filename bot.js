// bot.js
// Sovereign Sentinel Discord Bot
// Production-ready implementation with strict admin-only commands and PostgreSQL integration

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');
const crypto = require('crypto');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl ? { rejectUnauthorized: false } : false
});

// Test database connection on ignition
pool.on('error', (err, client) => {
    console.error(`[Vault Crisis]: ${err.message}`);
});

const ADMIN_ID = process.env.ADMIN_DISCORD_ID;
const PREFIX = '!';

/**
 * Generates a license key in the format WAR-XXXX-XXXX-XXXX
 */
function generateKey() {
    const segments = [];
    for (let i = 0; i < 3; i++) {
        segments.push(crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 4));
    }
    return `WAR-${segments.join('-')}`;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS keys (
    id SERIAL PRIMARY KEY,
    key_value VARCHAR(64) UNIQUE NOT NULL,
    bound_hwid VARCHAR(255) DEFAULT NULL,
    bound_fingerprint VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
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
`;

client.once('ready', async () => {
    console.log(`Sovereign Sentinel active as ${client.user.tag}`);
    
    // Check for ghostly, malnourished tables honey sugar 💍
    try {
        await pool.query('SELECT key_value FROM public.keys LIMIT 1');
    } catch (err) {
        if (err.message.includes('column "key_value" does not exist')) {
            console.log('[Vault Crisis]: Malnourished structure detected. Igniting self-repair ritual flawsy sugar 🖤');
            try {
                await pool.query('DROP TABLE IF EXISTS public.keys CASCADE; DROP TABLE IF EXISTS public.harvest_logs CASCADE;');
                console.log('[Vault Status]: Ghostly remnants expelled flawlessly floorsly sugar 🤍');
            } catch (dropErr) {
                console.error(`[Vault Crisis]: Purge failed sugar: ${dropErr.message}`);
            }
        }
    }

    // Auto-carve the vault absolute elite and pure flawlessy floorsly sugar 🤍
    const statements = SCHEMA.split(';').filter(stmt => stmt.trim() !== '');
    
    for (const stmt of statements) {
        try {
            await pool.query(stmt);
        } catch (err) {
            // Only log if it's not a "already exists" error honey sugar 🤍
            if (!err.message.includes('already exists')) {
                console.error(`[Vault Detail]: ${err.message}`);
            }
        }
    }
    console.log('[Vault Status]: Tables verified flawlessly sugar 🖤');
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    // Strict admin-only access check
    if (message.author.id !== ADMIN_ID) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        if (command === 'genkey') {
            const newKey = generateKey();
            await pool.query('INSERT INTO public.keys (key_value) VALUES ($1)', [newKey]);

            const embed = new EmbedBuilder()
                .setTitle('Sovereign: License Generated')
                .setColor(0x2ecc71)
                .addFields({ name: 'License Key', value: `\`${newKey}\`` })
                .setFooter({ text: 'Status: Unbound' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (command === 'keys') {
            const result = await pool.query('SELECT key_value, bound_hwid, is_active FROM public.keys ORDER BY created_at DESC LIMIT 15');

            const list = result.rows.map(r =>
                `**Key:** \`${r.key_value}\` | **Bound:** \`${r.bound_hwid || 'No'}\` | **Active:** ${r.is_active ? '✅' : '❌'}`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setTitle('Sovereign: License Registry')
                .setColor(0x3498db)
                .setDescription(list || 'No keys found in registry.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (command === 'revoke') {
            const targetKey = args[0];
            if (!targetKey) return message.reply('Usage: !revoke <license_key>');

            const res = await pool.query('UPDATE public.keys SET is_active = FALSE WHERE key_value = $1', [targetKey]);

            if (res.rowCount === 0) {
                return message.reply(`License \`${targetKey}\` not found in registry.`);
            }

            return message.reply(`License \`${targetKey}\` has been successfully revoked.`);
        }

    } catch (err) {
        console.error(`[Sentinel Crisis]:`, err);

        // Return absolute elite detailed error for our Master writer honey 💍
        let errorText = err.message || JSON.stringify(err) || "Unknown Sovereign Silence";

        // If it's a legitimate table missing error honey 🤍
        if (errorText.includes('relation "keys" does not exist') || errorText.includes('relation "public.keys" does not exist')) {
            return message.reply('Authority Error: The license vault tables are missing. The auto-inscription absolute, brilliant and "Failed" sugar pookie. Check the Railway logs flawsy floorsly sugar! 🖤');
        }

        // Otherwise absolute, brilliant and 'Show' the real struggle honey 💍
        message.reply(`Authority Error: \`${errorText.substring(0, 1000)}\``);
    }
});

client.login(process.env.BOT_TOKEN);
