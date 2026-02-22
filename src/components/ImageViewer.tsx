import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
    imageUrl: string;
    onClose: () => void;
}

export function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.2, 3));
            if (e.key === '-') setZoom(z => Math.max(z - 0.2, 0.5));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'image.png';
        link.click();
    };

    return createPortal(
        <div 
            className="image-viewer-backdrop" 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000000,
                background: 'rgba(0, 0, 0, 0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'fadeIn 0.2s ease'
            }}
        >
            {/* Controls */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                display: 'flex',
                gap: '8px',
                zIndex: 1000001
            }}>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.2, 0.5)); }}
                    title="Verkleinern (-)"
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                >
                    <ZoomOut size={18} />
                </button>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.2, 3)); }}
                    title="Vergrößern (+)"
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                >
                    <ZoomIn size={18} />
                </button>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                    title="Herunterladen"
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                >
                    <Download size={18} />
                </button>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    title="Schließen (ESC)"
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Zoom indicator */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                zIndex: 1000001
            }}>
                {Math.round(zoom * 100)}%
            </div>

            {/* Image */}
            <img
                src={imageUrl}
                alt="Vollbild-Ansicht"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    transform: `scale(${zoom})`,
                    transition: 'transform 0.2s ease',
                    cursor: zoom > 1 ? 'zoom-out' : 'zoom-in',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    setZoom(zoom === 1 ? 2 : 1);
                }}
            />
        </div>,
        document.body
    );
}
