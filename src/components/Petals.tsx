import { useMemo } from 'react';

interface PetalData {
    left: string;
    delay: string;
    duration: string;
    size: string;
    drift: string;
}

export function Petals() {
    // Memoize random values so they never change between renders
    const petals = useMemo<PetalData[]>(() => {
        return Array.from({ length: 12 }, () => ({
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 20}s`,
            duration: `${14 + Math.random() * 12}s`,
            size: `${5 + Math.random() * 7}px`,
            drift: `${-30 + Math.random() * 60}px`,
        }));
    }, []);

    return (
        <div className="petals-container" aria-hidden>
            {petals.map((p, i) => (
                <div
                    key={i}
                    className="petal"
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        width: p.size,
                        height: p.size,
                        '--petal-drift': p.drift,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
}
