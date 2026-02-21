import { createContext, useContext, useEffect, useState, useCallback, useReducer } from 'react';
import axios from 'axios';
import type { AppState, Card, Column, Tag, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

// Token helpers (localStorage)
const getToken = () => localStorage.getItem('sakura_token');
const setToken = (t: string) => localStorage.setItem('sakura_token', t);
const clearToken = () => localStorage.removeItem('sakura_token');

// Always send token as Authorization header
axios.interceptors.request.use(config => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
axios.defaults.withCredentials = true;

// Board-Aktionen werden lokal im Reducer UND an die API geschickt.
type Action =
    | { type: 'ADD_CARD'; card: Card }
    | { type: 'UPDATE_CARD'; card: Card }
    | { type: 'DELETE_CARD'; cardId: string }
    | { type: 'MOVE_CARD'; cardId: string; fromColId: string; toColId: string; toIndex: number }
    | { type: 'ADD_COLUMN'; column: Column }
    | { type: 'UPDATE_COLUMN'; column: Column }
    | { type: 'DELETE_COLUMN'; columnId: string }
    | { type: 'ADD_TAG'; tag: Tag }
    | { type: 'UPDATE_TAG'; tag: Tag }
    | { type: 'DELETE_TAG'; tagId: string }
    | { type: 'SET_BOARD'; tags: Tag[]; columns: Column[]; cards: Card[] };

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_BOARD':
            return { ...state, tags: action.tags, columns: action.columns, cards: action.cards };
        case 'ADD_CARD': {
            const col = state.columns.find(c => c.id === action.card.columnId);
            if (!col) return state;
            return {
                ...state,
                cards: [...state.cards, action.card],
                columns: state.columns.map(c =>
                    c.id === col.id ? { ...c, cardIds: [...c.cardIds, action.card.id] } : c
                ),
            };
        }
        case 'UPDATE_CARD':
            return { ...state, cards: state.cards.map(c => c.id === action.card.id ? action.card : c) };
        case 'DELETE_CARD':
            return {
                ...state,
                cards: state.cards.filter(c => c.id !== action.cardId),
                columns: state.columns.map(c => ({
                    ...c,
                    cardIds: c.cardIds.filter(id => id !== action.cardId),
                })),
            };
        case 'MOVE_CARD': {
            const { cardId, fromColId, toColId, toIndex } = action;
            const fromCol = state.columns.find(c => c.id === fromColId);
            const toCol = state.columns.find(c => c.id === toColId);
            if (!fromCol || !toCol) return state;
            const newFromIds = fromCol.cardIds.filter(id => id !== cardId);
            const newToIds = toCol.cardIds.filter(id => id !== cardId);
            newToIds.splice(toIndex, 0, cardId);
            return {
                ...state,
                cards: state.cards.map(c => c.id === cardId ? { ...c, columnId: toColId } : c),
                columns: state.columns.map(c => {
                    if (c.id === fromColId) return { ...c, cardIds: newFromIds };
                    if (c.id === toColId) return { ...c, cardIds: newToIds };
                    return c;
                }),
            };
        }
        case 'ADD_COLUMN': return { ...state, columns: [...state.columns, action.column] };
        case 'UPDATE_COLUMN': return { ...state, columns: state.columns.map(c => c.id === action.column.id ? action.column : c) };
        case 'DELETE_COLUMN': {
            const col = state.columns.find(c => c.id === action.columnId);
            if (!col) return state;
            return {
                ...state,
                cards: state.cards.filter(c => !col.cardIds.includes(c.id)),
                columns: state.columns.filter(c => c.id !== action.columnId),
            };
        }
        case 'ADD_TAG': return { ...state, tags: [...state.tags, action.tag] };
        case 'UPDATE_TAG': return { ...state, tags: state.tags.map(t => t.id === action.tag.id ? action.tag : t) };
        case 'DELETE_TAG':
            return {
                ...state,
                tags: state.tags.filter(t => t.id !== action.tagId),
                cards: state.cards.map(c => ({ ...c, tagIds: c.tagIds.filter(id => id !== action.tagId) })),
            };
        default:
            return state;
    }
}

const initialState: AppState = {
    currentUser: null,
    users: [],
    tags: [],
    cards: [],
    columns: [],
    isLoading: true,
};

