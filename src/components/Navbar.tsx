import { useState } from 'react';
import { LayoutDashboard, Settings, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { } from '../types';

interface NavbarProps {
    currentView: 'board' | 'admin';
    onViewChange: (v: 'board' | 'admin') => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
    const { state, dispatch, isAdmin } = useApp();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const switchUser = (userId: string) => {
        const u = state.users.find(u => u.id === userId);
        if (u) dispatch({ type: 'SET_USER', user: u });
        setUserMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <img
                    src="https://i.postimg.cc/NjK8ZC9m/Chokokutai-84.png"
                    alt="SakuraBoard Logo"
                    className="navbar-logo"
                />
                <span className="navbar-title">
                    Sakura<span className="navbar-title-accent">Board</span>
                </span>
            </div>

            <div className="navbar-nav">
                <button
                    className={`nav-link ${currentView === 'board' ? 'active' : ''}`}
                    onClick={() => onViewChange('board')}
                >
                    <LayoutDashboard size={16} />
                    Board
                </button>
                {isAdmin() && (
                    <button
                        className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
                        onClick={() => onViewChange('admin')}
                    >
                        <Settings size={16} />
                        Admin
                    </button>
                )}
            </div>

            <div className="navbar-right">
                <div className="user-menu-wrapper">
                    <button className="user-menu-trigger" onClick={() => setUserMenuOpen(o => !o)}>
                        <div className="avatar">{state.currentUser?.avatar}</div>
                        <div className="user-menu-info">
                            <span className="user-menu-name">{state.currentUser?.name}</span>
                            <span className={`badge-role badge-${state.currentUser?.role}`}>
                                {state.currentUser?.role}
                            </span>
                        </div>
                        <ChevronDown size={14} className={`chevron ${userMenuOpen ? 'open' : ''}`} />
                    </button>

                    {userMenuOpen && (
                        <div className="dropdown-menu">
                            <div className="dropdown-header">Switch Account</div>
                            {state.users.map(u => (
                                <button
                                    key={u.id}
                                    className={`dropdown-item ${state.currentUser?.id === u.id ? 'active' : ''}`}
                                    onClick={() => switchUser(u.id)}
                                >
                                    <div className="avatar avatar-sm">{u.avatar}</div>
                                    <div>
                                        <div className="text-sm">{u.name}</div>
                                        <span className={`badge-role badge-${u.role}`}>{u.role}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
