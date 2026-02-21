import { createContext, useContext, useEffect, useState, useCallback, useReducer } from 'react';
import axios from 'axios';
import type { AppState, Card, Column, Tag, User } from '../types';
import { initialTags, initialCards, initialColumns } from '../data/initialData';

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

// Wir nutzen weiterhin einen Teil des Reducers für lokale Board-Aktionen
// In einer echten App würde jede Aktion an die API gesendet werden.
// Hier behalten wir die Board-Zustände lokal im Reducer und speichern nur Auth in der API.
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
    | { type: 'DELETE_TAG'; tagId: string };

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'ADD_CARD': {
            const col = state.columns.find(c => c.id === action.card.columnId)!;
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
            const fromCol = state.columns.find(c => c.id === fromColId)!;
            const toCol = state.columns.find(c => c.id === toColId)!;
            const newFromIds = fromCol.cardIds.filter(id => id !== cardId);
            let newToIds = toCol.cardIds.filter(id => id !== cardId);
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
            const col = state.columns.find(c => c.id === action.columnId)!;
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

// ─── localStorage board persistence ───
const BOARD_STORAGE_KEY = 'sakura_board_state';

function loadBoardState() {
    try {
        const saved = localStorage.getItem(BOARD_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                tags: parsed.tags ?? initialTags,
                cards: parsed.cards ?? initialCards,
                columns: parsed.columns ?? initialColumns,
            };
        }
    } catch { /* ignore */ }
    return { tags: initialTags, cards: initialCards, columns: initialColumns };
}

function saveBoardState(state: AppState) {
    try {
        localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify({
            tags: state.tags,
            cards: state.cards,
            columns: state.columns,
        }));
    } catch { /* ignore */ }
}

// Wrap reducer to persist on every action
function persistingReducer(state: AppState, action: Action): AppState {
    const next = reducer(state, action);
    saveBoardState(next);
    return next;
}

const saved = loadBoardState();
const initialState: AppState = {
    currentUser: null,
    users: [],
    tags: saved.tags,
    cards: saved.cards,
    columns: saved.columns,
    isLoading: true,
};

interface AppContextValue {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    canEdit: (card: Card) => boolean;
    canView: (card: Card) => boolean;
    isAdmin: () => boolean;
    isLoading: boolean;
    logout: () => void;
    users: User[]; // All system users loaded from API
    fetchUsers: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(persistingReducer, initialState);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            }
        } catch (err: any) {
            // Only clear token on real auth errors (401/403), not on network/timeout
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
            // Map API data to our User format
            const mapped = res.data.map((u: any) => ({
                id: u.user_id,
                name: u.username,
                email: '',
                avatar: u.avatar,
                role: u.website_role,
                status: u.status,
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

    // Combine reducer state with react auth state
    const fullState = {
        ...state,
        currentUser,
        users,
        isLoading,
    };

    return (
        <AppContext.Provider value={{ state: fullState, dispatch, canEdit, canView, isAdmin, isLoading, logout, users, fetchUsers }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used inside AppProvider');
    return ctx;
}
