import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';

const api = new ApiClient();

const WarRoom = () => {
    const [stats, setStats] = useState({
        totalKeys: '—',
        activeKeys: '—',
        expiredKeys: '—',
        totalHarvests: '—',
    });

    const [forgeOpen, setForgeOpen] = useState(false);
    const [forgeTier, setForgeTier] = useState('monthly');
    const [forgeNote, setForgeNote] = useState('');
    const [forgeLoading, setForgeLoading] = useState(false);
    const [forgeResult, setForgeResult] = useState(null);
    const [copied, setCopied] = useState(false);

    const fetchStats = async () => {
        try {
            const keysRes = await api.resourceAction({
                resourceId: 'License Keys',
                actionName: 'list',
            });
            const allKeys = keysRes.data.meta?.total || 0;

            const activeRes = await api.resourceAction({
                resourceId: 'License Keys',
                actionName: 'list',
                params: { 'filters.is_active': true },
            });
            const activeKeys = activeRes.data.meta?.total || 0;

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

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // ── Forge Logic ─────────────────────────────────────────────────────
    const handleForge = async () => {
        setForgeLoading(true);
        setForgeResult(null);
        setCopied(false);

        try {
            const tierMap = {
                daily:    { days: 1,     prefix: 'SOV-D', entropy: 12 },
                weekly:   { days: 7,     prefix: 'SOV-W', entropy: 12 },
                monthly:  { days: 30,    prefix: 'SOV-M', entropy: 12 },
                lifetime: { days: 36500, prefix: 'SOV-L', entropy: 16 },
            };
            const config = tierMap[forgeTier] || tierMap.monthly;

            // Generate key client-side for display, but create via API
            const arr = new Uint8Array(config.entropy);
            window.crypto.getRandomValues(arr);
            const hexPart = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            const secureKey = `${config.prefix}-${hexPart}`;

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + config.days);

            const response = await api.resourceAction({
                resourceId: 'License Keys',
                actionName: 'new',
                method: 'post',
                data: {
                    key_value: secureKey,
                    is_active: true,
                    expires_at: expiresAt.toISOString(),
                    duration: forgeTier,
                    note: forgeNote || `${forgeTier.charAt(0).toUpperCase() + forgeTier.slice(1)} Pulse`,
                },
            });

            setForgeResult({
                success: true,
                key: secureKey,
                tier: forgeTier,
                expires: expiresAt.toLocaleDateString(),
            });

            // Refresh stats
            fetchStats();

        } catch (err) {
            console.error('Forge failed:', err);
            setForgeResult({ success: false, error: err.message });
        }

        setForgeLoading(false);
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openForge = () => {
        setForgeOpen(true);
        setForgeResult(null);
        setForgeNote('');
        setForgeTier('monthly');
        setCopied(false);
    };

    const closeForge = () => {
        setForgeOpen(false);
        setForgeResult(null);
        setForgeNote('');
        setCopied(false);
    };

    // ── Styles ──────────────────────────────────────────────────────────
    const cardStyle = {
        flex: '1 1 200px',
        minWidth: '200px',
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
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        opacity: 0.7,
    };

    const cards = [
        { label: 'TOTAL KEYS', value: stats.totalKeys, color: '#a78bfa' },
        { label: 'ACTIVE PULSES', value: stats.activeKeys, color: '#34d399' },
        { label: 'EXPIRED / REVOKED', value: stats.expiredKeys, color: '#f87171' },
        { label: 'HARVEST INTEL', value: stats.totalHarvests, color: '#60a5fa' },
    ];

    const tierOptions = [
        { value: 'daily', label: '⚡ DAILY — 24 Hours', color: '#fbbf24' },
        { value: 'weekly', label: '📅 WEEKLY — 7 Days', color: '#60a5fa' },
        { value: 'monthly', label: '🗓️ MONTHLY — 30 Days', color: '#a78bfa' },
        { value: 'lifetime', label: '♾️ LIFETIME — Eternal', color: '#34d399' },
    ];

    return React.createElement('div', {
        style: {
            padding: '40px',
            minHeight: '100vh',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            position: 'relative',
        }
    },
        // ── Header ──────────────────────────────────────────────────────
        React.createElement('div', {
            style: {
                marginBottom: '40px',
                borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
                paddingBottom: '20px',
            }
        },
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }
            },
                React.createElement('div', {
                    style: {
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#34d399',
                        boxShadow: '0 0 12px rgba(52, 211, 153, 0.6)',
                        animation: 'sovPulse 2s infinite',
                    }
                }),
                React.createElement('span', {
                    style: { fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#34d399', fontWeight: '600' }
                }, 'SYSTEMS ONLINE')
            ),
            React.createElement('h1', {
                style: { fontSize: '28px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 4px 0', letterSpacing: '-0.5px' }
            }, 'Sovereign War Room'),
            React.createElement('p', {
                style: { fontSize: '13px', color: '#64748b', margin: 0 }
            }, 'Real-time operational intelligence · Auto-refreshes every 30 seconds')
        ),

        // ── Stats Cards ─────────────────────────────────────────────────
        React.createElement('div', {
            style: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }
        },
            ...cards.map((card, i) =>
                React.createElement('div', {
                    key: i,
                    style: { ...cardStyle, borderColor: `${card.color}33` },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.borderColor = `${card.color}66`;
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = `0 8px 32px ${card.color}15`;
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.borderColor = `${card.color}33`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    },
                },
                    React.createElement('div', { style: { ...numberStyle, color: card.color } }, card.value),
                    React.createElement('div', { style: { ...labelStyle, color: card.color } }, card.label)
                )
            )
        ),

        // ── Quick Operations ────────────────────────────────────────────
        React.createElement('div', { style: { marginBottom: '40px' } },
            React.createElement('h3', {
                style: { fontSize: '12px', letterSpacing: '2.5px', textTransform: 'uppercase', color: '#64748b', marginBottom: '14px', fontWeight: '600' }
            }, 'QUICK OPERATIONS'),
            React.createElement('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
                // FORGE BUTTON — opens modal
                React.createElement('button', {
                    onClick: openForge,
                    style: {
                        padding: '11px 22px',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff', borderRadius: '10px', border: '1px solid rgba(124, 58, 237, 0.4)',
                        fontSize: '12px', fontWeight: '700', letterSpacing: '1px', cursor: 'pointer',
                        transition: 'all 0.2s ease', textTransform: 'uppercase',
                    },
                    onMouseEnter: (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.35)'; },
                    onMouseLeave: (e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; },
                }, '⚡ Forge New Key'),

                React.createElement('a', {
                    href: '/admin/resources/License Keys',
                    style: {
                        padding: '11px 22px', background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa',
                        borderRadius: '10px', textDecoration: 'none', border: '1px solid rgba(124, 58, 237, 0.25)',
                        fontSize: '12px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s ease', textTransform: 'uppercase',
                    }
                }, '🔑 View All Keys'),

                React.createElement('a', {
                    href: '/admin/resources/Harvest Intel',
                    style: {
                        padding: '11px 22px', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa',
                        borderRadius: '10px', textDecoration: 'none', border: '1px solid rgba(96, 165, 250, 0.25)',
                        fontSize: '12px', fontWeight: '700', letterSpacing: '1px', transition: 'all 0.2s ease', textTransform: 'uppercase',
                    }
                }, '🛰️ Harvest Intel')
            )
        ),

        // ── Footer ──────────────────────────────────────────────────────
        React.createElement('div', {
            style: {
                borderTop: '1px solid rgba(124, 58, 237, 0.15)', paddingTop: '16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }
        },
            React.createElement('span', { style: { fontSize: '10px', color: '#475569', letterSpacing: '1.5px' } }, 'SOVEREIGN SENTINEL · COMMAND CENTER v2.0'),
            React.createElement('span', { style: { fontSize: '10px', color: '#475569', letterSpacing: '1.5px' } },
                new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            )
        ),

        // ═══════════════════════════════════════════════════════════════════
        // THE FORGE MODAL — Floating center panel
        // ═══════════════════════════════════════════════════════════════════
        forgeOpen && React.createElement('div', {
            style: {
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999,
                animation: 'sovFadeIn 0.2s ease',
            },
            onClick: (e) => { if (e.target === e.currentTarget) closeForge(); }
        },
            React.createElement('div', {
                style: {
                    width: '420px', maxWidth: '90vw',
                    background: 'linear-gradient(160deg, #141420 0%, #0a0a14 100%)',
                    border: '1px solid rgba(124, 58, 237, 0.35)',
                    borderRadius: '20px',
                    padding: '32px',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.1)',
                    animation: 'sovSlideUp 0.25s ease',
                }
            },
                // Modal Header
                React.createElement('div', {
                    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }
                },
                    React.createElement('div', {},
                        React.createElement('h2', {
                            style: { fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 4px 0' }
                        }, '⚡ Sovereign Forge'),
                        React.createElement('p', {
                            style: { fontSize: '12px', color: '#64748b', margin: 0 }
                        }, 'Generate a high-entropy license key')
                    ),
                    React.createElement('button', {
                        onClick: closeForge,
                        style: {
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8', borderRadius: '8px', width: '32px', height: '32px',
                            cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }
                    }, '✕')
                ),

                // If we have a result, show it
                forgeResult ? React.createElement('div', {},
                    forgeResult.success
                        ? React.createElement('div', {
                            style: {
                                background: 'rgba(52, 211, 153, 0.08)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                borderRadius: '12px', padding: '20px', marginBottom: '20px',
                            }
                        },
                            React.createElement('div', {
                                style: { fontSize: '11px', letterSpacing: '2px', color: '#34d399', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }
                            }, '✓ KEY FORGED SUCCESSFULLY'),
                            React.createElement('div', {
                                style: {
                                    fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0',
                                    background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px',
                                    wordBreak: 'break-all', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.06)',
                                    letterSpacing: '0.5px',
                                }
                            }, forgeResult.key),
                            React.createElement('div', {
                                style: { display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }
                            },
                                React.createElement('span', {
                                    style: { fontSize: '11px', color: '#64748b' }
                                }, `Expires: ${forgeResult.expires}`),
                                React.createElement('button', {
                                    onClick: () => handleCopy(forgeResult.key),
                                    style: {
                                        padding: '6px 14px', background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(124,58,237,0.2)',
                                        color: copied ? '#34d399' : '#a78bfa', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(124,58,237,0.3)'}`,
                                        borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
                                        letterSpacing: '1px', transition: 'all 0.2s ease',
                                    }
                                }, copied ? '✓ COPIED' : '📋 COPY KEY')
                            )
                        )
                        : React.createElement('div', {
                            style: {
                                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                                borderRadius: '12px', padding: '16px', marginBottom: '20px',
                                color: '#f87171', fontSize: '13px',
                            }
                        }, `Forge failed: ${forgeResult.error}`),

                    // Action buttons after result
                    React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                        React.createElement('button', {
                            onClick: () => { setForgeResult(null); setCopied(false); },
                            style: {
                                flex: 1, padding: '12px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
                            }
                        }, 'FORGE ANOTHER'),
                        React.createElement('button', {
                            onClick: closeForge,
                            style: {
                                flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                                color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                                cursor: 'pointer', fontSize: '12px', fontWeight: '600', letterSpacing: '1px',
                            }
                        }, 'CLOSE')
                    )
                )
                // Form view (no result yet)
                : React.createElement('div', {},
                    // Tier Selection
                    React.createElement('label', {
                        style: { fontSize: '11px', letterSpacing: '2px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }
                    }, 'SELECT TIER'),
                    React.createElement('div', {
                        style: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }
                    },
                        ...tierOptions.map((opt) =>
                            React.createElement('button', {
                                key: opt.value,
                                onClick: () => setForgeTier(opt.value),
                                style: {
                                    padding: '12px 16px',
                                    background: forgeTier === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${forgeTier === opt.value ? `${opt.color}55` : 'rgba(255,255,255,0.06)'}`,
                                    borderRadius: '10px', cursor: 'pointer',
                                    color: forgeTier === opt.value ? opt.color : '#94a3b8',
                                    fontSize: '13px', fontWeight: forgeTier === opt.value ? '600' : '400',
                                    textAlign: 'left', transition: 'all 0.15s ease',
                                    outline: forgeTier === opt.value ? `2px solid ${opt.color}33` : 'none',
                                    outlineOffset: '1px',
                                }
                            }, opt.label)
                        )
                    ),

                    // Note field
                    React.createElement('label', {
                        style: { fontSize: '11px', letterSpacing: '2px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }
                    }, 'NOTE (OPTIONAL)'),
                    React.createElement('input', {
                        type: 'text',
                        value: forgeNote,
                        onChange: (e) => setForgeNote(e.target.value),
                        placeholder: 'e.g. Client name, purpose...',
                        style: {
                            width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                            color: '#e2e8f0', fontSize: '13px', outline: 'none', marginBottom: '22px',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s ease',
                        },
                        onFocus: (e) => { e.target.style.borderColor = 'rgba(124,58,237,0.4)'; },
                        onBlur: (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; },
                    }),

                    // Forge button
                    React.createElement('button', {
                        onClick: handleForge,
                        disabled: forgeLoading,
                        style: {
                            width: '100%', padding: '14px',
                            background: forgeLoading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                            color: '#fff', border: 'none', borderRadius: '12px', cursor: forgeLoading ? 'wait' : 'pointer',
                            fontSize: '14px', fontWeight: '700', letterSpacing: '1.5px',
                            transition: 'all 0.2s ease', textTransform: 'uppercase',
                        },
                        onMouseEnter: (e) => { if (!forgeLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.35)'; } },
                        onMouseLeave: (e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; },
                    }, forgeLoading ? '⏳ FORGING...' : '⚡ FORGE KEY')
                )
            )
        ),

        // ── Keyframe Animations ─────────────────────────────────────────
        React.createElement('style', {}, `
            @keyframes sovPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            @keyframes sovFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes sovSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `)
    );
};

export default WarRoom;
