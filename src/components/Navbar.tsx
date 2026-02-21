import { LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
    currentView: 'board' | 'admin';
    onViewChange: (v: 'board' | 'admin') => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
    const { state, isAdmin, logout } = useApp();
    const user = state.currentUser;

    // Build Discord avatar URL
    const avatarUrl = user?.id && user?.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : null;

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
                    <div className="user-menu-trigger">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={user?.name}
                                className="avatar"
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                {user?.name?.substring(0, 2).toUpperCase() ?? '??'}
                            </div>
                        )}
                        <div className="user-menu-info">
                            <span className="user-menu-name">{user?.name}</span>
                            <span className={`badge-role badge-${user?.role}`}>
                                {user?.role}
                            </span>
                        </div>
                    </div>
                    <button className="btn btn-secondary" style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={logout}>
                        <LogOut size={14} /> Abmelden
                    </button>
                </div>
            </div>
        </nav>
    );
}
