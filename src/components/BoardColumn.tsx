import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import type { Column, Card, Tag, User } from '../types';
import { useApp } from '../context/AppContext';
import { KanbanCard } from './KanbanCard';
import { ConfirmDialog } from './ConfirmDialog';

interface BoardColumnProps {
    column: Column;
    onEditCard: (card: Card) => void;
    onAddCard: () => void;
    filterCardIds?: Set<string>;
    dragHandleProps?: any;
}

const COLUMN_COLORS = [
    '#ff6b9d', '#ffa4c4', '#c9b8f5', '#7bed9f',
    '#70a1ff', '#eccc68', '#ff7675', '#74b9ff',
    '#a29bfe', '#fd79a8', '#fdcb6e', '#6c5ce7'
];

export function BoardColumn({ column, onEditCard, onAddCard, filterCardIds, dragHandleProps }: BoardColumnProps) {
    const { state, dispatch, canView, canDeleteColumn, isAdmin } = useApp();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title);
    const [editColor, setEditColor] = useState(column.color);

    const cards = column.cardIds
        .map(id => state.cards.find(c => c.id === id))
        .filter((c): c is Card => !!c && canView(c) && (!filterCardIds || filterCardIds.has(c.id)));

    const handleDeleteColumn = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteColumn = () => {
        dispatch({ type: 'DELETE_COLUMN', columnId: column.id });
        setShowDeleteConfirm(false);
    };

    const handleStartEdit = () => {
        setEditTitle(column.title);
        setEditColor(column.color);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (!editTitle.trim()) return;
        dispatch({
            type: 'UPDATE_COLUMN',
            column: {
                ...column,
                title: editTitle.trim(),
                color: editColor,
            },
        });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditTitle(column.title);
        setEditColor(column.color);
        setIsEditing(false);
    };

    return (
        <div className="board-column">
            {isEditing ? (
                <div className="column-edit-form" style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                    <input
                        className="input"
                        style={{ marginBottom: '10px' }}
                        placeholder="Spaltenname…"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                    />
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                            FARBE
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {COLUMN_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setEditColor(color)}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        background: color,
                                        border: editColor === color ? '3px solid var(--bg-card)' : '2px solid var(--border)',
                                        boxShadow: editColor === color ? '0 0 0 2px ' + color : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    title={color}
                                />
                            ))}
                            <div style={{ width: '1px', height: '28px', background: 'var(--border)', margin: '0 8px' }} />
                            <div style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0 8px 0 4px', cursor: 'pointer' }} title="Eigene Farbe (Hex-Code)">
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '50%', marginRight: '6px',
                                    background: 'conic-gradient(#ff6b9d, #feca57, #1dd1a1, #5f27cd, #ff6b9d)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)', pointerEvents: 'none'
                                }}>
                                    <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%',
                                        background: editColor, border: '1.5px solid white',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Eigene</span>
                                <input
                                    type="color"
                                    value={editColor}
                                    onChange={e => setEditColor(e.target.value)}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} style={{ gap: '4px' }}>
                            <Check size={14} /> Speichern
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit} style={{ gap: '4px' }}>
                            <X size={14} /> Abbrechen
                        </button>
                    </div>
                </div>
            ) : (
                <div className="column-header" {...dragHandleProps}>
                    <div className="column-header-left">
                        <div className="column-color-dot" style={{ background: column.color }} />
                        <span className="column-title">{column.title}</span>
                        <span className="column-count">{cards.length}</span>
                    </div>
                    <div className="flex gap-1">
                        <button className="btn btn-ghost btn-icon" onClick={onAddCard} title="Karte hinzufügen">
                            <Plus size={14} />
                        </button>
                        {isAdmin() && (
                            <button className="btn btn-ghost btn-icon" onClick={handleStartEdit} title="Spalte bearbeiten">
                                <Edit2 size={14} />
                            </button>
                        )}
                        {canDeleteColumn() && (
                            <button className="btn btn-ghost btn-icon" onClick={handleDeleteColumn} title="Spalte löschen">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`column-cards ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                        {cards.map((card, index) => (
                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                {(prov, snap) => (
                                    <div
                                        ref={prov.innerRef}
                                        {...prov.draggableProps}
                                        {...prov.dragHandleProps}
                                        className={`card-wrapper ${snap.isDragging ? 'dragging' : ''}`}
                                    >
                                        <KanbanCard
                                            card={card}
                                            tags={card.tagIds.map(id => state.tags.find(t => t.id === id)).filter((t): t is Tag => !!t)}
                                            assignees={card.assignedUserIds.map(id => state.users.find(u => u.id === id)).filter((u): u is User => !!u)}
                                            onClick={() => onEditCard(card)}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Spalte löschen"
                    message={`Spalte "${column.title}" und alle ${cards.length} Karten darin wirklich löschen?`}
                    confirmText="Ja, löschen"
                    cancelText="Abbrechen"
                    variant="danger"
                    onConfirm={confirmDeleteColumn}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
}
