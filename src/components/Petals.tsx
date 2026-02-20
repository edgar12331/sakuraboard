export function Petals() {
    return (
        <div className="petals-container" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="petal"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 15}s`,
                        animationDuration: `${12 + Math.random() * 10}s`,
                        width: `${6 + Math.random() * 8}px`,
                        height: `${6 + Math.random() * 8}px`,
                    }}
                />
            ))}
        </div>
    );
}
