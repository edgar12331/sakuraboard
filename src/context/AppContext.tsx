import { createContext, useContext, useEffect, useRef, useState, useCallback, useReducer } from 'react';
import axios from 'axios';
import type { AppState, Card, Column, Tag, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

const BOARD_CACHE_KEY = 'sakura_board_cache_v1';

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
    | { type: 'DELETE_CARD'; cardId: string; affectedColumnIds?: string[] }
    | { type: 'MOVE_CARD'; cardId: string; fromColId: string; toColId: string; toIndex: number; siblingIds?: string[] }
    | { type: 'ADD_COLUMN'; column: Column }
    | { type: 'UPDATE_COLUMN'; column: Column }
    | { type: 'DELETE_COLUMN'; columnId: string; affectedCardIds?: string[] }
    | { type: 'ADD_TAG'; tag: Tag }
    | { type: 'UPDATE_TAG'; tag: Tag }
    | { type: 'DELETE_TAG'; tagId: string; affectedCardIds?: string[] }
    | { type: 'SET_BOARD'; tags: Tag[]; columns: Column[]; cards: Card[] };

type PendingKind = 'upsert' | 'delete';
type PendingMap = Map<string, PendingKind>;
interface PendingState {
    cards: PendingMap;
    columns: PendingMap;
    tags: PendingMap;
}

type ToastType = 'success' | 'error' | 'info';
interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

function loadBoardCache(): { tags: Tag[]; columns: Column[]; cards: Card[] } | null {
    try {
        const raw = localStorage.getItem(BOARD_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.tags || !parsed?.columns || !parsed?.cards) return null;
        return { tags: parsed.tags, columns: parsed.columns, cards: parsed.cards };
    } catch {
        return null;
    }
}

function saveBoardCache(tags: Tag[], columns: Column[], cards: Card[]) {
    try {
        localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify({ tags, columns, cards, savedAt: Date.now() }));
    } catch {
        // ignore cache write errors (private mode or quota)
    }
}

function clearBoardCache() {
    try {
        localStorage.removeItem(BOARD_CACHE_KEY);
    } catch {
        // ignore cache clear errors
    }
}

function mergeEntities<T extends { id: string }>(local: T[], remote: T[], pending: PendingMap): T[] {
    const remoteMap = new Map(remote.map(item => [item.id, item]));
    const localMap = new Map(local.map(item => [item.id, item]));
    const merged: T[] = [];
    const used = new Set<string>();

    for (const [id, remoteItem] of remoteMap.entries()) {
        const pendingKind = pending.get(id);
        if (pendingKind === 'delete') continue;
        if (pendingKind === 'upsert') {
            const localItem = localMap.get(id);
            merged.push(localItem ?? remoteItem);
        } else {
            merged.push(remoteItem);
        }
        used.add(id);
    }

    for (const [id, localItem] of localMap.entries()) {
        if (used.has(id)) continue;
        if (pending.get(id) === 'upsert') {
            merged.push(localItem);
        }
    }

    return merged;
}

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
            if (fromColId === toColId) {
                const newIds = fromCol.cardIds.filter(id => id !== cardId);
                newIds.splice(toIndex, 0, cardId);
                action.siblingIds = [...newIds];
                return {
                    ...state,
                    columns: state.columns.map(c =>
                        c.id === fromColId ? { ...c, cardIds: newIds } : c
                    ),
                };
            }

            const newFromIds = fromCol.cardIds.filter(id => id !== cardId);
            const newToIds = toCol.cardIds.filter(id => id !== cardId);
            newToIds.splice(toIndex, 0, cardId);
            action.siblingIds = [...newToIds];
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
    toasts: Toast[];
    notify: (message: string, type?: ToastType) => void;
    dismissToast: (id: string) => void;
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

