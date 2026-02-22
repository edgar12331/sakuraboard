import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Image, Sparkles } from 'lucide-react';

interface BgOption {
    id: string;
    label: string;
    preview: string;
    value: string;
}

const BG_PRESETS: BgOption[] = [
    { id: 'none', label: 'Keine (Standard)', preview: '', value: '' },
    { id: 'bg1', label: 'Sakura Night', preview: '/backgrounds/bg1.webp', value: '/backgrounds/bg1.webp' },
    { id: 'bg2', label: 'Sakura Bloom', preview: '/backgrounds/bg2.webp', value: '/backgrounds/bg2.webp' },
    { id: 'bg3', label: 'Sakura Dream', preview: '/backgrounds/bg3.webp', value: '/backgrounds/bg3.webp' },
];

function getBgStorageKey(userId: string | undefined): string {
    return userId ? `sakura_bg_setting_${userId}` : 'sakura_bg_setting';
}

function getSavedBg(userId: string | undefined): string {
    try {
        return localStorage.getItem(getBgStorageKey(userId)) || '';
    } catch {
        return '';
    }
}

function saveBg(value: string, userId: string | undefined) {
    try {
        localStorage.setItem(getBgStorageKey(userId), value);
    } catch { /* ignore */ }
}

export function useBackground(userId: string | undefined) {
    const [bg, setBg] = useState(() => getSavedBg(userId));

    // Reload background when userId changes
    useEffect(() => {
        const savedBg = getSavedBg(userId);
        setBg(savedBg);
    }, [userId]);

    const changeBg = (value: string) => {
        setBg(value);
        saveBg(value, userId);
    };

    return { bg, changeBg };
}

interface SettingsMenuProps {
    bg: string;
    onChangeBg: (value: string) => void;
}

export function SettingsMenu({ bg, onChangeBg }: SettingsMenuProps) {
    const [open, setOpen] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // ESC key to close
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open]);

    const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const url = ev.target?.result as string;
            onChangeBg(url);
        };
        reader.readAsDataURL(file);
    };

    return (
        <>
            <button
                className="btn btn-ghost btn-icon"
                onClick={() => setOpen(!open)}
                title="Einstellungen"
            >
                <Settings size={18} />
            </button>

            {open && createPortal(
                <div className="modal-backdrop" onClick={() => setOpen(false)} style={{ padding: '20px', overflow: 'auto' }}>
                    <div
                        className="modal settings-modal"
                        style={{ maxWidth: '520px', padding: '24px', margin: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ padding: 0, marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'rgba(255, 107, 157, 0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Sparkles size={18} color="var(--sakura-400)" />
                                </div>
                                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Persönliche Einstellungen</h2>
                            </div>
                            <button 
                                className="btn btn-ghost btn-icon" 
                                onClick={() => setOpen(false)}
                                title="Schließen (ESC)"
                                style={{ 
                                    width: '36px', 
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Hintergrund wählen
                        </h3>

                        <div className="bg-presets" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {BG_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    className={`bg-preset-btn ${bg === preset.value ? 'active' : ''}`}
                                    onClick={() => onChangeBg(preset.value)}
                                    style={{ width: '100%' }}
                                >
                                    {preset.preview ? (
                                        <div className="bg-preset-thumb" style={{
                                            backgroundImage: `url(${preset.preview})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            width: '100%',
                                            height: '80px',
                                            borderRadius: '8px'
                                        }} />
                                    ) : (
                                        <div className="bg-preset-thumb bg-preset-none" style={{ height: '80px' }}>
                                            <X size={20} />
                                        </div>
                                    )}
                                    <span className="bg-preset-label">{preset.label}</span>
                                </button>
                            ))}

                            <button
                                className={`bg-preset-btn ${bg && !BG_PRESETS.find(p => p.value === bg) ? 'active' : ''}`}
                                onClick={() => fileRef.current?.click()}
                                style={{ width: '100%' }}
                            >
                                <div className="bg-preset-thumb bg-preset-upload" style={{ height: '80px' }}>
                                    <Image size={20} />
                                </div>
                                <span className="bg-preset-label">Eigenes Bild</span>
                            </button>
                        </div>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleCustomUpload}
                        />

                        {bg && (
                            <div style={{ marginTop: '16px' }}>
                                <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>Aktuelle Vorschau:</p>
                                <div style={{
                                    width: '100%', height: '80px', borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden', border: '1px solid var(--border)',
                                }}>
                                    <img
                                        src={bg}
                                        alt="Background Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ 
                            marginTop: '24px', 
                            paddingTop: '20px', 
                            borderTop: '1px solid var(--border)', 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '8px',
                            alignItems: 'center'
                        }}>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => setOpen(false)} 
                                style={{ 
                                    gap: '6px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: 600
                                }}
                            >
                                ✓ Zurück zum Board
                            </button>
                            <p style={{ 
                                fontSize: '11px', 
                                color: 'var(--text-muted)',
                                margin: 0
                            }}>
                                ESC drücken oder außerhalb klicken zum Schließen
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
