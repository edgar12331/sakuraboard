export type Role = 'admin' | 'editor' | 'viewer';

export interface User {
    id: string;
    name: string;
    email?: string;
    avatar: string | null;
    role: Role;
    status?: 'pending' | 'approved';
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface CardComment {
    id: string;
    userId: string;
    text: string;
    createdAt: string;
}

export interface Card {
    id: string;
    columnId: string;
    title: string;
    description: string;
    tagIds: string[];
    imageUrl?: string;
    assignedUserIds: string[];
    createdAt: string;
    dueDate?: string;
    allowedViewerIds: string[]; // user ids who can view (empty = all)
    allowedEditorIds: string[]; // user ids who can edit (empty = all editors+admins)
    comments: CardComment[];
}

export interface Column {
    id: string;
    title: string;
    color: string;
    cardIds: string[];
}

export interface Board {
    id: string;
    title: string;
    columns: Column[];
}

export interface AppState {
    currentUser: User | null;
    users: User[];
    tags: Tag[];
    cards: Card[];
    columns: Column[];
    isLoading: boolean;
}
