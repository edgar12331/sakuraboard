import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Board } from './components/Board';
import { AdminPanel } from './components/AdminPanel';
import { Petals } from './components/Petals';
import { LoginPage, PendingPage, ErrorPage } from './components/AuthPages';
import { ToastStack } from './components/ToastStack';
import { SettingsMenu, useBackground } from './components/SettingsMenu';
import { TunerExam } from './components/TunerExam';
import './index.css';
import './App.css';

function AppInner() {
  const { state, logout, toasts, dismissToast } = useApp();
  const { bg, changeBg } = useBackground(state.currentUser?.id);
  const [currentView, setCurrentView] = useState<'board' | 'admin'>('board');
  const searchParams = new URLSearchParams(window.location.search);
  const authError = searchParams.get('error');

  const appTypeParam = searchParams.get('app');
  const [appType] = useState<'board' | 'tuner'>(() => {
    if (appTypeParam === 'tuner') {
      localStorage.setItem('sakura_app_type', 'tuner');
      return 'tuner';
    }
    return localStorage.getItem('sakura_app_type') === 'tuner' ? 'tuner' : 'board';
  });

  if (authError === 'oauth_failed') {
    return (
      <div className="app">
        <Petals />
        <ErrorPage error="Der Login mit Discord ist fehlgeschlagen. Bitte stelle sicher, dass in den Discord Developer Portal Einstellungen unter 'OAuth2' -> 'Redirects' die richtige URL (http://localhost:3001/api/auth/discord/callback) hinterlegt ist, und die Client Secret im Bot-Code eingetragen wurde." />
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className="login-screen">
        <div className="login-box bg-transparent border-0 shadow-none">
          <div className="sakura-spin text-sakura-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!state.currentUser) {
    localStorage.removeItem('sakura_app_type');
    return (
      <div className="app">
        <Petals />
        <LoginPage />
      </div>
    );
  }

  if (state.currentUser.status === 'pending' && appType !== 'tuner') {
    return (
      <div className="app">
        <Petals />
        <PendingPage logout={logout} />
      </div>
    );
  }

  if (appType === 'tuner') {
    return (
      <div className="app">
        {bg && (
          <div className="app-bg-layer" style={{ backgroundImage: `url(${bg})` }} />
        )}
        <Petals />
        <TunerExam logout={logout} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="app">
      {bg && (
        <div className="app-bg-layer" style={{ backgroundImage: `url(${bg})` }} />
      )}
      <Petals />
      <Navbar currentView={currentView} onViewChange={setCurrentView}>
        <SettingsMenu bg={bg} onChangeBg={changeBg} />
      </Navbar>
      <main className="app-main">
        {currentView === 'board' ? <Board /> : <AdminPanel />}
      </main>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
