import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Tag, Users, LayoutGrid, Trash2, Edit2, Plus, Check, X, Shield, Clock, AlertCircle, UserX, Zap, Swords, Inbox, Ban, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TunerExamAdmin } from './TunerExamAdmin';
import type { Tag as TagType, User, Role } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

type AdminTab = 'tags' | 'users' | 'columns' | 'moderation' | 'anfragen' | 'tuner';

const ROLE_OPTIONS: Role[] = ['admin', 'editor', 'viewer'];

const TAG_COLORS = [
    '#ff6b9d', '#ff4757', '#ffa502', '#7bed9f',
    '#70a1ff', '#eccc68', '#a29bfe', '#fd79a8',
    '#00cec9', '#e17055',
];

// Map known Discord Role IDs to readable names
const DISCORD_ROLE_NAMES: Record<string, string> = {
    '1096402401424060516': 'Inhaber',
    '1136028969481797743': 'B. King',
    '1097403678715031612': 'Admin',
    '1096402401407279150': 'Stellvertretung',
    '1427766432414044160': 'Management',
    '1096402401382109245': 'Leitung',
    '1096402401407279154': 'Co-Leitung',
    '1306720155132497930': 'Moderator',
    '1096402401407279152': 'Support',
};

function getDiscordRoleName(roleId: string): string {
    return DISCORD_ROLE_NAMES[roleId] || roleId;
}

// Inline error/success notification
function InlineAlert({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
            background: type === 'error' ? 'rgba(255,71,87,0.12)' : 'rgba(123,237,159,0.12)',
            border: `1px solid ${type === 'error' ? 'rgba(255,71,87,0.4)' : 'rgba(123,237,159,0.4)'}`,
            color: type === 'error' ? '#ff4757' : '#7bed9f',
            fontSize: '13px',
        }}>
            <AlertCircle size={15} />
            <span style={{ flex: 1 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0' }}>
                <X size={13} />
            </button>
        </div>
    );
}