// Sync actions to API — returns promise
function syncToApi(action: Action): Promise<void> {
    switch (action.type) {
        case 'ADD_CARD':
            return axios.post(`${API_URL}/board/cards`, action.card).then(() => { });
        case 'UPDATE_CARD':
            return axios.put(`${API_URL}/board/cards/${action.card.id}`, action.card).then(() => { });
        case 'DELETE_CARD':
            return axios.delete(`${API_URL}/board/cards/${action.cardId}`).then(() => { });
        case 'MOVE_CARD':
            return axios.put(`${API_URL}/board/cards/${action.cardId}/move`, { columnId: action.toColId, sortOrder: action.toIndex, siblingIds: action.siblingIds }).then(() => { });
        case 'ADD_COLUMN':
            return axios.post(`${API_URL}/board/columns`, action.column).then(() => { });
        case 'UPDATE_COLUMN':
            return axios.put(`${API_URL}/board/columns/${action.column.id}`, action.column).then(() => { });
        case 'DELETE_COLUMN':
            return axios.delete(`${API_URL}/board/columns/${action.columnId}`).then(() => { });
        case 'ADD_TAG':
            return axios.post(`${API_URL}/board/tags`, action.tag).then(() => { });
        case 'UPDATE_TAG':
            return axios.put(`${API_URL}/board/tags/${action.tag.id}`, action.tag).then(() => { });
        case 'DELETE_TAG':
            return axios.delete(`${API_URL}/board/tags/${action.tagId}`).then(() => { });
        default:
            return Promise.resolve();
    }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, rawDispatch] = useReducer(reducer, initialState);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const isAuthenticatedRef = useRef(false);
    // Cooldown: pause polling for 15s after any local action
    const lastLocalActionRef = useRef(0);
    const pendingRef = useRef<PendingState>({
        cards: new Map(),
        columns: new Map(),
        tags: new Map(),
    });
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        const cached = loadBoardCache();
        if (cached) {
            rawDispatch({ type: 'SET_BOARD', tags: cached.tags, columns: cached.columns, cards: cached.cards });
        }
    }, []);

    useEffect(() => {
        saveBoardCache(state.tags, state.columns, state.cards);
    }, [state.tags, state.columns, state.cards]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const notify = useCallback((message: string, type: ToastType = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3600);
    }, []);

    // Wrapped dispatch: update local state AND sync to API
    const dispatch = useCallback((action: Action) => {
        const pending = pendingRef.current;
        const snapshot = stateRef.current;

        if (action.type === 'DELETE_CARD') {
            const affectedColumnIds = snapshot.columns.filter(c => c.cardIds.includes(action.cardId)).map(c => c.id);
            action.affectedColumnIds = affectedColumnIds;
            pending.cards.set(action.cardId, 'delete');
            affectedColumnIds.forEach(id => pending.columns.set(id, 'upsert'));
        }

        if (action.type === 'DELETE_COLUMN') {
            const col = snapshot.columns.find(c => c.id === action.columnId);
            const affectedCardIds = col?.cardIds ?? [];
            action.affectedCardIds = affectedCardIds;
            pending.columns.set(action.columnId, 'delete');
            affectedCardIds.forEach(id => pending.cards.set(id, 'delete'));
        }

        if (action.type === 'DELETE_TAG') {
            const affectedCardIds = snapshot.cards.filter(c => c.tagIds.includes(action.tagId)).map(c => c.id);
            action.affectedCardIds = affectedCardIds;
            pending.tags.set(action.tagId, 'delete');
            affectedCardIds.forEach(id => pending.cards.set(id, 'upsert'));
        }

        if (action.type === 'ADD_CARD') {
            pending.cards.set(action.card.id, 'upsert');
            pending.columns.set(action.card.columnId, 'upsert');
        }

        if (action.type === 'UPDATE_CARD') {
            pending.cards.set(action.card.id, 'upsert');
        }

        if (action.type === 'MOVE_CARD') {
            pending.cards.set(action.cardId, 'upsert');
            pending.columns.set(action.fromColId, 'upsert');
            pending.columns.set(action.toColId, 'upsert');
        }

        if (action.type === 'ADD_COLUMN' || action.type === 'UPDATE_COLUMN') {
            pending.columns.set(action.column.id, 'upsert');
        }

        if (action.type === 'ADD_TAG' || action.type === 'UPDATE_TAG') {
            pending.tags.set(action.tag.id, 'upsert');
        }

        rawDispatch(action);
        if (action.type !== 'SET_BOARD') {
            // Pause polling while we sync
            lastLocalActionRef.current = Date.now();
            syncToApi(action)
                .then(() => {
                    if (action.type === 'ADD_CARD') notify('Karte erfolgreich erstellt.', 'success');

                    if (action.type === 'ADD_CARD' || action.type === 'UPDATE_CARD' || action.type === 'MOVE_CARD') {
                        pending.cards.delete(action.type === 'MOVE_CARD' ? action.cardId : action.card.id);
                    }
                    if (action.type === 'DELETE_CARD') {
                        pending.cards.delete(action.cardId);
                        action.affectedColumnIds?.forEach(id => pending.columns.delete(id));
                    }
                    if (action.type === 'ADD_COLUMN' || action.type === 'UPDATE_COLUMN') {
                        pending.columns.delete(action.column.id);
                    }
                    if (action.type === 'DELETE_COLUMN') {
                        pending.columns.delete(action.columnId);
                        action.affectedCardIds?.forEach(id => pending.cards.delete(id));
                    }
                    if (action.type === 'MOVE_CARD') {
                        pending.columns.delete(action.fromColId);
                        pending.columns.delete(action.toColId);
                    }
                    if (action.type === 'ADD_CARD') {
                        pending.columns.delete(action.card.columnId);
                    }
                    if (action.type === 'ADD_TAG' || action.type === 'UPDATE_TAG') {
                        pending.tags.delete(action.tag.id);
                    }
                    if (action.type === 'DELETE_TAG') {
                        pending.tags.delete(action.tagId);
                        action.affectedCardIds?.forEach(id => pending.cards.delete(id));
                    }
                })
                .catch(err => {
                    notify('Sync fehlgeschlagen. Bitte erneut versuchen.', 'error');
                    console.error(`❌ Sync ${action.type} FAILED:`, err?.response?.status, err?.message);
                });
        }
    }, [notify]);

    // Load board data from API
    const fetchBoard = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/board`);
            const snapshot = stateRef.current;
            const pending = pendingRef.current;
            const merged = {
                tags: mergeEntities(snapshot.tags, res.data.tags || [], pending.tags),
                columns: mergeEntities(snapshot.columns, res.data.columns || [], pending.columns),
                cards: mergeEntities(snapshot.cards, res.data.cards || [], pending.cards),
            };
            rawDispatch({ type: 'SET_BOARD', tags: merged.tags, columns: merged.columns, cards: merged.cards });
        } catch (err) {
            console.error('Could not load board from API:', err);
        }
    }, []);

    // Authenticate user on load
    useEffect(() => {
        checkAuth();
    }, []);

    // Live sync: poll every 5 seconds, but SKIP if user made a change in the last 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (isAuthenticatedRef.current) {
                const msSinceLastAction = Date.now() - lastLocalActionRef.current;
                if (msSinceLastAction > 15000) {
                    fetchBoard();
                }
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchBoard]);

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
                isAuthenticatedRef.current = true;
                fetchUsers();
                fetchBoard();
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
            isAuthenticatedRef.current = false;
            clearToken();
            clearBoardCache();
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
        <AppContext.Provider value={{ state: fullState, dispatch, toasts, notify, dismissToast, canEdit, canView, canDeleteColumn, canDeleteCard, isAdmin, isLoading, logout, users, fetchUsers }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used inside AppProvider');
    return ctx;
}