interface AppContextValue {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    canEdit: (card: Card) => boolean;
    canView: (card: Card) => boolean;
    canDeleteColumn: () => boolean;
    canDeleteCard: (card: Card) => boolean;
    isAdmin: () => boolean;
    isLoading: boolean;
    logout: () => void;
    users: User[];
    fetchUsers: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Sync actions to API (fire-and-forget, errors logged)
function syncToApi(action: Action) {
    switch (action.type) {
        case 'ADD_CARD':
            axios.post(`${API_URL}/board/cards`, action.card).catch(e => console.error('Sync ADD_CARD failed', e));
            break;
        case 'UPDATE_CARD':
            axios.put(`${API_URL}/board/cards/${action.card.id}`, action.card).catch(e => console.error('Sync UPDATE_CARD failed', e));
            break;
        case 'DELETE_CARD':
            axios.delete(`${API_URL}/board/cards/${action.cardId}`).catch(e => console.error('Sync DELETE_CARD failed', e));
            break;
        case 'MOVE_CARD':
            axios.put(`${API_URL}/board/cards/${action.cardId}/move`, { columnId: action.toColId, sortOrder: action.toIndex }).catch(e => console.error('Sync MOVE_CARD failed', e));
            break;
        case 'ADD_COLUMN':
            axios.post(`${API_URL}/board/columns`, action.column).catch(e => console.error('Sync ADD_COLUMN failed', e));
            break;
        case 'UPDATE_COLUMN':
            axios.put(`${API_URL}/board/columns/${action.column.id}`, action.column).catch(e => console.error('Sync UPDATE_COLUMN failed', e));
            break;
        case 'DELETE_COLUMN':
            axios.delete(`${API_URL}/board/columns/${action.columnId}`).catch(e => console.error('Sync DELETE_COLUMN failed', e));
            break;
        case 'ADD_TAG':
            axios.post(`${API_URL}/board/tags`, action.tag).catch(e => console.error('Sync ADD_TAG failed', e));
            break;
        case 'UPDATE_TAG':
            axios.put(`${API_URL}/board/tags/${action.tag.id}`, action.tag).catch(e => console.error('Sync UPDATE_TAG failed', e));
            break;
        case 'DELETE_TAG':
            axios.delete(`${API_URL}/board/tags/${action.tagId}`).catch(e => console.error('Sync DELETE_TAG failed', e));
            break;
    }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, rawDispatch] = useReducer(reducer, initialState);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Wrapped dispatch: update local state AND sync to API
    const dispatch = useCallback((action: Action) => {
        rawDispatch(action);
        if (action.type !== 'SET_BOARD') {
            syncToApi(action);
        }
    }, []);

    // Load board data from API
    const fetchBoard = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/board`);
            rawDispatch({ type: 'SET_BOARD', tags: res.data.tags, columns: res.data.columns, cards: res.data.cards });
        } catch (err) {
            console.error('Could not load board from API:', err);
        }
    }, []);

    // Authenticate user on load
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        // Read token from URL after Discord OAuth redirect
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
            setToken(urlToken);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (!getToken()) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${API_URL}/users/me`, { timeout: 8000 });
            setCurrentUser(res.data);
            if (res.data.status === 'approved') {
                fetchUsers();
                fetchBoard(); // Load board data from DB
            }
        } catch (err: any) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                clearToken();
            }
            setCurrentUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`);
            const mapped = res.data.map((u: any) => ({
                id: u.user_id,
                name: u.username,
                email: '',
                avatar: u.avatar,
                role: u.website_role,
                status: u.status,
                permissions: {
                    canDeleteColumns: u.can_delete_columns !== 0,
                    canDeleteCards: u.can_delete_cards !== 0,
                },
            }));
            setUsers(mapped);
        } catch (err) {
            console.error('Could not load users');
        }
    };

    const logout = async () => {
        try {
            await axios.post(`${API_URL}/auth/logout`);
        } catch (error) {
            console.error(error);
        } finally {
            clearToken();
            setCurrentUser(null);
            window.location.href = '/';
        }
    };

    const isAdmin = useCallback(() => currentUser?.role === 'admin' && currentUser?.status === 'approved', [currentUser]);

    const canDeleteColumn = useCallback(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.permissions?.canDeleteColumns !== false;
    }, [currentUser]);

    const canDeleteCard = useCallback((card: Card) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (!canEdit(card)) return false;
        return currentUser.permissions?.canDeleteCards !== false;
    }, [currentUser]);

    const canView = useCallback((card: Card) => {
        if (!currentUser || currentUser.status !== 'approved') return false;
        if (currentUser.role === 'admin') return true;
        if (card.allowedViewerIds.length === 0) return true;
        return card.allowedViewerIds.includes(currentUser.id);
    }, [currentUser]);

    const canEdit = useCallback((card: Card) => {
        if (!currentUser || currentUser.status !== 'approved') return false;
        if (currentUser.role === 'admin') return true;
        if (currentUser.role === 'viewer') return false;
        if (card.allowedEditorIds.length === 0) return true;
        return card.allowedEditorIds.includes(currentUser.id);
    }, [currentUser]);

    const fullState = {
        ...state,
        currentUser,
        users,
        isLoading,
    };

    return (
        <AppContext.Provider value={{ state: fullState, dispatch, canEdit, canView, canDeleteColumn, canDeleteCard, isAdmin, isLoading, logout, users, fetchUsers }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used inside AppProvider');
    return ctx;
}