export function AdminPanel() {
    const { state, dispatch, fetchUsers } = useApp();
    const currentUser = state.currentUser;
    const [activeTab, setActiveTab] = useState<AdminTab>('tags');
    const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

    // Tag state
    const [editingTag, setEditingTag] = useState<TagType | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [showNewTag, setShowNewTag] = useState(false);

    // Moderation state
    const [modUserId, setModUserId] = useState('');
    const [modReason, setModReason] = useState('');
    const [modDuration, setModDuration] = useState(60);
    const [modLoading, setModLoading] = useState(false);
    const [funkLoading, setFunkLoading] = useState<string | null>(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [guildMembers, setGuildMembers] = useState<{ id: string; displayName: string; username: string; avatar: string | null }[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{ id: string; displayName: string } | null>(null);

    // Auto-refresh user list when on users or anfragen tab (every 30 seconds)
    useEffect(() => {
        if (activeTab === 'users' || activeTab === 'anfragen') {
            // Initial load
            if (fetchUsers) fetchUsers();

            // Set up interval
            const interval = setInterval(() => {
                if (fetchUsers) fetchUsers();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [activeTab, fetchUsers]);

    const showAlert = (text: string, type: 'error' | 'success' = 'error') => {
        setAlertMsg({ text, type });
        setTimeout(() => setAlertMsg(null), 4000);
    };

    const loadGuildMembers = async () => {
        if (guildMembers.length > 0) return;
        setMembersLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/discord/members`, { withCredentials: true });
            setGuildMembers(res.data);
        } catch {
            showAlert('Konnte Discord-Mitglieder nicht laden.');
        } finally {
            setMembersLoading(false);
        }
    };

    const handleAddTag = () => {
        if (!newTagName.trim()) return;
        dispatch({ type: 'ADD_TAG', tag: { id: uuidv4(), name: newTagName.trim(), color: newTagColor } });
        setNewTagName('');
        setNewTagColor(TAG_COLORS[0]);
        setShowNewTag(false);
    };

    const handleUpdateTag = () => {
        if (!editingTag) return;
        dispatch({ type: 'UPDATE_TAG', tag: editingTag });
        setEditingTag(null);
    };

    const handleUserRoleChange = async (user: User, role: Role) => {
        if (user.id === currentUser?.id) {
            showAlert('Du kannst deine eigene Rolle nicht ändern.', 'error');
            return;
        }
        try {
            await axios.post(`${API_URL}/admin/users/${user.id}`, {
                status: user.status || 'approved',
                website_role: role
            });
            if (fetchUsers) fetchUsers();
            showAlert(`Rolle von ${user.name} auf "${role}" gesetzt.`, 'success');
        } catch (err) {
            console.error(err);
            showAlert('Fehler: Rolle konnte nicht geändert werden.');
        }
    };

    const handleApproveUser = async (user: User, role: Role) => {
        try {
            await axios.post(`${API_URL}/admin/users/${user.id}`, {
                status: 'approved',
                website_role: role
            });
            if (fetchUsers) fetchUsers();
            showAlert(`${user.name} wurde als "${role}" freigeschaltet.`, 'success');
        } catch (err) {
            console.error(err);
            showAlert('Fehler: Benutzer konnte nicht freigeschaltet werden.');
        }
    };

    const handleRejectUser = async (user: User) => {
        try {
            await axios.delete(`${API_URL}/admin/users/${user.id}`);
            if (fetchUsers) fetchUsers();
            showAlert(`Anfrage von ${user.name} wurde abgelehnt.`, 'success');
        } catch (err) {
            console.error(err);
            showAlert('Fehler: Anfrage konnte nicht abgelehnt werden.');
        }
    };

    const handleRevokeUser = async (user: User) => {
        if (!confirm(`Zugriff von ${user.name} wirklich entziehen?`)) return;
        try {
            await axios.post(`${API_URL}/admin/users/${user.id}`, {
                status: 'pending',
                website_role: 'viewer'
            });
            if (fetchUsers) fetchUsers();
            showAlert(`Zugriff von ${user.name} wurde entzogen.`, 'success');
        } catch (err) {
            console.error(err);
            showAlert('Fehler: Zugriff konnte nicht entzogen werden.');
        }
    };

    const handleModerationAction = async (action: 'timeout' | 'kick' | 'ban') => {
        if (!modUserId.trim()) { showAlert('Bitte einen Nutzer auswählen.'); return; }
        setModLoading(true);
        try {
            const payload: Record<string, unknown> = { userId: modUserId.trim(), reason: modReason || undefined };
            if (action === 'timeout') payload.durationMinutes = modDuration;
            const res = await axios.post(`${API_URL}/admin/discord/${action}`, payload);
            showAlert(res.data.message || 'Aktion erfolgreich!', 'success');
            setModUserId('');
            setModReason('');
            setSelectedMember(null);
        } catch (err: any) {
            showAlert(err.response?.data?.error || `Fehler beim ${action}`);
        } finally {
            setModLoading(false);
        }
    };

    const handleFunkUpdate = async (type: 'sakura' | 'neon' | 'blacklist') => {
        setFunkLoading(type);
        try {
            await axios.post(`${API_URL}/admin/funk`, { type });
            showAlert(`${type === 'sakura' ? '🌸 Sakura' : type === 'neon' ? '🌌 Neon' : '🚫 Blacklist'} Funk aktualisiert!`, 'success');
        } catch (err: any) {
            showAlert(err.response?.data?.error || 'Fehler beim Funk-Update');
        } finally {
            setFunkLoading(null);
        }
    };

    const pendingUsers = state.users.filter((u: User) => u.status === 'pending');
    const approvedUsers = state.users.filter((u: User) => u.status === 'approved');

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <div className="flex items-center gap-3">
                    <div className="admin-icon"><Shield size={20} /></div>
                    <div>
                        <h1 className="admin-title">Admin Panel</h1>
                        <p className="text-sm text-muted">Tags, Benutzer, Spalten & Moderation</p>
                    </div>
                </div>
            </div>

            {alertMsg && (
                <InlineAlert message={alertMsg.text} type={alertMsg.type} onClose={() => setAlertMsg(null)} />
            )}

            <div className="admin-tabs">
                {([
                    { key: 'tags', icon: <Tag size={15} />, label: 'Tags' },
                    { key: 'users', icon: <Users size={15} />, label: 'Benutzer' },
                    { key: 'anfragen', icon: <Inbox size={15} />, label: `Anfragen${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}` },
                    { key: 'columns', icon: <LayoutGrid size={15} />, label: 'Spalten' },
                    { key: 'moderation', icon: <Swords size={15} />, label: 'Moderation' },
                    { key: 'tuner', icon: <FileText size={15} />, label: 'Tunerprüfung' },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key as AdminTab)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="admin-content">
                {/* ── TAGS ── */}
                {activeTab === 'tags' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title">Tags</h2>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowNewTag(true)}>
                                <Plus size={14} /> Neuer Tag
                            </button>
                        </div>

                        {showNewTag && (
                            <div className="tag-editor surface">
                                <input
                                    className="input"
                                    placeholder="Tag-Name…"
                                    value={newTagName}
                                    onChange={e => setNewTagName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                    autoFocus
                                />
                                <div className="color-picker">
                                    {TAG_COLORS.map(c => (
                                        <button
                                            key={c}
                                            className={`color-dot ${newTagColor === c ? 'selected' : ''}`}
                                            style={{ background: c }}
                                            onClick={() => setNewTagColor(c)}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-primary btn-sm" onClick={handleAddTag}><Check size={13} /> Hinzufügen</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowNewTag(false)}><X size={13} /> Abbrechen</button>
                                </div>
                            </div>
                        )}

                        <div className="tags-list">
                            {state.tags.map(tag => (
                                <div key={tag.id} className="tag-row surface">
                                    {editingTag?.id === tag.id ? (
                                        <>
                                            <div className="tag-color-preview" style={{ background: editingTag.color }} />
                                            <input
                                                className="input"
                                                value={editingTag.name}
                                                onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
                                            />
                                            <div className="color-picker">
                                                {TAG_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        className={`color-dot ${editingTag.color === c ? 'selected' : ''}`}
                                                        style={{ background: c }}
                                                        onClick={() => setEditingTag({ ...editingTag, color: c })}
                                                    />
                                                ))}
                                            </div>
                                            <button className="btn btn-primary btn-sm" onClick={handleUpdateTag}><Check size={13} /></button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingTag(null)}><X size={13} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="tag-badge" style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}>
                                                {tag.name}
                                            </span>
                                            <div className="tag-color-preview" style={{ background: tag.color }} />
                                            <span className="text-xs text-muted">{state.cards.filter(c => c.tagIds.includes(tag.id)).length} Karten</span>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingTag(tag)}>
                                                <Edit2 size={13} />
                                            </button>
                                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => dispatch({ type: 'DELETE_TAG', tagId: tag.id })}>
                                                <Trash2 size={13} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── USERS ── */}
                {activeTab === 'users' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title">Benutzer & Rollen</h2>
                            <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
                                Nur Benutzer mit aktivem Zugriff. Benutzer ohne Discord-Rollen werden automatisch entfernt.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h3 className="text-sm font-bold text-muted">Freigeschaltete Benutzer ({approvedUsers.length})</h3>
                        </div>
                        <div className="users-list">
                            {approvedUsers.length === 0 ? (
                                <div className="surface" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Users size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                                    <p>Keine freigeschalteten Benutzer</p>
                                </div>
                            ) : (
                                approvedUsers.map(user => {
                                    const isSelf = user.id === currentUser?.id;
                                    return (
                                        <div key={user.id} className="user-row surface">
                                            {user.avatar && user.avatar.length > 5 ? (
                                                <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="avatar avatar-lg" alt="" />
                                            ) : (
                                                <div className="avatar avatar-lg">{user.name.substring(0, 2).toUpperCase()}</div>
                                            )}
                                            <div className="user-info">
                                                <p className="font-semibold">{user.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(du)</span>}</p>
                                                <p className="text-xs text-muted">Discord ID: {user.id}</p>
                                                {user.discordRoles && user.discordRoles.length > 0 && (
                                                    <div className="discord-roles-row">
                                                        {user.discordRoles.slice(0, 5).map((roleId: string) => (
                                                            <span key={roleId} className="discord-role-badge">{getDiscordRoleName(roleId)}</span>
                                                        ))}
                                                        {user.discordRoles.length > 5 && <span className="discord-role-badge">+{user.discordRoles.length - 5}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="role-selector">
                                                {ROLE_OPTIONS.map(role => (
                                                    <button
                                                        key={role}
                                                        disabled={isSelf}
                                                        title={isSelf ? 'Du kannst deine eigene Rolle nicht ändern' : ''}
                                                        className={`role-btn ${user.role === role ? 'selected' : ''} role-${role}`}
                                                        style={isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                                        onClick={() => handleUserRoleChange(user, role)}
                                                    >
                                                        {role}
                                                    </button>
                                                ))}
                                            </div>
                                            {!isSelf && user.role === 'editor' && (
                                                <div className="permissions-row">
                                                    <label className="perm-check">
                                                        <input
                                                            type="checkbox"
                                                            checked={user.permissions?.canDeleteColumns !== false}
                                                            onChange={async (e) => {
                                                                try {
                                                                    await axios.post(`${API_URL}/admin/users/${user.id}`, {
                                                                        status: user.status || 'approved',
                                                                        website_role: user.role,
                                                                        can_delete_columns: e.target.checked,
                                                                        can_delete_cards: user.permissions?.canDeleteCards !== false
                                                                    });
                                                                    if (fetchUsers) fetchUsers();
                                                                } catch { showAlert('Fehler beim Speichern.'); }
                                                            }}
                                                        />
                                                        Spalten löschen
                                                    </label>
                                                    <label className="perm-check">
                                                        <input
                                                            type="checkbox"
                                                            checked={user.permissions?.canDeleteCards !== false}
                                                            onChange={async (e) => {
                                                                try {
                                                                    await axios.post(`${API_URL}/admin/users/${user.id}`, {
                                                                        status: user.status || 'approved',
                                                                        website_role: user.role,
                                                                        can_delete_columns: user.permissions?.canDeleteColumns !== false,
                                                                        can_delete_cards: e.target.checked
                                                                    });
                                                                    if (fetchUsers) fetchUsers();
                                                                } catch { showAlert('Fehler beim Speichern.'); }
                                                            }}
                                                        />
                                                        Karten löschen
                                                    </label>
                                                </div>
                                            )}
                                            {!isSelf && (
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleRevokeUser(user)}
                                                    title="Zugriff entziehen"
                                                    style={{ marginLeft: 'auto', flexShrink: 0 }}
                                                >
                                                    <Ban size={13} /> Entziehen
                                                </button>
                                            )}
                                        </div>
                                    );
                                }))}
                        </div>
                    </div>
                )}

                {/* ── ANFRAGEN ── */}
                {activeTab === 'anfragen' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title">Zugriffsanfragen</h2>
                            <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
                                Benutzer ohne Zugriff oder ohne erforderliche Discord-Rollen ({pendingUsers.length})
                            </p>
                        </div>

                        {pendingUsers.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Inbox size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                                <p>Keine offenen Anfragen.</p>
                                <p className="text-xs" style={{ marginTop: '6px', opacity: 0.6 }}>
                                    Benutzer ohne erforderliche Discord-Rollen oder die sich neu anmelden erscheinen hier automatisch.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 107, 157, 0.1)',
                                    border: '1px solid rgba(255, 107, 157, 0.3)',
                                    marginBottom: '16px',
                                    fontSize: '12px',
                                    color: 'var(--text-muted)'
                                }}>
                                    <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                    Diese Benutzer haben sich angemeldet, aber warten auf Freischaltung. Sie sehen eine "Zugriff ausstehend" Seite.
                                </div>
                                <div className="users-list">
                                    {pendingUsers.map(user => (
                                        <div key={user.id} className="user-row surface anfrage-row" style={{ borderColor: 'var(--sakura-400)' }}>
                                            {user.avatar ? (
                                                <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="avatar avatar-lg" alt="" />
                                            ) : (
                                                <div className="avatar avatar-lg">{user.name.substring(0, 2).toUpperCase()}</div>
                                            )}
                                            <div className="user-info" style={{ flex: 1 }}>
                                                <p className="font-semibold">{user.name}</p>
                                                <p className="text-xs text-muted">Discord ID: {user.id}</p>
                                                {user.discordRoles && user.discordRoles.length > 0 ? (
                                                    <div className="discord-roles-row" style={{ marginTop: '6px' }}>
                                                        <span className="text-xs" style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Discord-Rollen:</span>
                                                        {user.discordRoles.map((roleId: string) => (
                                                            <span key={roleId} className="discord-role-badge">{getDiscordRoleName(roleId)}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs" style={{ color: '#ff4757', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <UserX size={11} /> Nicht auf dem Sakura Discord / Keine Rollen
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2" style={{ flexShrink: 0 }}>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleApproveUser(user, 'editor')}>
                                                    <Check size={13} /> Als Editor
                                                </button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleApproveUser(user, 'viewer')}>
                                                    Als Viewer
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleRejectUser(user)}>
                                                    <X size={13} /> Ablehnen
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── COLUMNS ── */}
                {activeTab === 'columns' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title">Board-Spalten</h2>
                        </div>

                        <div className="columns-list">
                            {state.columns.map(col => (
                                <div key={col.id} className="col-row surface">
                                    <div className="col-color-swatch" style={{ background: col.color }} />
                                    <div>
                                        <p className="font-semibold">{col.title}</p>
                                        <p className="text-xs text-muted">{col.cardIds.length} Karten</p>
                                    </div>
                                    <button
                                        className="btn btn-danger btn-icon btn-sm"
                                        onClick={() => {
                                            if (confirm(`Spalte "${col.title}" und alle ihre Karten löschen?`)) {
                                                dispatch({ type: 'DELETE_COLUMN', columnId: col.id });
                                            }
                                        }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── MODERATION ── */}
                {activeTab === 'moderation' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title flex items-center gap-2"><Swords size={16} /> Discord Moderation</h2>
                            <button className="btn btn-secondary btn-sm" onClick={loadGuildMembers} disabled={membersLoading}>
                                {membersLoading ? '⏳ Lädt…' : <><Users size={14} /> Mitglieder laden</>}
                            </button>
                        </div>

                        {/* Member Search */}
                        {guildMembers.length > 0 && (
                            <div className="mod-member-list surface" style={{ padding: '12px' }}>
                                <input
                                    className="input"
                                    placeholder="Name oder ID suchen…"
                                    value={memberSearch}
                                    onChange={e => setMemberSearch(e.target.value)}
                                    style={{ marginBottom: '8px' }}
                                />
                                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {guildMembers
                                        .filter(m => {
                                            const q = memberSearch.toLowerCase();
                                            return !q || m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q) || m.id.includes(q);
                                        })
                                        .slice(0, 50)
                                        .map(m => (
                                            <button
                                                key={m.id}
                                                className={`mod-member-btn ${selectedMember?.id === m.id ? 'selected' : ''}`}
                                                onClick={() => { setSelectedMember({ id: m.id, displayName: m.displayName }); setModUserId(m.id); }}
                                            >
                                                {m.avatar ? (
                                                    <img src={m.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                                ) : (
                                                    <div className="avatar avatar-sm">{m.displayName[0]}</div>
                                                )}
                                                <span className="font-semibold" style={{ fontSize: '13px' }}>{m.displayName}</span>
                                                <span className="text-xs text-muted">@{m.username}</span>
                                                {selectedMember?.id === m.id && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--sakura-400)' }} />}
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        )}

                        {guildMembers.length === 0 && !membersLoading && (
                            <p className="text-sm text-muted" style={{ padding: '20px 0' }}>Lade die Discord-Mitglieder, um Aktionen durchzuführen.</p>
                        )}

                        {/* Selected member actions */}
                        {selectedMember && (
                            <div className="mod-actions surface" style={{ padding: '16px', marginTop: '12px' }}>
                                <p className="text-sm" style={{ marginBottom: '12px' }}>
                                    Ausgewählt: <strong style={{ color: 'var(--sakura-400)' }}>{selectedMember.displayName}</strong>
                                </p>
                                <div className="flex gap-3" style={{ marginBottom: '12px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Grund</label>
                                        <input className="input" placeholder="Warum?" value={modReason} onChange={e => setModReason(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ width: '120px' }}>
                                        <label className="form-label">Timeout (Min)</label>
                                        <input className="input" type="number" min={1} value={modDuration} onChange={e => setModDuration(Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-sm" style={{ background: 'rgba(255,165,0,0.15)', color: '#ffa500', border: '1px solid rgba(255,165,0,0.3)' }} onClick={() => handleModerationAction('timeout')} disabled={modLoading}>
                                        <Clock size={14} /> Timeout
                                    </button>
                                    <button className="btn btn-sm" style={{ background: 'rgba(255,71,87,0.1)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.2)' }} onClick={() => handleModerationAction('kick')} disabled={modLoading}>
                                        <UserX size={14} /> Kicken
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Sicher bannen?')) handleModerationAction('ban'); }} disabled={modLoading}>
                                        <Shield size={14} /> Bannen
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Funk System */}
                        <div style={{ marginTop: '24px' }}>
                            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--sakura-400)', marginBottom: '12px' }}>
                                <Zap size={14} /> Funk-System Steuerung
                            </h3>
                            <div className="flex gap-3">
                                <button className="btn btn-sm" style={{ background: 'rgba(255,107,157,0.1)', color: 'var(--sakura-400)', border: '1px solid rgba(255,107,157,0.3)' }} onClick={() => handleFunkUpdate('sakura')} disabled={!!funkLoading}>
                                    {funkLoading === 'sakura' ? '...' : '🌸 Sakura Funk'}
                                </button>
                                <button className="btn btn-sm" style={{ background: 'rgba(0,255,255,0.08)', color: '#00cccc', border: '1px solid rgba(0,255,255,0.2)' }} onClick={() => handleFunkUpdate('neon')} disabled={!!funkLoading}>
                                    {funkLoading === 'neon' ? '...' : '🌌 Neon Lotus'}
                                </button>
                                <button className="btn btn-sm" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', border: '1px solid #333' }} onClick={() => handleFunkUpdate('blacklist')} disabled={!!funkLoading}>
                                    {funkLoading === 'blacklist' ? '...' : '🚫 Blacklist'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TUNER EXAM ── */}
                {activeTab === 'tuner' && (
                    <TunerExamAdmin />
                )}
            </div>
        </div>
    );
}
