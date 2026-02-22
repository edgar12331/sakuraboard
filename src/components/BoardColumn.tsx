import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
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
}

export function BoardColumn({ column, onEditCard, onAddCard, filterCardIds }: BoardColumnProps) {
    const { state, dispatch, canView, canDeleteColumn } = useApp();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    return (
        <div className="board-column">
            <div className="column-header">
                <div className="column-header-left">
                    <div className="column-color-dot" style={{ background: column.color }} />
                    <span className="column-title">{column.title}</span>
                    <span className="column-count">{cards.length}</span>
                </div>
                <div className="flex gap-1">
                    <button className="btn btn-ghost btn-icon" onClick={onAddCard} title="Add card">
                        <Plus size={14} />
                    </button>
                    {canDeleteColumn() && (
                        <button className="btn btn-ghost btn-icon" onClick={handleDeleteColumn} title="Spalte löschen">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

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
