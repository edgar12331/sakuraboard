import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Tag, Users, LayoutGrid, Trash2, Edit2, Plus, Check, X, Shield, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Tag as TagType, User, Role } from '../types';

type AdminTab = 'tags' | 'users' | 'columns';

const ROLE_OPTIONS: Role[] = ['admin', 'editor', 'viewer'];

const TAG_COLORS = [
    '#ff6b9d', '#ff4757', '#ffa502', '#7bed9f',
    '#70a1ff', '#eccc68', '#a29bfe', '#fd79a8',
    '#00cec9', '#e17055',
];

export function AdminPanel() {
    const { state, dispatch, fetchUsers } = useApp();
    const [activeTab, setActiveTab] = useState<AdminTab>('tags');

    // Tag state
    const [editingTag, setEditingTag] = useState<TagType | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [showNewTag, setShowNewTag] = useState(false);

    // User state
    // (editingUser removed as it is no longer used)

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
        try {
            await axios.post(`http://localhost:3001/api/admin/users/${user.id}`, {
                status: user.status || 'approved',
                website_role: role
            }, { withCredentials: true });
            if (fetchUsers) fetchUsers();
        } catch (err) {
            console.error(err);
            alert('Could not update user');
        }
    };

    const handleApproveUser = async (user: User, role: Role) => {
        try {
            await axios.post(`http://localhost:3001/api/admin/users/${user.id}`, {
                status: 'approved',
                website_role: role
            }, { withCredentials: true });
            if (fetchUsers) fetchUsers();
        } catch (err) {
            console.error(err);
            alert('Could not approve user');
        }
    };

    // Use users from state.users since our api fetched them
    const pendingUsers = state.users.filter((u: User) => u.status === 'pending');
    const approvedUsers = state.users.filter((u: User) => u.status === 'approved');

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <div className="flex items-center gap-3">
                    <div className="admin-icon"><Shield size={20} /></div>
                    <div>
                        <h1 className="admin-title">Admin Panel</h1>
                        <p className="text-sm text-muted">Manage tags, users, and columns</p>
                    </div>
                </div>
            </div>

            <div className="admin-tabs">
                {([
                    { key: 'tags', icon: <Tag size={15} />, label: 'Tags' },
                    { key: 'users', icon: <Users size={15} />, label: 'Users' },
                    { key: 'columns', icon: <LayoutGrid size={15} />, label: 'Columns' },
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
                                <Plus size={14} /> New Tag
                            </button>
                        </div>

                        {showNewTag && (
                            <div className="tag-editor surface">
                                <input
                                    className="input"
                                    placeholder="Tag name…"
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
                                    <button className="btn btn-primary btn-sm" onClick={handleAddTag}><Check size={13} /> Add</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowNewTag(false)}><X size={13} /> Cancel</button>
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
                                            <span className="text-xs text-muted">{state.cards.filter(c => c.tagIds.includes(tag.id)).length} cards</span>
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
                            <h2 className="section-title">Users & Roles</h2>
                        </div>

                        {pendingUsers.length > 0 && (
                            <div className="pending-section" style={{ marginBottom: '24px' }}>
                                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--sakura-400)', marginBottom: '8px' }}>
                                    <Clock size={14} /> Pending Approvals ({pendingUsers.length})
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
                                                <p className="text-xs text-muted">Awaiting access</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="btn btn-sm btn-primary" onClick={() => handleApproveUser(user, 'editor')}>Approve as Editor</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleApproveUser(user, 'viewer')}>Approve as Viewer</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <h3 className="text-sm font-bold text-muted" style={{ marginBottom: '8px' }}>Approved Users</h3>
                        <div className="users-list">
                            {approvedUsers.map(user => (
                                <div key={user.id} className="user-row surface">
                                    {user.avatar && user.avatar.length > 5 ? (
                                        <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="avatar avatar-lg" alt="" />
                                    ) : (
                                        <div className="avatar avatar-lg">{user.avatar || user.name.substring(0, 2).toUpperCase()}</div>
                                    )}
                                    <div className="user-info">
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-xs text-muted">ID: {user.id}</p>
                                    </div>
                                    <div className="role-selector">
                                        {ROLE_OPTIONS.map(role => (
                                            <button
                                                key={role}
                                                className={`role-btn ${user.role === role ? 'selected' : ''} role-${role}`}
                                                onClick={() => handleUserRoleChange(user, role)}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── COLUMNS ── */}
                {activeTab === 'columns' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2 className="section-title">Board Columns</h2>
                        </div>

                        <div className="columns-list">
                            {state.columns.map(col => (
                                <div key={col.id} className="col-row surface">
                                    <div className="col-color-swatch" style={{ background: col.color }} />
                                    <div>
                                        <p className="font-semibold">{col.title}</p>
                                        <p className="text-xs text-muted">{col.cardIds.length} cards</p>
                                    </div>
                                    <button
                                        className="btn btn-danger btn-icon btn-sm"
                                        onClick={() => {
                                            if (confirm(`Delete column "${col.title}" and all its cards?`)) {
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
