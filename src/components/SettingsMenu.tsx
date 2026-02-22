import { useState, useRef } from 'react';
import { Settings, X, Image, Sparkles } from 'lucide-react';

const BG_STORAGE_KEY = 'sakura_bg_setting';

interface BgOption {
    id: string;
    label: string;
    preview: string;
    value: string;
}

const BG_PRESETS: BgOption[] = [
    { id: 'none', label: 'Keine (Standard)', preview: '', value: '' },
    { id: 'bg1', label: 'Sakura Night', preview: '/backgrounds/bg1.webp', value: '/backgrounds/bg1.webp' },
];

function getSavedBg(): string {
    try {
        return localStorage.getItem(BG_STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

function saveBg(value: string) {
    try {
        localStorage.setItem(BG_STORAGE_KEY, value);
    } catch { /* ignore */ }
}

export function useBackground() {
    const [bg, setBg] = useState(getSavedBg);

    const changeBg = (value: string) => {
        setBg(value);
        saveBg(value);
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

            {open && (
                <div className="modal-backdrop" onClick={() => setOpen(false)}>
                    <div
                        className="modal settings-modal"
                        style={{ maxWidth: '480px', padding: '24px' }}
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
                                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Einstellungen</h2>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Hintergrund
                        </h3>

                        <div className="bg-presets">
                            {BG_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    className={`bg-preset-btn ${bg === preset.value ? 'active' : ''}`}
                                    onClick={() => onChangeBg(preset.value)}
                                >
                                    {preset.preview ? (
                                        <img src={preset.preview} alt={preset.label} className="bg-preset-thumb" />
                                    ) : (
                                        <div className="bg-preset-thumb bg-preset-none">
                                            <X size={16} />
                                        </div>
                                    )}
                                    <span className="bg-preset-label">{preset.label}</span>
                                </button>
                            ))}

                            <button
                                className={`bg-preset-btn ${bg && !BG_PRESETS.find(p => p.value === bg) ? 'active' : ''}`}
                                onClick={() => fileRef.current?.click()}
                            >
                                <div className="bg-preset-thumb bg-preset-upload">
                                    <Image size={16} />
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
                    </div>
                </div>
            )}
        </>
    );
}
