import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Upload, Trash2, Calendar, User2, Tag, Lock, Eye, Edit3 } from 'lucide-react';
import type { Card } from '../types';
import { useApp } from '../context/AppContext';

interface CardModalProps {
    card?: Card;
    columnId?: string;
    onClose: () => void;
}

export function CardModal({ card, columnId, onClose }: CardModalProps) {
    const { state, dispatch, canEdit, isAdmin } = useApp();

    const editAllowed = card ? canEdit(card) : true;
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
        if (card && confirm('Delete this card?')) {
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

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="flex gap-2 items-center">
                        <div className="modal-icon">
                            <Edit3 size={16} />
                        </div>
                        <h2 className="modal-title">{card ? 'Edit Card' : 'New Card'}</h2>
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
                            <Lock size={13} /> Access
                        </button>
                    )}
                </div>

                <div className="modal-body">
                    {activeTab === 'details' ? (
                        <>
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="image-preview-container">
                                    <img src={imagePreview} alt="Card preview" className="image-preview" />
                                    {editAllowed && (
                                        <button className="image-remove-btn" onClick={() => { setImageUrl(''); setImagePreview(''); }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Title */}
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    className="input"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Card title…"
                                    disabled={!editAllowed}
                                />
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="textarea"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add a description…"
                                    disabled={!editAllowed}
                                />
                            </div>

                            {/* Image Upload */}
                            {editAllowed && (
                                <div className="form-group">
                                    <label className="form-label">Image</label>
                                    <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                                        <Upload size={14} /> Upload Image
                                    </button>
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                </div>
                            )}

                            {/* Due Date */}
                            <div className="form-group">
                                <label className="form-label"><Calendar size={13} /> Due Date</label>
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

                            {/* Assignees */}
                            <div className="form-group">
                                <label className="form-label"><User2 size={13} /> Assign To</label>
                                <div className="user-selector">
                                    {state.users.map(u => (
                                        <button
                                            key={u.id}
                                            className={`user-option ${assignedUserIds.includes(u.id) ? 'selected' : ''}`}
                                            onClick={() => editAllowed && toggleAssignee(u.id)}
                                        >
                                            <div className="avatar avatar-sm">{u.avatar}</div>
                                            <span>{u.name}</span>
                                            <span className={`badge-role badge-${u.role}`}>{u.role}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Access Control */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Eye size={13} /> Who can view this card?
                                </label>
                                <p className="text-xs text-muted mt-1">Empty = everyone can view</p>
                                <div className="user-selector mt-2">
                                    {state.users.filter(u => u.role !== 'admin').map(u => (
                                        <button
                                            key={u.id}
                                            className={`user-option ${allowedViewerIds.includes(u.id) ? 'selected' : ''}`}
                                            onClick={() => toggleViewer(u.id)}
                                        >
                                            <div className="avatar avatar-sm">{u.avatar}</div>
                                            <span>{u.name}</span>
                                            <span className={`badge-role badge-${u.role}`}>{u.role}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="divider" />

                            <div className="form-group">
                                <label className="form-label">
                                    <Edit3 size={13} /> Who can edit this card?
                                </label>
                                <p className="text-xs text-muted mt-1">Empty = all editors & admins can edit</p>
                                <div className="user-selector mt-2">
                                    {state.users.filter(u => u.role === 'editor').map(u => (
                                        <button
                                            key={u.id}
                                            className={`user-option ${allowedEditorIds.includes(u.id) ? 'selected' : ''}`}
                                            onClick={() => toggleEditor(u.id)}
                                        >
                                            <div className="avatar avatar-sm">{u.avatar}</div>
                                            <span>{u.name}</span>
                                            <span className="badge-role badge-editor">editor</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    {card && isAdmin() && (
                        <button className="btn btn-danger" onClick={handleDelete}>
                            <Trash2 size={14} /> Delete
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    {editAllowed && (
                        <button className="btn btn-primary" onClick={handleSave}>
                            {card ? 'Save Changes' : 'Create Card'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
