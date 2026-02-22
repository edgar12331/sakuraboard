import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title = 'Bestätigung',
    message,
    confirmText = 'Ja',
    cancelText = 'Nein',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const colorMap = {
        danger: { bg: 'rgba(255, 71, 87, 0.15)', border: 'rgba(255, 71, 87, 0.4)', text: '#ff4757' },
        warning: { bg: 'rgba(255, 165, 2, 0.15)', border: 'rgba(255, 165, 2, 0.4)', text: '#ffa502' },
        default: { bg: 'rgba(114, 137, 218, 0.15)', border: 'rgba(114, 137, 218, 0.4)', text: '#7289da' },
    };
    const colors = colorMap[variant];

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div
                className="modal confirm-dialog"
                style={{ maxWidth: '420px', padding: '28px' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <AlertTriangle size={20} color={colors.text} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h2>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                        style={variant === 'danger' ? { background: 'rgba(255, 71, 87, 0.8)', color: '#fff' } : undefined}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
