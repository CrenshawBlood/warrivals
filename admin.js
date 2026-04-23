// admin.js
// Sovereign Command Center — AdminJS Dashboard Configuration
// Uses dynamic import() to bridge CJS server → ESM AdminJS v7

/**
 * Initializes the AdminJS dashboard and returns an Express router.
 * All AdminJS packages are ESM-only (v7+), so we use dynamic import().
 * @param {string} dbUrl - PostgreSQL connection string
 * @returns {Promise<{admin: object, router: import('express').Router}>}
 */
async function setupAdmin(dbUrl) {
    // ── Dynamic ESM imports (AdminJS v7 is ESM-only) ────────────────────
    const { default: AdminJS } = await import('adminjs');
    const AdminJSExpress = await import('@adminjs/express');
    const { Adapter, Database, Resource } = await import('@adminjs/sql');
    const { default: session } = await import('express-session');

    // Register the SQL adapter with AdminJS
    AdminJS.registerAdapter({ Database, Resource });

    // ── Connect the SQL adapter directly to PostgreSQL ──────────────────
    // Parse the DATABASE_URL into individual Knex connection params
    // (the @adminjs/sql Adapter can be picky about raw connection strings)
    const parsedUrl = new URL(dbUrl.replace(/^postgres:\/\//, 'postgresql://'));

    const db = await new Adapter('postgresql', {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 5432,
        user: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        database: parsedUrl.pathname.slice(1), // remove leading '/'
        ssl: { rejectUnauthorized: false },
    }).init();


    // ── AdminJS Instance ────────────────────────────────────────────────
    const { dark } = await import('@adminjs/themes');

    const admin = new AdminJS({
        rootPath: '/admin',
        loginPath: '/admin/login',
        logoutPath: '/admin/logout',
        defaultTheme: 'dark',
        availableThemes: [dark],
        branding: {
            companyName: 'Sovereign Sentinel',
            logo: false,
            favicon: false,
            withMadeWithLove: false,
            theme: {
                colors: {
                    primary100: '#7c3aed', // Vibrant violet pulse
                    primary80: '#8b5cf6',
                    primary60: '#a78bfa',
                    primary40: '#c4b5fd',
                    primary20: '#ede9fe',
                    accent: '#7c3aed',
                    hoverBg: '#1e1b4b',
                    filterBg: '#0f0e1a',
                    bg: '#0a0a0f', // Deep obsidian
                    inputBg: '#141420',
                    border: '#2d2b55',
                    text: '#e2e8f0',
                    grey100: '#e2e8f0',
                    grey80: '#94a3b8',
                    grey60: '#64748b',
                    grey40: '#475569',
                    grey20: '#1e293b',
                },
            },
        },
        resources: [
            {
                resource: db.table('keys'),
                options: {
                    id: 'License Keys',
                    navigation: { name: 'Operations', icon: 'Key' },
                    listProperties: ['id', 'key_value', 'is_active', 'expires_at', 'bound_hwid', 'last_used'],
                    showProperties: ['id', 'key_value', 'is_active', 'expires_at', 'note', 'bound_hwid', 'bound_fingerprint', 'created_at', 'last_used'],
                    editProperties: ['is_active', 'expires_at', 'note'], // Secure: can't edit the key string directly
                    filterProperties: ['key_value', 'is_active', 'expires_at', 'bound_hwid'],
                    properties: {
                        id: { isTitle: false, position: 0 },
                        key_value: {
                            isTitle: true,
                            position: 1,
                            props: { style: { fontWeight: 'bold', fontFamily: 'monospace' } }
                        },
                        is_active: { 
                            position: 2,
                            availableValues: [
                                { value: true, label: 'ACTIVE' },
                                { value: false, label: 'REVOKED' },
                            ],
                        },
                        expires_at: { 
                            position: 3,
                            type: 'datetime'
                        },
                        note: { position: 4, type: 'textarea' },
                        bound_hwid: { position: 5 },
                        bound_fingerprint: { position: 6 },
                        created_at: { position: 7, isDisabled: { edit: true, new: true } },
                        last_used: { position: 8, isDisabled: { edit: true, new: true } },
                    },
                    actions: {
                        new: { isAccessible: false }, // Disabling default 'new'

                        // ── Apex Tier Generators ────────────────────────────────
                        genDaily: {
                            actionType: 'resource',
                            label: 'Gen: Daily Pulse',
                            icon: 'Add',
                            component: false, // Fixes the "missing component" error
                            handler: async (request, response, context) => {
                                const { resource, h } = context;
                                const secureKey = 'SOV-D-' + require('crypto').randomBytes(12).toString('hex').toUpperCase();
                                const exp = new Date(); exp.setHours(exp.getHours() + 24);
                                await resource.create({ key_value: secureKey, is_active: true, expires_at: exp, note: 'Daily Pulse' });
                                return { redirectUrl: h.resourceActionUrl({ resourceId: resource.id(), actionName: 'list' }), notice: { message: `Daily Generated: ${secureKey}`, type: 'success' } };
                            },
                        },
                        genWeekly: {
                            actionType: 'resource',
                            label: 'Gen: Weekly Pulse',
                            icon: 'Add',
                            component: false,
                            handler: async (request, response, context) => {
                                const { resource, h } = context;
                                const secureKey = 'SOV-W-' + require('crypto').randomBytes(12).toString('hex').toUpperCase();
                                const exp = new Date(); exp.setDate(exp.getDate() + 7);
                                await resource.create({ key_value: secureKey, is_active: true, expires_at: exp, note: 'Weekly Pulse' });
                                return { redirectUrl: h.resourceActionUrl({ resourceId: resource.id(), actionName: 'list' }), notice: { message: `Weekly Generated: ${secureKey}`, type: 'success' } };
                            },
                        },
                        genMonthly: {
                            actionType: 'resource',
                            label: 'Gen: Monthly Pulse',
                            icon: 'Add',
                            component: false,
                            handler: async (request, response, context) => {
                                const { resource, h } = context;
                                const secureKey = 'SOV-M-' + require('crypto').randomBytes(12).toString('hex').toUpperCase();
                                const exp = new Date(); exp.setDate(exp.getDate() + 30);
                                await resource.create({ key_value: secureKey, is_active: true, expires_at: exp, note: 'Monthly Pulse' });
                                return { redirectUrl: h.resourceActionUrl({ resourceId: resource.id(), actionName: 'list' }), notice: { message: `Monthly Generated: ${secureKey}`, type: 'success' } };
                            },
                        },
                        genYearly: {
                            actionType: 'resource',
                            label: 'Gen: Yearly Pulse',
                            icon: 'Add',
                            component: false,
                            handler: async (request, response, context) => {
                                const { resource, h } = context;
                                const secureKey = 'SOV-Y-' + require('crypto').randomBytes(12).toString('hex').toUpperCase();
                                const exp = new Date(); exp.setFullYear(exp.getFullYear() + 1);
                                await resource.create({ key_value: secureKey, is_active: true, expires_at: exp, note: 'Yearly Pulse' });
                                return { redirectUrl: h.resourceActionUrl({ resourceId: resource.id(), actionName: 'list' }), notice: { message: `Yearly Generated: ${secureKey}`, type: 'success' } };
                            },
                        },
                        genLifetime: {
                            actionType: 'resource',
                            label: 'Gen: Eternal Pulse',
                            icon: 'Add',
                            component: false,
                            handler: async (request, response, context) => {
                                const { resource, h } = context;
                                const secureKey = 'SOV-L-' + require('crypto').randomBytes(16).toString('hex').toUpperCase();
                                const exp = new Date(); exp.setFullYear(exp.getFullYear() + 99); // 99 years is lifetime sugar 🖤
                                await resource.create({ key_value: secureKey, is_active: true, expires_at: exp, note: 'Eternal Pulse' });
                                return { redirectUrl: h.resourceActionUrl({ resourceId: resource.id(), actionName: 'list' }), notice: { message: `Eternal Key Generated: ${secureKey}`, type: 'success' } };
                            },
                        },

                        // Custom "Unbind HWID" action — one-click reset
                        unbindHwid: {
                            actionType: 'record',
                            label: 'Unbind HWID',
                            icon: 'Reset',
                            guard: 'Are you sure you want to unbind this key? The next user to login will claim it.',
                            handler: async (request, response, context) => {
                                const { record, resource } = context;
                                await resource.update(record.id(), {
                                    bound_hwid: null,
                                    bound_fingerprint: null,
                                });
                                return {
                                    record: record.toJSON(),
                                    notice: {
                                        message: `HWID unbound from key ${record.param('key_value')}`,
                                        type: 'success',
                                    },
                                };
                            },
                            component: false,
                        },
                        // Custom "Revoke" action — instant kill-switch
                        revoke: {
                            actionType: 'record',
                            label: 'Revoke Key',
                            icon: 'Close',
                            variant: 'danger',
                            guard: 'This will permanently deactivate this license key. Continue?',
                            handler: async (request, response, context) => {
                                const { record, resource } = context;
                                await resource.update(record.id(), { is_active: false });
                                return {
                                    record: record.toJSON(),
                                    notice: {
                                        message: `Key ${record.param('key_value')} has been revoked.`,
                                        type: 'success',
                                    },
                                };
                            },
                            component: false,
                        },
                    },
                },
            },
            {
                resource: db.table('harvest_logs'),
                options: {
                    id: 'Harvest Intel',
                    navigation: { name: 'Intelligence', icon: 'DocumentInfo' },
                    listProperties: ['id', 'key_value', 'hwid', 'ip_address', 'location', 'pc_name', 'timestamp'],
                    showProperties: [
                        'id', 'key_value', 'hwid', 'ip_address', 'location',
                        'pc_name', 'cpu_info', 'gpu_info', 'ram_info', 'disk_info', 'timestamp',
                    ],
                    filterProperties: ['key_value', 'hwid', 'ip_address', 'location', 'pc_name', 'timestamp'],
                    properties: {
                        id: { isTitle: false, position: 0 },
                        key_value: { isTitle: true, position: 1 },
                        hwid: { position: 2 },
                        ip_address: { position: 3 },
                        location: { position: 4 },
                        pc_name: { position: 5 },
                        cpu_info: { position: 6 },
                        gpu_info: { position: 7 },
                        ram_info: { position: 8 },
                        disk_info: { position: 9 },
                        timestamp: { position: 10, isDisabled: { edit: true, new: true } },
                    },
                    actions: {
                        // Harvest logs are read-only intelligence — no editing or creating
                        new: { isAccessible: false },
                        edit: { isAccessible: false },
                        delete: { isAccessible: false },
                    },
                },
            },
        ],
    });

    // ── Authentication ──────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'sovereign@admin.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SovereignElite2026!';

    const router = AdminJSExpress.buildAuthenticatedRouter(
        admin,
        {
            authenticate: async (email, password) => {
                if (email === adminEmail && password === adminPassword) {
                    return { email: adminEmail, title: 'Sovereign Commander' };
                }
                return null;
            },
            cookieName: 'sovereign-session',
            cookiePassword: process.env.BASE_SECRET || 'sovereign-fallback-cookie-secret-32chars!!',
        },
        null,
        {
            secret: process.env.BASE_SECRET || 'sovereign-session-secret-32chars-minimum!!',
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
        }
    );

    return { admin, router };
}

module.exports = { setupAdmin };
