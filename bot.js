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

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
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

client.once('ready', () => {
    console.log(`Sovereign Sentinel active as ${client.user.tag}`);
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
            await pool.query('INSERT INTO keys (key_value) VALUES ($1)', [newKey]);

            const embed = new EmbedBuilder()
                .setTitle('Sovereign: License Generated')
                .setColor(0x2ecc71)
                .addFields({ name: 'License Key', value: `\`${newKey}\`` })
                .setFooter({ text: 'Status: Unbound' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (command === 'keys') {
            const result = await pool.query('SELECT key_value, bound_hwid, is_active FROM keys ORDER BY created_at DESC LIMIT 15');
            
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

            const res = await pool.query('UPDATE keys SET is_active = FALSE WHERE key_value = $1', [targetKey]);
            
            if (res.rowCount === 0) {
                return message.reply(`License \`${targetKey}\` not found in registry.`);
            }

            return message.reply(`License \`${targetKey}\` has been successfully revoked.`);
        }

    } catch (err) {
        console.error(`[Sentinel Crisis]: ${err.stack || err.message}`);
        
        // Return detailed error for our elite writer to diagnose sugar 🤍
        const errorText = err.message || "Unknown Sovereign Silence";
        
        if (errorText.includes('relation "keys" does not exist')) {
            return message.reply('Authority Error: The license vault tables are missing. Please absolute, brilliant and "Run" the schema.sql ritual in Railway honey! 💍');
        }
        
        message.reply(`Authority Error: \`${errorText}\``);
    }
});

client.login(process.env.BOT_TOKEN);
