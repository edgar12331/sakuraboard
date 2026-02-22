import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const iconByType = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-stack" aria-live="polite">
            {toasts.map(toast => {
                const Icon = iconByType[toast.type];
                return (
                    <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
                        <span className="toast-icon"><Icon size={16} /></span>
                        <span className="toast-message">{toast.message}</span>
                        <button className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
