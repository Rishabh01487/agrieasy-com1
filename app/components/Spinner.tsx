'use client'

/**
 * Instagram-style loading spinner.
 *
 * Usage:
 *   <Spinner />              // default size (24px)
 *   <Spinner size={40} />    // custom size
 *   <Spinner color="#fff" /> // custom color
 */
export function Spinner({ size = 24, color = '#313851', thickness = 3 }: { size?: number; color?: string; thickness?: number }) {
    return (
        <div
            role="status"
            aria-label="Loading"
            style={{
                width: size,
                height: size,
                border: `${thickness}px solid ${color}33`,
                borderTopColor: color,
                borderRadius: '50%',
                animation: 'agrieasy-spin 0.8s linear infinite',
                display: 'inline-block',
            }}
        />
    )
}

/**
 * Full-page loading screen with centered spinner.
 * Replaces "Loading..." text with Instagram-style spinner circle.
 */
export function LoadingScreen({ color, background, label }: { color?: string; background?: string; label?: string }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: background || '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        }}>
            <Spinner size={40} color={color || '#313851'} />
            {label && (
                <p style={{ color: color || '#313851', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, margin: 0 }}>
                    {label}
                </p>
            )}
            <style>{`@keyframes agrieasy-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

/**
 * Inline loading indicator (smaller, for sections within a page).
 */
export function InlineLoader({ color, label }: { color?: string; label?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 0' }}>
            <Spinner size={18} color={color || '#313851'} />
            {label && (
                <span style={{ color: color || '#313851', fontSize: '0.82rem', fontWeight: 600, opacity: 0.7 }}>
                    {label}
                </span>
            )}
            <style>{`@keyframes agrieasy-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
