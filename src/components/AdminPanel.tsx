import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Tag, Users, LayoutGrid, Trash2, Edit2, Plus, Check, X, Shield, Clock, AlertCircle, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Tag as TagType, User, Role } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

type AdminTab = 'tags' | 'users' | 'columns';

const ROLE_OPTIONS: Role[] = ['admin', 'editor', 'viewer'];

const TAG_COLORS = [
    '#ff6b9d', '#ff4757', '#ffa502', '#7bed9f',
    '#70a1ff', '#eccc68', '#a29bfe', '#fd79a8',
    '#00cec9', '#e17055',
];

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

    const pendingUsers = state.users.filter((u: User) => u.status === 'pending');
    const approvedUsers = state.users.filter((u: User) => u.status === 'approved');

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <div className="flex items-center gap-3">
                    <div className="admin-icon"><Shield size={20} /></div>
                    <div>
                        <h1 className="admin-title">Admin Panel</h1>
                        <p className="text-sm text-muted">Tags, Benutzer und Spalten verwalten</p>
                    </div>
                </div>
            </div>

            {alertMsg && (
                <InlineAlert message={alertMsg.text} type={alertMsg.type} onClose={() => setAlertMsg(null)} />
            )}

            <div className="admin-tabs">
                {([
                    { key: 'tags', icon: <Tag size={15} />, label: 'Tags' },
                    { key: 'users', icon: <Users size={15} />, label: `Benutzer${pendingUsers.length > 0 ? ` (${pendingUsers.length} ⏳)` : ''}` },
                    { key: 'columns', icon: <LayoutGrid size={15} />, label: 'Spalten' },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
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
                        </div>

                        {pendingUsers.length > 0 && (
                            <div className="pending-section" style={{ marginBottom: '24px' }}>
                                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--sakura-400)', marginBottom: '8px' }}>
                                    <Clock size={14} /> Zugriffsanfragen ({pendingUsers.length})
                                </h3>
                                <div className="users-list">
                                    {pendingUsers.map(user => (
                                        <div key={user.id} className="user-row surface" style={{ borderColor: 'var(--sakura-400)' }}>
                                            {user.avatar ? (
                                                <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="avatar avatar-lg" alt="" />
                                            ) : (
                                                <div className="avatar avatar-lg">{user.name.substring(0, 2).toUpperCase()}</div>
                                            )}
                                            <div className="user-info">
                                                <p className="font-semibold">{user.name}</p>
                                                <p className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <UserX size={11} /> Nicht auf dem Sakura Discord
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="btn btn-sm btn-primary" onClick={() => handleApproveUser(user, 'editor')}>Als Editor freischalten</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleApproveUser(user, 'viewer')}>Als Viewer freischalten</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <h3 className="text-sm font-bold text-muted" style={{ marginBottom: '8px' }}>Freigeschaltete Benutzer</h3>
                        <div className="users-list">
                            {approvedUsers.map(user => {
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
                                    </div>
                                );
                            })}
                        </div>
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
            </div>
        </div>
    );
}
