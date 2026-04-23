import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';
import { Box, H2, H4, Text, Illustration } from '@adminjs/design-system';

const api = new ApiClient();

const WarRoom = () => {
    const [stats, setStats] = useState({
        totalKeys: '—',
        activeKeys: '—',
        expiredKeys: '—',
        totalHarvests: '—',
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch keys data
                const keysRes = await api.resourceAction({
                    resourceId: 'License Keys',
                    actionName: 'list',
                });
                const allKeys = keysRes.data.meta?.total || 0;

                // Fetch active keys
                const activeRes = await api.resourceAction({
                    resourceId: 'License Keys',
                    actionName: 'list',
                    params: { 'filters.is_active': true },
                });
                const activeKeys = activeRes.data.meta?.total || 0;

                // Fetch harvest logs
                const harvestRes = await api.resourceAction({
                    resourceId: 'Harvest Intel',
                    actionName: 'list',
                });
                const totalHarvests = harvestRes.data.meta?.total || 0;

                setStats({
                    totalKeys: allKeys,
                    activeKeys: activeKeys,
                    expiredKeys: allKeys - activeKeys,
                    totalHarvests: totalHarvests,
                });
            } catch (err) {
                console.error('War Room fetch failed:', err);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const cardStyle = {
        flex: '1 1 220px',
        minWidth: '220px',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(15, 14, 26, 0.9) 100%)',
        border: '1px solid rgba(124, 58, 237, 0.25)',
        borderRadius: '16px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
        cursor: 'default',
    };

    const numberStyle = {
        fontSize: '42px',
        fontWeight: '700',
        letterSpacing: '-1px',
        marginBottom: '6px',
        lineHeight: '1',
    };

    const labelStyle = {
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        opacity: 0.7,
    };

    const cards = [
        { label: 'TOTAL KEYS', value: stats.totalKeys, color: '#a78bfa' },
        { label: 'ACTIVE PULSES', value: stats.activeKeys, color: '#34d399' },
        { label: 'EXPIRED / REVOKED', value: stats.expiredKeys, color: '#f87171' },
        { label: 'HARVEST INTEL', value: stats.totalHarvests, color: '#60a5fa' },
    ];

    return React.createElement('div', {
        style: {
            padding: '40px',
            minHeight: '100vh',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }
    },
        // Header Section
        React.createElement('div', {
            style: {
                marginBottom: '48px',
                borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
                paddingBottom: '24px',
            }
        },
            React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginBottom: '8px',
                }
            },
                React.createElement('div', {
                    style: {
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#34d399',
                        boxShadow: '0 0 12px rgba(52, 211, 153, 0.6)',
                        animation: 'pulse 2s infinite',
                    }
                }),
                React.createElement('span', {
                    style: {
                        fontSize: '12px',
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        color: '#34d399',
                        fontWeight: '600',
                    }
                }, 'SYSTEMS ONLINE')
            ),
            React.createElement('h1', {
                style: {
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#e2e8f0',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.5px',
                }
            }, 'Sovereign War Room'),
            React.createElement('p', {
                style: {
                    fontSize: '14px',
                    color: '#64748b',
                    margin: 0,
                }
            }, 'Real-time operational intelligence • Auto-refreshes every 30 seconds')
        ),

        // Stats Cards
        React.createElement('div', {
            style: {
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                marginBottom: '48px',
            }
        },
            ...cards.map((card, i) =>
                React.createElement('div', {
                    key: i,
                    style: {
                        ...cardStyle,
                        borderColor: `${card.color}33`,
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.borderColor = `${card.color}66`;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 12px 40px ${card.color}15`;
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.borderColor = `${card.color}33`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    },
                },
                    React.createElement('div', {
                        style: { ...numberStyle, color: card.color }
                    }, card.value),
                    React.createElement('div', {
                        style: { ...labelStyle, color: card.color }
                    }, card.label)
                )
            )
        ),

        // Quick Actions
        React.createElement('div', {
            style: {
                marginBottom: '48px',
            }
        },
            React.createElement('h3', {
                style: {
                    fontSize: '14px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    marginBottom: '16px',
                    fontWeight: '600',
                }
            }, 'QUICK OPERATIONS'),
            React.createElement('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                }
            },
                React.createElement('a', {
                    href: '/admin/resources/License Keys/actions/new',
                    style: {
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(124, 58, 237, 0.4)',
                    }
                }, '⚡ FORGE NEW KEY'),
                React.createElement('a', {
                    href: '/admin/resources/License Keys',
                    style: {
                        padding: '12px 24px',
                        background: 'rgba(124, 58, 237, 0.1)',
                        color: '#a78bfa',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(124, 58, 237, 0.25)',
                    }
                }, '🔑 VIEW ALL KEYS'),
                React.createElement('a', {
                    href: '/admin/resources/Harvest Intel',
                    style: {
                        padding: '12px 24px',
                        background: 'rgba(96, 165, 250, 0.1)',
                        color: '#60a5fa',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(96, 165, 250, 0.25)',
                    }
                }, '🛰️ HARVEST INTEL')
            )
        ),

        // Footer
        React.createElement('div', {
            style: {
                borderTop: '1px solid rgba(124, 58, 237, 0.15)',
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }
        },
            React.createElement('span', {
                style: {
                    fontSize: '11px',
                    color: '#475569',
                    letterSpacing: '1px',
                }
            }, 'SOVEREIGN SENTINEL • COMMAND CENTER v2.0'),
            React.createElement('span', {
                style: {
                    fontSize: '11px',
                    color: '#475569',
                    letterSpacing: '1px',
                }
            }, new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
        ),

        // Pulse animation keyframes
        React.createElement('style', {}, `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
        `)
    );
};

export default WarRoom;
