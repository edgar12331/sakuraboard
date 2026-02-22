import React from 'react';
import { Calendar, Image } from 'lucide-react';
import type { Card, Tag, User } from '../types';

interface KanbanCardProps {
    card: Card;
    tags: Tag[];
    assignees: User[];
    onClick: () => void;
}

export const KanbanCard = React.memo(function KanbanCard({ card, tags, assignees, onClick }: KanbanCardProps) {
    const isSpacer = /^--+$/.test(card.title.trim());

    if (isSpacer) {
        return (
            <div className="kanban-card-spacer" onClick={onClick}>
                <hr />
            </div>
        );
    }


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
                            <div key={u.id} className="avatar avatar-sm" title={u.name} style={{ overflow: 'hidden' }}>
                                {u.id && u.avatar && u.avatar.length > 5 ? (
                                    <img src={`https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=32`} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (
                                    u.name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                        ))}
                        {assignees.length > 3 && (
                            <div className="avatar avatar-sm" style={{ fontSize: '9px' }}>+{assignees.length - 3}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
