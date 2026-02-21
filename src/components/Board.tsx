import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BoardColumn } from './BoardColumn';
import { CardModal } from './CardModal';
import type { Card } from '../types';

export function Board() {
    const { state, dispatch, isAdmin } = useApp();
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [addingCard, setAddingCard] = useState<{ columnId: string } | null>(null);
    const [newColTitle, setNewColTitle] = useState('');
    const [showNewCol, setShowNewCol] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        dispatch({
            type: 'MOVE_CARD',
            cardId: draggableId,
            fromColId: source.droppableId,
            toColId: destination.droppableId,
            toIndex: destination.index,
        });
    };

    const handleAddColumn = () => {
        if (!newColTitle.trim()) return;
        const colors = ['#ff6b9d', '#ffa4c4', '#c9b8f5', '#7bed9f', '#70a1ff', '#eccc68'];
        dispatch({
            type: 'ADD_COLUMN',
            column: {
                id: uuidv4(),
                title: newColTitle.trim(),
                color: colors[Math.floor(Math.random() * colors.length)],
                cardIds: [],
            },
        });
        setNewColTitle('');
        setShowNewCol(false);
    };

    // Filter cards by search query (title, description, or tag name)
    const filteredCards = searchQuery.trim()
        ? state.cards.filter(card => {
            const q = searchQuery.toLowerCase();
            if (card.title.toLowerCase().includes(q)) return true;
            if (card.description?.toLowerCase().includes(q)) return true;
            const cardTags = card.tagIds.map(id => state.tags.find(t => t.id === id)).filter(Boolean);
            if (cardTags.some(t => t && t.name.toLowerCase().includes(q))) return true;
            return false;
        })
        : state.cards;

    const filteredCardIds = new Set(filteredCards.map(c => c.id));

    return (
        <div className="board-wrapper">
            {/* Search Bar */}
            <div className="board-search">
                <div className="search-input-wrapper">
                    <Search size={15} className="search-icon" />
                    <input
                        className="input search-input"
                        placeholder="Karten durchsuchen…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="board-columns">
                    {state.columns.map(col => (
                        <BoardColumn
                            key={col.id}
                            column={col}
                            onEditCard={setEditingCard}
                            onAddCard={() => setAddingCard({ columnId: col.id })}
                            filterCardIds={filteredCardIds}
                        />
                    ))}

                    {isAdmin() && (
                        <div className="new-column-wrapper">
                            {showNewCol ? (
                                <div className="new-column-form surface">
                                    <input
                                        className="input"
                                        placeholder="Spaltenname…"
                                        value={newColTitle}
                                        onChange={e => setNewColTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button className="btn btn-primary btn-sm" onClick={handleAddColumn}>Hinzufügen</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowNewCol(false)}>Abbrechen</button>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn-add-column" onClick={() => setShowNewCol(true)}>
                                    <Plus size={16} /> Spalte hinzufügen
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </DragDropContext>

            {(editingCard || addingCard) && (
                <CardModal
                    card={editingCard ?? undefined}
                    columnId={addingCard?.columnId}
                    onClose={() => { setEditingCard(null); setAddingCard(null); }}
                />
            )}
        </div>
    );
}
