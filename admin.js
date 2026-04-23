// admin.js - Sovereign Command Center (Dark Purple Theme)
async function setupAdmin(dbUrl) {
    const { default: AdminJS } = await import('adminjs');
    const AdminJSExpress = await import('@adminjs/express');
    const { Adapter, Database, Resource } = await import('@adminjs/sql');

    AdminJS.registerAdapter({ Database, Resource });

    // Better connection handling for Railway
    const db = await new Adapter('postgresql', {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
    }).init();

    const admin = new AdminJS({
        rootPath: '/admin',
        loginPath: '/admin/login',
        logoutPath: '/admin/logout',

        branding: {
            companyName: 'Sovereign Sentinel',
            logo: false,
            favicon: false,
            withMadeWithLove: false,
        },

        // Dark + Purple Theme
        theme: {
            colors: {
                primary: '#9b59b6',
                accent: '#c084fc',
                background: '#0a0a0a',
                container: '#111111',
                card: '#1a1a1a',
                text: '#e0e0e0',
                muted: '#aaaaaa',
                border: '#333333',
                success: '#22c55e',
                error: '#ef4444',
            }
        },

        // Remove the ugly default welcome screen
        dashboard: {
            component: false
        },

        resources: [
            {
                resource: db.table('keys'),
                options: {
                    navigation: { name: 'Operations', icon: 'Key' },
                    listProperties: ['key_value', 'bound_hwid', 'is_active', 'created_at', 'last_used'],
                    showProperties: ['key_value', 'bound_hwid', 'bound_fingerprint', 'is_active', 'created_at', 'last_used'],
                    editProperties: ['key_value', 'bound_hwid', 'bound_fingerprint', 'is_active'],
                    filterProperties: ['key_value', 'bound_hwid', 'is_active'],

                    properties: {
                        key_value: { isTitle: true },
                        bound_hwid: { position: 2 },
                        bound_fingerprint: { position: 3 },
                        is_active: { position: 4, type: 'boolean' },
                        created_at: { isDisabled: { edit: true, new: true } },
                        last_used: { isDisabled: { edit: true, new: true } },
                    },

                    actions: {
                        unbindHwid: {
                            actionType: 'record',
                            label: 'Unbind HWID',
                            icon: 'Reset',
                            guard: 'Unbind this HWID? Next user can claim it.',
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
                        },
                        revoke: {
                            actionType: 'record',
                            label: 'Revoke Key',
                            icon: 'Close',
                            variant: 'danger',
                            guard: 'Permanently revoke this key?',
                            handler: async (request, response, context) => {
                                const { record, resource } = context;
                                await resource.update(record.id(), { is_active: false });
                                return {
                                    record: record.toJSON(),
                                    notice: {
                                        message: `Key ${record.param('key_value')} revoked.`,
                                        type: 'success',
                                    },
                                };
                            },
                        },
                    }
                }
            },

            {
                resource: db.table('harvest_logs'),
                options: {
                    navigation: { name: 'Intelligence', icon: 'DocumentInfo' },
                    listProperties: ['key_value', 'hwid', 'ip_address', 'location', 'pc_name', 'timestamp'],
                    showProperties: ['key_value', 'hwid', 'ip_address', 'location', 'pc_name', 'cpu_info', 'gpu_info', 'ram_info', 'disk_info', 'timestamp'],
                    filterProperties: ['key_value', 'hwid', 'ip_address', 'timestamp'],
                    sort: { sortBy: 'timestamp', direction: 'desc' },

                    properties: {
                        timestamp: { isTitle: true },
                    },

                    actions: {
                        new: { isAccessible: false },
                        edit: { isAccessible: false },
                        delete: { isAccessible: false },
                    }
                }
            }
        ]
    });

    // Authentication
    const router = AdminJSExpress.buildAuthenticatedRouter(
        admin,
        {
            authenticate: async (email, password) => {
                if (email === (process.env.ADMIN_EMAIL || 'sovereign@admin.com') &&
                    password === (process.env.ADMIN_PASSWORD || 'SovereignElite2026!')) {
                    return { email, title: 'Sovereign Commander' };
                }
                return null;
            },
            cookieName: 'sovereign-admin',
            cookiePassword: process.env.BASE_SECRET || 'change-this-to-a-very-long-random-string-please',
        },
        null,
        {
            secret: process.env.BASE_SECRET || 'change-this-too',
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
            }
        }
    );

    return { admin, router };
}

module.exports = { setupAdmin };