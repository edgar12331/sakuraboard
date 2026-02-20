import { useState } from 'react';
import { Cherry, LogIn, AlertCircle } from 'lucide-react';

export function LoginPage() {
    const handleDiscordLogin = () => {
        window.location.href = 'http://localhost:3001/api/auth/discord';
    };

    return (
        <div className="login-screen">
            <div className="login-box">
                <div className="login-logo-container">
                    <img src="https://i.postimg.cc/NjK8ZC9m/Chokokutai-84.png" alt="SakuraBoard" className="login-logo" />
                </div>
                <h1 className="login-title">Sakura<span className="navbar-title-accent">Board</span></h1>
                <p className="login-subtitle">
                    Willkommen bei deinem neuen, modernen Kanban-Board.<br />
                    Logge dich sicher über Discord ein, um direkt in deine Projekte zu starten.
                </p>

                <button className="btn btn-discord btn-lg" onClick={handleDiscordLogin}>
                    <LogIn size={18} /> Login with Discord
                </button>
            </div>
        </div>
    );
}

export function PendingPage({ logout }: { logout: () => void }) {
    return (
        <div className="login-screen">
            <div className="login-box">
                <div className="login-logo-container" style={{ marginBottom: '16px' }}>
                    <Cherry size={56} className="sakura-spin" color="var(--sakura-400)" />
                </div>
                <h1 className="login-title" style={{ fontSize: '24px' }}>Wartet auf Freischaltung</h1>
                <p className="login-subtitle" style={{ marginBottom: '24px' }}>
                    Dein Account wurde registriert, aber du hast noch keinen Zugriff.
                    Bitte warte, bis ein Administrator dich im Board freischaltet.
                </p>

                <button className="btn btn-secondary mt-4" onClick={logout}>
                    Abmelden
                </button>
            </div>
        </div>
    );
}

export function ErrorPage({ error }: { error: string }) {
    const handleRetry = () => {
        // Clear the URL error param and go back to login
        window.location.href = '/';
    };

    return (
        <div className="login-screen">
            <div className="login-box" style={{ border: '1px solid rgba(255, 71, 87, 0.3)' }}>
                <div className="login-logo-container" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={56} color="#ff4757" />
                </div>
                <h1 className="login-title" style={{ fontSize: '24px', background: 'linear-gradient(135deg, #ffffff, #ff4757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Login Fehlgeschlagen
                </h1>
                <p className="login-subtitle" style={{ marginBottom: '24px' }}>
                    Beim Verbinden mit Discord ist ein Fehler aufgetreten:<br />
                    <strong>{error}</strong>
                    <br /><br />
                    Möglicherweise stimmen die OAuth2-Einstellungen im Bot nicht.
                </p>

                <button className="btn btn-secondary mt-4 w-full justify-center" onClick={handleRetry}>
                    Zurück zum Login
                </button>
            </div>
        </div>
    );
}
