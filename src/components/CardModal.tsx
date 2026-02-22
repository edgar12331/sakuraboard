import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Upload, Trash2, Calendar, User2, Tag, Lock, Eye, Edit3, Check } from 'lucide-react';
import type { Card } from '../types';
import { useApp } from '../context/AppContext';
import { ConfirmDialog } from './ConfirmDialog';

interface CardModalProps {
    card?: Card;
    columnId?: string;
    onClose: () => void;
}

function UserAvatar({ userId, users }: { userId: string; users: ReturnType<typeof useApp>['state']['users'] }) {
    const u = users.find(u => u.id === userId);
    if (!u) return null;
    const avatarUrl = u.id && u.avatar && u.avatar.length > 10
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=32`
        : null;
    return (
        <div title={u.name} style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)' }}>
            {avatarUrl
                ? <img src={avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--sakura-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}>{u.name.substring(0, 2).toUpperCase()}</div>
            }
        </div>
    );
}

export function CardModal({ card, columnId, onClose }: CardModalProps) {
    const { state, dispatch, canEdit, canDeleteCard, isAdmin } = useApp();

    const editAllowed = card ? canEdit(card) : true;
    const deleteAllowed = card ? (isAdmin() || canDeleteCard(card)) : false;
    const colId = card?.columnId ?? columnId ?? state.columns[0]?.id;

    const [title, setTitle] = useState(card?.title ?? '');
    const [description, setDescription] = useState(card?.description ?? '');
    const [tagIds, setTagIds] = useState<string[]>(card?.tagIds ?? []);
    const [assignedUserIds, setAssignedUserIds] = useState<string[]>(card?.assignedUserIds ?? []);
    const [dueDate, setDueDate] = useState(card?.dueDate ?? '');
    const [imageUrl, setImageUrl] = useState(card?.imageUrl ?? '');
    const [allowedViewerIds, setAllowedViewerIds] = useState<string[]>(card?.allowedViewerIds ?? []);
    const [allowedEditorIds, setAllowedEditorIds] = useState<string[]>(card?.allowedEditorIds ?? []);
    const [activeTab, setActiveTab] = useState<'details' | 'access'>('details');
    const [imagePreview, setImagePreview] = useState<string>(card?.imageUrl ?? '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (!title.trim()) return;
        const updated: Card = {
            id: card?.id ?? uuidv4(),
            columnId: colId,
            title: title.trim(),
            description,
            tagIds,
            assignedUserIds,
            dueDate: dueDate || undefined,
            imageUrl: imageUrl || undefined,
            allowedViewerIds,
            allowedEditorIds,
            createdAt: card?.createdAt ?? new Date().toISOString(),
            comments: card?.comments ?? [],
        };
        dispatch({ type: card ? 'UPDATE_CARD' : 'ADD_CARD', card: updated });
        onClose();
    };

    const handleDelete = () => {
        if (card) {
            setShowDeleteConfirm(true);
        }
    };

    const confirmDelete = () => {
        if (card) {
            dispatch({ type: 'DELETE_CARD', cardId: card.id });
            onClose();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const url = ev.target?.result as string;
            setImageUrl(url);
            setImagePreview(url);
        };
        reader.readAsDataURL(file);
    };

    const toggleTag = (id: string) => setTagIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
    const toggleAssignee = (id: string) => setAssignedUserIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
    const toggleViewer = (id: string) => setAllowedViewerIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
    const toggleEditor = (id: string) => setAllowedEditorIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);

    const approvedUsers = state.users.filter(u => u.status === 'approved');

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="flex gap-2 items-center">
                        <div className="modal-icon">
                            <Edit3 size={16} />
                        </div>
                        <h2 className="modal-title">{card ? 'Karte bearbeiten' : 'Neue Karte'}</h2>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Details</button>
                    {(isAdmin() || (card && canEdit(card))) && (
                        <button className={`modal-tab ${activeTab === 'access' ? 'active' : ''}`} onClick={() => setActiveTab('access')}>
                            <Lock size={13} /> Zugriff
                        </button>
                    )}
                </div>

                <div className="modal-body">
                    {activeTab === 'details' ? (
                        <>
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="image-preview-container">
                                    <img src={imagePreview} alt="Vorschau" className="image-preview" />
                                    {editAllowed && (
                                        <button className="image-remove-btn" onClick={() => { setImageUrl(''); setImagePreview(''); }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Title */}
                            <div className="form-group">
                                <label className="form-label">Titel *</label>
                                <input
                                    className="input"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Kartenname…"
                                    disabled={!editAllowed}
                                />
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label className="form-label">Beschreibung</label>
                                <textarea
                                    className="textarea"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Beschreibung hinzufügen…"
                                    disabled={!editAllowed}
                                />
                            </div>

                            {/* Image Upload */}
                            {editAllowed && (
                                <div className="form-group">
                                    <label className="form-label">Bild</label>
                                    <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                                        <Upload size={14} /> Bild hochladen
                                    </button>
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                </div>
                            )}

                            {/* Due Date */}
                            <div className="form-group">
                                <label className="form-label"><Calendar size={13} /> Fälligkeitsdatum</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    disabled={!editAllowed}
                                />
                            </div>

                            {/* Tags */}
                            <div className="form-group">
                                <label className="form-label"><Tag size={13} /> Tags</label>
                                <div className="tag-selector">
                                    {state.tags.map(tag => (
                                        <button
                                            key={tag.id}
                                            className={`tag-option ${tagIds.includes(tag.id) ? 'selected' : ''}`}
                                            onClick={() => editAllowed && toggleTag(tag.id)}
                                            style={tagIds.includes(tag.id)
                                                ? { background: tag.color, color: '#fff', borderColor: tag.color }
                                                : { borderColor: tag.color + '66', color: tag.color }
                                            }
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Assignees with Discord Avatars */}
                            <div className="form-group">
                                <label className="form-label"><User2 size={13} /> Zuweisen an</label>
                                <div className="user-selector">
                                    {approvedUsers.map(u => {
                                        const avatarUrl = u.id && u.avatar && u.avatar.length > 10
                                            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=48`
                                            : null;
                                        const selected = assignedUserIds.includes(u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                className={`user-option ${selected ? 'selected' : ''}`}
                                                onClick={() => editAllowed && toggleAssignee(u.id)}
                                            >
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: selected ? '2px solid var(--sakura-400)' : '2px solid var(--border)' }}>
                                                    {avatarUrl
                                                        ? <img src={avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        : <div style={{ width: '100%', height: '100%', background: 'var(--sakura-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}>{u.name.substring(0, 2).toUpperCase()}</div>
                                                    }
                                                </div>
                                                <span style={{ flex: 1, textAlign: 'left' }}>{u.name}</span>
                                                <span className={`badge-role badge-${u.role}`}>{u.role}</span>
                                                {selected && <Check size={12} style={{ color: 'var(--sakura-400)' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Access Control */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Eye size={13} /> Wer darf diese Karte sehen?
                                </label>
                                <p className="text-xs text-muted mt-1">Leer = alle können sehen</p>
                                <div className="user-selector mt-2">
                                    {approvedUsers.filter(u => u.role !== 'admin').map(u => {
                                        const avatarUrl = u.id && u.avatar && u.avatar.length > 10
                                            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=32`
                                            : null;
                                        return (
                                            <button key={u.id} className={`user-option ${allowedViewerIds.includes(u.id) ? 'selected' : ''}`} onClick={() => toggleViewer(u.id)}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                                    {avatarUrl ? <img src={avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--sakura-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff' }}>{u.name.substring(0, 2).toUpperCase()}</div>}
                                                </div>
                                                <span>{u.name}</span>
                                                <span className={`badge-role badge-${u.role}`}>{u.role}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="divider" />

                            <div className="form-group">
                                <label className="form-label">
                                    <Edit3 size={13} /> Wer darf diese Karte bearbeiten?
                                </label>
                                <p className="text-xs text-muted mt-1">Leer = alle Editoren & Admins können bearbeiten</p>
                                <div className="user-selector mt-2">
                                    {approvedUsers.filter(u => u.role === 'editor').map(u => {
                                        const avatarUrl = u.id && u.avatar && u.avatar.length > 10
                                            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=32`
                                            : null;
                                        return (
                                            <button key={u.id} className={`user-option ${allowedEditorIds.includes(u.id) ? 'selected' : ''}`} onClick={() => toggleEditor(u.id)}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                                    {avatarUrl ? <img src={avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--sakura-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff' }}>{u.name.substring(0, 2).toUpperCase()}</div>}
                                                </div>
                                                <span>{u.name}</span>
                                                <span className="badge-role badge-editor">editor</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    {deleteAllowed && card && (
                        <button className="btn btn-danger" onClick={handleDelete}>
                            <Trash2 size={14} /> Löschen
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
                    {editAllowed && (
                        <button className="btn btn-primary" onClick={handleSave}>
                            {card ? 'Speichern' : 'Erstellen'}
                        </button>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Karte löschen"
                    message={`Möchtest du die Karte "${card?.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
                    confirmText="Ja, löschen"
                    cancelText="Abbrechen"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
}

export { UserAvatar };
