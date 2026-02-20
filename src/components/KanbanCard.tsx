import { Calendar, Image } from 'lucide-react';
import type { Card } from '../types';
import { useApp } from '../context/AppContext';

interface KanbanCardProps {
    card: Card;
    onClick: () => void;
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
    const { state } = useApp();

    const tags = card.tagIds.map(id => state.tags.find(t => t.id === id)).filter(Boolean);
    const assignees = card.assignedUserIds.map(id => state.users.find(u => u.id === id)).filter(Boolean);

    const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

    return (
        <div className="kanban-card" onClick={onClick}>
            {card.imageUrl && (
                <div className="card-image-preview">
                    <img src={card.imageUrl} alt="" />
                </div>
            )}

            {tags.length > 0 && (
                <div className="card-tags">
                    {tags.map(tag => tag && (
                        <span
                            key={tag.id}
                            className="tag-badge"
                            style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
            )}

            <p className="card-title">{card.title}</p>

            {card.description && (
                <p className="card-desc">{card.description}</p>
            )}

            <div className="card-footer">
                <div className="flex gap-2 items-center">
                    {card.dueDate && (
                        <span className={`card-meta-item ${isOverdue ? 'overdue' : ''}`}>
                            <Calendar size={11} />
                            {new Date(card.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                    {card.imageUrl && (
                        <span className="card-meta-item">
                            <Image size={11} />
                        </span>
                    )}
                </div>

                {assignees.length > 0 && (
                    <div className="card-assignees">
                        {assignees.slice(0, 3).map(u => u && (
                            <div key={u.id} className="avatar avatar-sm" title={u.name}>{u.avatar}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
