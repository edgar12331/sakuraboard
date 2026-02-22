import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
    const [newColColor, setNewColColor] = useState('#ff6b9d');
    const [showNewCol, setShowNewCol] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Column reordering
        if (type === 'column') {
            const newColumnIds = state.columns.map(c => c.id);
            const [removed] = newColumnIds.splice(source.index, 1);
            newColumnIds.splice(destination.index, 0, removed);
            dispatch({ type: 'REORDER_COLUMNS', columnIds: newColumnIds });
            return;
        }

        // Card movement
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
        dispatch({
            type: 'ADD_COLUMN',
            column: {
                id: uuidv4(),
                title: newColTitle.trim(),
                color: newColColor,
                cardIds: [],
            },
        });
        setNewColTitle('');
        setNewColColor('#ff6b9d');
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
                <Droppable droppableId="board" type="column" direction="horizontal">
                    {(provided) => (
                        <div
                            className="board-columns"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {state.columns.map((col, index) => (
                                <Draggable key={col.id} draggableId={`col-${col.id}`} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className={`column-drag-wrapper ${dragSnapshot.isDragging ? 'column-dragging' : ''}`}
                                        >
                                            <BoardColumn
                                                column={col}
                                                onEditCard={setEditingCard}
                                                onAddCard={() => setAddingCard({ columnId: col.id })}
                                                filterCardIds={filteredCardIds}
                                                dragHandleProps={dragProvided.dragHandleProps}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}

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
                                            <div style={{ marginTop: '10px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                                                    FARBE
                                                </label>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {['#ff6b9d', '#ffa4c4', '#c9b8f5', '#7bed9f', '#70a1ff', '#eccc68'].map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setNewColColor(color)}
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                borderRadius: '6px',
                                                                background: color,
                                                                border: newColColor === color ? '3px solid var(--bg-card)' : '2px solid var(--border)',
                                                                boxShadow: newColColor === color ? '0 0 0 2px ' + color : 'none',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                            title={color}
                                                        />
                                                    ))}
                                                    <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
                                                    <input
                                                        type="color"
                                                        value={newColColor}
                                                        onChange={e => setNewColColor(e.target.value)}
                                                        style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                                                        title="Eigene Farbe wählen"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button className="btn btn-primary btn-sm" onClick={handleAddColumn}>Hinzufügen</button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => { setShowNewCol(false); setNewColTitle(''); setNewColColor('#ff6b9d'); }}>Abbrechen</button>
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
                    )}
                </Droppable>
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
