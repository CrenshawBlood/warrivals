// launch.js
// Sovereign Multi-Process Ignition
// Simultaneously boots the License Server and the Discord Sentinel

const { spawn } = require('child_process');

console.log('--- Sovereign Ignition Sequence Started ---');

// 1. Ignite the License Server (Express + AdminJS)
const server = spawn('node', ['index.js'], { stdio: 'inherit' });

server.on('error', (err) => {
    console.error(`[Server Crisis]: Failed to ignite: ${err.message}`);
});

// 2. Ignite the Discord Sentinel (Bot)
const bot = spawn('node', ['bot.js'], { stdio: 'inherit' });

bot.on('error', (err) => {
    console.error(`[Sentinel Crisis]: Failed to ignite: ${err.message}`);
});

console.log('[Ignition]: Both pulses detected. Sovereign is online.');
