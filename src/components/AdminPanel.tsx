import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Users, LayoutGrid, Trash2, Edit2, Plus, Check, X, Shield, Clock, AlertCircle, UserX, Zap, Swords } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Tag as TagType, User, Role } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

type AdminTab = 'tags' | 'users' | 'columns' | 'moderation';

const ROLE_OPTIONS: Role[] = ['admin', 'editor', 'viewer'];

const TAG_COLORS = [
    '#ff6b9d', '#ff4757', '#ffa502', '#7bed9f',
    '#70a1ff', '#eccc68', '#a29bfe', '#fd79a8',
    '#00cec9', '#e17055',
];

// Inline error/success notification
function InlineAlert({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`inline-alert alert-${type}`}
        >
            <AlertCircle size={15} />
            <span style={{ flex: 1 }}>{message}</span>
            <button onClick={onClose} className="alert-close">
                <X size={13} />
            </button>
        </motion.div>
    );
}

export function AdminPanel() {
    const { state, dispatch, fetchUsers } = useApp();
    const currentUser = state.currentUser;
    const [activeTab, setActiveTab] = useState<AdminTab>('tags');
    const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

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

    const loadGuildMembers = async () => {
        if (guildMembers.length > 0) return;
        setMembersLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/discord/members`);
            setGuildMembers(res.data);
        } catch (err) {
            showAlert('Konnte Discord-Mitglieder nicht laden.');
        } finally {
            setMembersLoading(false);
        }
    };

    // Tag state
    const [editingTag, setEditingTag] = useState<TagType | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [showNewTag, setShowNewTag] = useState(false);

    const showAlert = (text: string, type: 'error' | 'success' = 'error') => {
        setAlertMsg({ text, type });
        setTimeout(() => setAlertMsg(null), 4000);
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
            const res = await axios.post(`${API_URL}/admin/funk`, { type });
            void res; // Mark as used
            showAlert(`${type === 'sakura' ? '🌸 Sakura' : type === 'neon' ? '🌌 Neon' : '🚫 Blacklist'} Funk aktualisiert!`, 'success');
        } catch (err: any) {
            showAlert(err.response?.data?.error || 'Fehler beim Funk-Update');
        } finally {
            setFunkLoading(null);
        }
    };

    const pendingUsers = state.users.filter((u: User) => u.status === 'pending');
    const approvedUsers = state.users.filter((u: User) => u.status === 'approved');

    const tabs = [
        { id: 'tags', label: 'Tags', icon: <Tag size={16} /> },
        { id: 'users', label: 'Benutzer', icon: <Users size={16} />, badge: pendingUsers.length },
        { id: 'columns', label: 'Spalten', icon: <LayoutGrid size={16} /> },
        { id: 'moderation', label: 'Moderation', icon: <Swords size={16} /> },
    ] as const;

    return (
        <div className="admin-screen">
            <div className="admin-container surface">
                <aside className="admin-sidebar">
                    <div className="sidebar-header">
                        <Shield className="text-sakura" size={20} />
                        <h1 className="sidebar-title">Admin Panel</h1>
                    </div>
                    <nav className="sidebar-nav">
                        {(tabs as any).map((tab: any) => (
                            <button
                                key={tab.id}
                                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id as AdminTab)}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {tab.badge ? <span className="tab-badge-count">{tab.badge}</span> : null}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="admin-main">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="admin-tab-content"
                        >
                            {alertMsg && <InlineAlert message={alertMsg.text} type={alertMsg.type} onClose={() => setAlertMsg(null)} />}

                            {/* ── TAGS ── */}
                            {activeTab === 'tags' && (
                                <div className="admin-section">
                                    <div className="section-header">
                                        <h2 className="section-title">Tags verwalten</h2>
                                        <button className="btn btn-primary btn-sm" onClick={() => setShowNewTag(true)}>
                                            <Plus size={14} /> Neuer Tag
                                        </button>
                                    </div>

                                    {showNewTag && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="tag-editor surface elevated"
                                        >
                                            <input
                                                className="input"
                                                placeholder="Tag-Name…"
                                                value={newTagName}
                                                onChange={e => setNewTagName(e.target.value)}
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
                                        </motion.div>
                                    )}

                                    <div className="tags-list">
                                        {state.tags.map(tag => (
                                            <div key={tag.id} className="tag-row row-item surface">
                                                {editingTag?.id === tag.id ? (
                                                    <div className="flex gap-3 items-center w-full">
                                                        <input
                                                            className="input input-sm"
                                                            value={editingTag.name}
                                                            onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
                                                        />
                                                        <div className="color-picker-mini">
                                                            {TAG_COLORS.map(c => (
                                                                <button
                                                                    key={c}
                                                                    className={`color-dot-sm ${editingTag.color === c ? 'selected' : ''}`}
                                                                    style={{ background: c }}
                                                                    onClick={() => setEditingTag({ ...editingTag, color: c })}
                                                                />
                                                            ))}
                                                        </div>
                                                        <button className="btn btn-primary btn-sm" onClick={handleUpdateTag}><Check size={13} /></button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingTag(null)}><X size={13} /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="tag-pill" style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}55` }}>
                                                            {tag.name}
                                                        </span>
                                                        <span className="text-xs text-muted flex-1">{state.cards.filter(c => c.tagIds.includes(tag.id)).length} Karten</span>
                                                        <div className="flex gap-1">
                                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingTag(tag)}>
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => dispatch({ type: 'DELETE_TAG', tagId: tag.id })}>
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
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
                                    <h2 className="section-title">Benutzer & Rollen</h2>

                                    {pendingUsers.length > 0 && (
                                        <div className="pending-section mb-8">
                                            <h3 className="section-subtitle flex items-center gap-2">
                                                <Clock size={14} className="text-sakura" /> Offene Anfragen ({pendingUsers.length})
                                            </h3>
                                            <div className="users-list">
                                                {pendingUsers.map(user => (
                                                    <div key={user.id} className="user-row row-item surface highlight">
                                                        <div className="avatar-wrapper">
                                                            {user.avatar ? (
                                                                <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="avatar-circle" alt="" />
                                                            ) : (
                                                                <div className="avatar-circle avatar-placeholder">{user.name.substring(0, 1)}</div>
                                                            )}
                                                        </div>
                                                        <div className="user-info">
                                                            <p className="user-name">{user.name}</p>
                                                            <p className="user-status text-xs">Wartet auf Freischaltung</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button className="btn btn-sm btn-primary" onClick={() => handleApproveUser(user, 'editor')}>Editor</button>
                                                            <button className="btn btn-sm btn-secondary" onClick={() => handleApproveUser(user, 'viewer')}>Viewer</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="section-subtitle mt-8">Verifizierte Benutzer</h3>
                                    <div className="users-list">
                                        {approvedUsers.map(user => {
                                            const isSelf = user.id === currentUser?.id;
                                            return (
                                                <div key={user.id} className="user-grid-item surface">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="avatar-wrapper">
                                                            {user.avatar ? (
                                                                <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=40`} className="avatar-circle" alt="" />
                                                            ) : (
                                                                <div className="avatar-circle avatar-placeholder">{user.name.substring(0, 1)}</div>
                                                            )}
                                                        </div>
                                                        <div className="user-info flex-1">
                                                            <p className="user-name">{user.name} {isSelf && <span className="self-tag">Ich</span>}</p>
                                                            <p className="user-id text-xs">ID: {user.id}</p>
                                                        </div>
                                                    </div>

                                                    <div className="admin-controls-row">
                                                        <div className="role-switcher">
                                                            {ROLE_OPTIONS.map(role => (
                                                                <button
                                                                    key={role}
                                                                    disabled={isSelf}
                                                                    className={`role-btn role-${role} ${user.role === role ? 'active' : ''}`}
                                                                    onClick={() => handleUserRoleChange(user, role)}
                                                                >
                                                                    {role}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {!isSelf && user.role === 'editor' && (
                                                        <div className="permissions-grid">
                                                            <label className="perm-label">
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
                                                                <span>Spalten löschen</span>
                                                            </label>
                                                            <label className="perm-label">
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
                                                                <span>Karten löschen</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── COLUMNS ── */}
                            {activeTab === 'columns' && (
                                <div className="admin-section">
                                    <h2 className="section-title">Board-Spalten</h2>
                                    <div className="columns-grid">
                                        {state.columns.map(col => (
                                            <div key={col.id} className="col-card surface">
                                                <div className="col-accent" style={{ background: col.color }} />
                                                <div className="col-header p-4">
                                                    <p className="font-bold">{col.title}</p>
                                                    <p className="text-xs text-muted mt-1">{col.cardIds.length} Karten hinterlegt</p>
                                                </div>
                                                <div className="col-footer p-4 pt-0 flex justify-end">
                                                    <button
                                                        className="btn btn-danger btn-icon btn-sm"
                                                        onClick={() => {
                                                            if (confirm(`Soll die Spalte "${col.title}" wirklich dauerhaft gelöscht werden?`)) {
                                                                dispatch({ type: 'DELETE_COLUMN', columnId: col.id });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── MODERATION ── */}
                            {activeTab === 'moderation' && (
                                <div className="admin-section">
                                    <div className="section-header">
                                        <h2 className="section-title flex items-center gap-2">
                                            <Swords size={18} className="text-sakura" /> Discord Moderation
                                        </h2>
                                        <button className="btn btn-secondary btn-sm" onClick={loadGuildMembers} disabled={membersLoading}>
                                            {membersLoading ? <Clock className="animate-spin" size={14} /> : <Users size={14} />}
                                            {membersLoading ? 'Lädt…' : 'Mitglieder laden'}
                                        </button>
                                    </div>

                                    <div className="mod-search-container surface elevated mb-6">
                                        <div className="search-bar">
                                            <input
                                                className="input search-input"
                                                placeholder="Name oder ID suchen…"
                                                value={memberSearch}
                                                onChange={e => setMemberSearch(e.target.value)}
                                            />
                                        </div>
                                        {guildMembers.length > 0 && (
                                            <div className="member-picker-scroll custom-scrollbar">
                                                {guildMembers
                                                    .filter(m => {
                                                        const q = memberSearch.toLowerCase();
                                                        return !q || m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q) || m.id.includes(q);
                                                    })
                                                    .map(m => (
                                                        <button
                                                            key={m.id}
                                                            className={`member-option ${selectedMember?.id === m.id ? 'active' : ''}`}
                                                            onClick={() => { setSelectedMember({ id: m.id, displayName: m.displayName }); setModUserId(m.id); }}
                                                        >
                                                            <div className="avatar-sm-wrapper">
                                                                {m.avatar ? <img src={m.avatar} alt="" /> : <div className="avatar-placeholder">{m.displayName[0]}</div>}
                                                            </div>
                                                            <div className="member-details">
                                                                <span className="member-name">{m.displayName}</span>
                                                                <span className="member-tag">@{m.username}</span>
                                                            </div>
                                                            {selectedMember?.id === m.id && <Check size={14} className="text-sakura" />}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                        {guildMembers.length === 0 && !membersLoading && (
                                            <div className="p-8 text-center text-muted text-sm">
                                                Lade die Discord-Mitglieder, um Aktionen durchzuführen.
                                            </div>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {selectedMember && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mod-actions-area surface elevated"
                                            >
                                                <div className="mod-header-active">
                                                    <span className="text-sm text-muted">Ausgewählt:</span>
                                                    <span className="text-sakura font-bold ml-2">{selectedMember.displayName}</span>
                                                </div>

                                                <div className="form-grid mt-4">
                                                    <div className="form-group">
                                                        <label className="form-label">Grund</label>
                                                        <input className="input" placeholder="Warum erfolgt diese Maßnahme?" value={modReason} onChange={e => setModReason(e.target.value)} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Timeout (Minuten)</label>
                                                        <input className="input" type="number" min={1} value={modDuration} onChange={e => setModDuration(Number(e.target.value))} />
                                                    </div>
                                                </div>

                                                <div className="action-buttons-group mt-6">
                                                    <button className="btn btn-warning" onClick={() => handleModerationAction('timeout')} disabled={modLoading}>
                                                        {modLoading ? '...' : <Clock size={16} />} Timeout
                                                    </button>
                                                    <button className="btn btn-danger-soft" onClick={() => handleModerationAction('kick')} disabled={modLoading}>
                                                        {modLoading ? '...' : <UserX size={16} />} Kicken
                                                    </button>
                                                    <button className="btn btn-danger" onClick={() => { if (confirm('Sicher bannen?')) handleModerationAction('ban') }} disabled={modLoading}>
                                                        {modLoading ? '...' : <Shield size={16} />} Bannen
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="mod-funk-section mt-10">
                                        <h3 className="section-subtitle flex items-center gap-2">
                                            <Zap size={15} className="text-sakura" /> Funk-System Steuerung
                                        </h3>
                                        <div className="funk-buttons-grid mt-4">
                                            <button className="funk-btn btn-sakura" onClick={() => handleFunkUpdate('sakura')} disabled={!!funkLoading}>
                                                {funkLoading === 'sakura' ? '...' : '🌸 Sakura Funk'}
                                            </button>
                                            <button className="funk-btn btn-neon" onClick={() => handleFunkUpdate('neon')} disabled={!!funkLoading}>
                                                {funkLoading === 'neon' ? '...' : '🌌 Neon Lotus'}
                                            </button>
                                            <button className="funk-btn btn-dark" onClick={() => handleFunkUpdate('blacklist')} disabled={!!funkLoading}>
                                                {funkLoading === 'blacklist' ? '...' : '🚫 Blacklist'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
