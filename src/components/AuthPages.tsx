import { useState } from 'react';
import { AlertCircle, Cherry, LogIn, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoginPage() {
    const [stayLoggedIn, setStayLoggedIn] = useState(true);

    const handleDiscordLogin = () => {
        const baseUrl = 'https://sakura-bot-fkih.onrender.com/api/auth/discord';
        window.location.href = `${baseUrl}?stayLoggedIn=${stayLoggedIn}`;
    };

    return (
        <div className="login-screen">
            {/* Sakura Petals Backdrop */}
            <div className="login-backdrop-elements">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="petal"
                        initial={{
                            top: -100,
                            left: `${Math.random() * 100}%`,
                            rotate: Math.random() * 360,
                            opacity: 0,
                        }}
                        animate={{
                            top: '120%',
                            left: `${(Math.random() * 100) + (Math.random() * 20 - 10)}%`,
                            rotate: 1000,
                            opacity: [0, 0.6, 0.6, 0],
                        }}
                        transition={{
                            duration: 10 + Math.random() * 20,
                            repeat: Infinity,
                            delay: Math.random() * 20,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="login-box"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <motion.div
                    className="login-logo-container"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <img src="https://i.postimg.cc/NjK8ZC9m/Chokokutai-84.png" alt="SakuraBoard" className="login-logo" />
                </motion.div>

                <motion.h1
                    className="login-title"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Sakura<span className="navbar-title-accent">Board</span>
                </motion.h1>

                <motion.p
                    className="login-subtitle"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    Willkommen bei deinem neuen, modernen Kanban-Board.<br />
                    Logge dich sicher über Discord ein, um direkt in deine Projekte zu starten.
                </motion.p>

                <motion.div
                    className="stay-logged-in"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={stayLoggedIn}
                            onChange={(e) => setStayLoggedIn(e.target.checked)}
                        />
                        <span className="checkmark-box">
                            {stayLoggedIn && <Check size={12} />}
                        </span>
                        Angemeldet bleiben
                    </label>
                </motion.div>

                <motion.button
                    className="btn btn-discord btn-lg"
                    onClick={handleDiscordLogin}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <LogIn size={18} /> Login with Discord
                </motion.button>
            </motion.div>
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
                <h1 className="login-title" style={{ fontSize: '24px' }}>Zugriff ausstehend</h1>
                <p className="login-subtitle" style={{ marginBottom: '8px' }}>
                    Deine <strong>Zugriffsanfrage wurde registriert</strong> und wartet auf Freischaltung.
                </p>
                <p className="login-subtitle" style={{ marginBottom: '24px', fontSize: '13px', opacity: 0.7 }}>
                    Du benötigst die erforderlichen Discord-Rollen oder eine manuelle Freigabe durch einen Administrator.
                    Sobald du freigeschaltet wurdest, kannst du dich einfach neu anmelden.
                </p>

                <div style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: 'rgba(112, 161, 255, 0.1)', 
                    border: '1px solid rgba(112, 161, 255, 0.3)',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                }}>
                    <strong style={{ color: 'var(--text)' }}>Hinweis:</strong><br />
                    Ein Administrator kann deine Anfrage im Admin Panel unter "Anfragen" sehen und dich freischalten.
                </div>

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
