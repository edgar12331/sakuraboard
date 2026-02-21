import { LayoutDashboard, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
    currentView: 'board' | 'admin';
    onViewChange: (v: 'board' | 'admin') => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
    const { state, isAdmin, logout } = useApp();


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
                    <button className="user-menu-trigger">
                        <div className="avatar">{state.currentUser?.avatar}</div>
                        <div className="user-menu-info">
                            <span className="user-menu-name">{state.currentUser?.name}</span>
                            <span className={`badge-role badge-${state.currentUser?.role}`}>
                                {state.currentUser?.role}
                            </span>
                        </div>
                    </button>
                    <button className="btn btn-secondary" style={{ marginLeft: '8px' }} onClick={logout}>
                        Abmelden
                    </button>
                </div>
            </div>
        </nav>
    );
}
