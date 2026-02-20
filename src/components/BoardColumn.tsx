import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
import type { Column, Card } from '../types';
import { useApp } from '../context/AppContext';
import { KanbanCard } from './KanbanCard';

interface BoardColumnProps {
    column: Column;
    onEditCard: (card: Card) => void;
    onAddCard: () => void;
}

export function BoardColumn({ column, onEditCard, onAddCard }: BoardColumnProps) {
    const { state, dispatch, isAdmin, canView } = useApp();

    const cards = column.cardIds
        .map(id => state.cards.find(c => c.id === id))
        .filter((c): c is Card => !!c && canView(c));

    const handleDeleteColumn = () => {
        if (confirm(`Delete column "${column.title}"?`)) {
            dispatch({ type: 'DELETE_COLUMN', columnId: column.id });
        }
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
                    {isAdmin() && (
                        <button className="btn btn-ghost btn-icon" onClick={handleDeleteColumn} title="Delete column">
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
                                        <KanbanCard card={card} onClick={() => onEditCard(card)} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
