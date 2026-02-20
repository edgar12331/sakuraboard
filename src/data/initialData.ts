import type { User, Tag, Card, Column } from '../types';

export const initialUsers: User[] = [
    {
        id: 'user-1',
        name: 'Admin Sakura',
        email: 'admin@sakura.io',
        avatar: 'AS',
        role: 'admin',
    },
    {
        id: 'user-2',
        name: 'Hana Mori',
        email: 'hana@sakura.io',
        avatar: 'HM',
        role: 'editor',
    },
    {
        id: 'user-3',
        name: 'Ren Tanaka',
        email: 'ren@sakura.io',
        avatar: 'RT',
        role: 'viewer',
    },
    {
        id: 'user-4',
        name: 'Yuki Sato',
        email: 'yuki@sakura.io',
        avatar: 'YS',
        role: 'editor',
    },
];

export const initialTags: Tag[] = [
    { id: 'tag-1', name: 'Design', color: '#ff6b9d' },
    { id: 'tag-2', name: 'Bug', color: '#ff4757' },
    { id: 'tag-3', name: 'Feature', color: '#7bed9f' },
    { id: 'tag-4', name: 'Urgent', color: '#ffa502' },
    { id: 'tag-5', name: 'Backend', color: '#70a1ff' },
    { id: 'tag-6', name: 'Review', color: '#eccc68' },
];

export const initialColumns: Column[] = [
    { id: 'col-1', title: 'To Do', color: '#ff6b9d', cardIds: ['card-1', 'card-2'] },
    { id: 'col-2', title: 'In Progress', color: '#ffa4c4', cardIds: ['card-3'] },
    { id: 'col-3', title: 'Review', color: '#c9b8f5', cardIds: ['card-4'] },
    { id: 'col-4', title: 'Done', color: '#7bed9f', cardIds: [] },
];

export const initialCards: Card[] = [
    {
        id: 'card-1',
        columnId: 'col-1',
        title: 'Design Landing Page',
        description: 'Create a stunning sakura-themed landing page with hero section and feature highlights.',
        tagIds: ['tag-1', 'tag-3'],
        assignedUserIds: ['user-2'],
        createdAt: new Date().toISOString(),
        dueDate: '2026-02-28',
        allowedViewerIds: [],
        allowedEditorIds: [],
        comments: [],
    },
    {
        id: 'card-2',
        columnId: 'col-1',
        title: 'Fix Login Bug',
        description: 'Users cannot log in with Google OAuth on Safari browsers.',
        tagIds: ['tag-2', 'tag-4'],
        assignedUserIds: ['user-4'],
        createdAt: new Date().toISOString(),
        allowedViewerIds: [],
        allowedEditorIds: [],
        comments: [],
    },
    {
        id: 'card-3',
        columnId: 'col-2',
        title: 'Build API Endpoints',
        description: 'Implement REST endpoints for user management, cards, and columns.',
        tagIds: ['tag-5', 'tag-3'],
        assignedUserIds: ['user-2', 'user-4'],
        createdAt: new Date().toISOString(),
        dueDate: '2026-02-25',
        allowedViewerIds: [],
        allowedEditorIds: [],
        comments: [],
    },
    {
        id: 'card-4',
        columnId: 'col-3',
        title: 'Code Review — Auth Module',
        description: 'Review pull request for the authentication module refactor.',
        tagIds: ['tag-6'],
        assignedUserIds: ['user-1'],
        createdAt: new Date().toISOString(),
        allowedViewerIds: [],
        allowedEditorIds: [],
        comments: [],
    },
];
