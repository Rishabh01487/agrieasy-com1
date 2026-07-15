import type { CSSProperties } from 'react'

/**
 * Flat, line-based agricultural/supply-chain icons.
 * Inspired by the user-uploaded reference images (harvesters, warehouses,
 * trucks, etc.) — flat illustration style with dark navy outlines and
 * solid fills in the AgriEasy palette.
 *
 * Palette:
 *   Navy outline:  #123C69
 *   Magenta:       #AC3B61
 *   Gold:          #D4A574
 *   Peach:         #EDC7B7
 *   White:         #FFFFFF
 */

interface IconProps {
    size?: number
    color?: string
    style?: CSSProperties
}

const baseSvgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
}

// ── Farmer/Vyapari: wheat sheaf ──
export function FarmerIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Central stalk */}
            <line x1="24" y1="10" x2="24" y2="40" stroke={color} strokeWidth="2" />
            {/* Wheat grains — left side */}
            <path d="M24 14 Q18 14 16 18 Q18 19 20 18 Q22 17 24 14Z" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            <path d="M24 20 Q18 20 16 24 Q18 25 20 24 Q22 23 24 20Z" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            <path d="M24 26 Q18 26 16 30 Q18 31 20 30 Q22 29 24 26Z" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            {/* Wheat grains — right side */}
            <path d="M24 14 Q30 14 32 18 Q30 19 28 18 Q26 17 24 14Z" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            <path d="M24 20 Q30 20 32 24 Q30 25 28 24 Q26 23 24 20Z" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            <path d="M24 26 Q30 26 32 30 Q30 31 28 30 Q26 29 24 26Z" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            {/* Top grain */}
            <ellipse cx="24" cy="11" rx="3" ry="4" fill="#D4A574" stroke={color} strokeWidth="1.5" />
            {/* Ground line */}
            <line x1="14" y1="40" x2="34" y2="40" stroke={color} strokeWidth="2" />
        </svg>
    )
}

// ── Buyer: warehouse with boxes ──
export function BuyerIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Roof */}
            <path d="M6 18 L24 8 L42 18" stroke={color} strokeWidth="2" fill="#EDC7B7" />
            {/* Building body */}
            <rect x="8" y="18" width="32" height="24" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Garage door frame */}
            <rect x="14" y="26" width="20" height="16" stroke={color} strokeWidth="2" fill="#FBF4EF" />
            {/* Stacked boxes inside */}
            <rect x="18" y="32" width="6" height="5" stroke={color} strokeWidth="1.5" fill="#D4A574" />
            <rect x="26" y="32" width="6" height="5" stroke={color} strokeWidth="1.5" fill="#D4A574" />
            <rect x="22" y="27" width="6" height="5" stroke={color} strokeWidth="1.5" fill="#AC3B61" />
            {/* Tower */}
            <rect x="20" y="4" width="8" height="6" stroke={color} strokeWidth="2" fill="#fff" />
            <circle cx="24" cy="3" r="1.5" fill={color} />
            {/* Ground */}
            <line x1="4" y1="42" x2="44" y2="42" stroke={color} strokeWidth="2" />
        </svg>
    )
}

// ── Transporter: delivery truck ──
export function TransporterIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Cargo box */}
            <rect x="4" y="14" width="24" height="18" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Box detail on cargo */}
            <rect x="10" y="19" width="6" height="5" stroke={color} strokeWidth="1.5" fill="#D4A574" />
            <rect x="18" y="19" width="6" height="5" stroke={color} strokeWidth="1.5" fill="#D4A574" />
            {/* Cab */}
            <path d="M28 14 L38 14 L42 20 L42 32 L28 32 Z" stroke={color} strokeWidth="2" fill="#EDC7B7" />
            {/* Window */}
            <path d="M31 17 L37 17 L40 21 L31 21 Z" stroke={color} strokeWidth="1.5" fill="#FBF4EF" />
            {/* Wheels */}
            <circle cx="14" cy="34" r="4" stroke={color} strokeWidth="2" fill="#123C69" />
            <circle cx="14" cy="34" r="1.5" fill="#fff" />
            <circle cx="34" cy="34" r="4" stroke={color} strokeWidth="2" fill="#123C69" />
            <circle cx="34" cy="34" r="1.5" fill="#fff" />
            {/* Ground */}
            <line x1="2" y1="40" x2="46" y2="40" stroke={color} strokeWidth="2" />
        </svg>
    )
}

// ── Bill Calculator: calculator with receipt ──
export function CalculatorIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Receipt body */}
            <path d="M14 6 L34 6 L34 42 L30 39 L26 42 L22 39 L18 42 L14 39 Z" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Receipt lines */}
            <line x1="19" y1="14" x2="29" y2="14" stroke={color} strokeWidth="1.5" />
            <line x1="19" y1="19" x2="29" y2="19" stroke={color} strokeWidth="1.5" />
            <line x1="19" y1="24" x2="25" y2="24" stroke={color} strokeWidth="1.5" />
            {/* Total box */}
            <rect x="18" y="29" width="12" height="6" stroke={color} strokeWidth="1.5" fill="#D4A574" />
            <text x="24" y="34" textAnchor="middle" fontSize="5" fill={color} fontWeight="bold">₹</text>
        </svg>
    )
}

// ── AgriPay: wallet with card ──
export function WalletIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Wallet body */}
            <rect x="6" y="12" width="36" height="26" rx="3" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Card sticking out */}
            <rect x="10" y="8" width="20" height="12" rx="2" stroke={color} strokeWidth="2" fill="#AC3B61" />
            <line x1="13" y1="14" x2="22" y2="14" stroke="#fff" strokeWidth="1.5" />
            {/* Wallet flap */}
            <path d="M6 18 L42 18" stroke={color} strokeWidth="2" />
            {/* Coin slot / button */}
            <circle cx="34" cy="27" r="4" stroke={color} strokeWidth="2" fill="#D4A574" />
            <circle cx="34" cy="27" r="1.5" fill={color} />
            {/* ₹ symbol */}
            <text x="16" y="32" fontSize="9" fill={color} fontWeight="bold">₹</text>
        </svg>
    )
}

// ── AgriSocial: chat/feed bubble ──
export function SocialIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Speech bubble */}
            <path d="M8 10 L40 10 Q42 10 42 12 L42 30 Q42 32 40 32 L20 32 L12 38 L12 32 L8 32 Q6 32 6 30 L6 12 Q6 10 8 10 Z" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Heart inside */}
            <path d="M24 16 Q22 14 20 16 Q18 18 20 20 L24 24 L28 20 Q30 18 28 16 Q26 14 24 16 Z" fill="#AC3B61" stroke={color} strokeWidth="1.5" />
            {/* Dots */}
            <circle cx="14" cy="20" r="1.5" fill={color} />
            <circle cx="34" cy="20" r="1.5" fill={color} />
        </svg>
    )
}

// ── Ledger: book with pages ──
export function LedgerIcon({ size = 32, color = '#123C69', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Book cover */}
            <rect x="10" y="6" width="28" height="36" rx="2" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Spine */}
            <line x1="14" y1="6" x2="14" y2="42" stroke={color} strokeWidth="2" />
            {/* Page lines */}
            <line x1="18" y1="14" x2="34" y2="14" stroke={color} strokeWidth="1.5" />
            <line x1="18" y1="20" x2="34" y2="20" stroke={color} strokeWidth="1.5" />
            <line x1="18" y1="26" x2="30" y2="26" stroke={color} strokeWidth="1.5" />
            <line x1="18" y1="32" x2="34" y2="32" stroke={color} strokeWidth="1.5" />
            {/* Bookmark */}
            <path d="M30 6 L30 16 L33 13 L36 16 L36 6 Z" fill="#AC3B61" stroke={color} strokeWidth="1.5" />
            {/* ₹ on cover spine */}
            <circle cx="12" cy="24" r="1.5" fill="#D4A574" />
        </svg>
    )
}

// ── Icon registry: maps card keys to icon components ──
export function CardIcon({ name, size = 32, color = '#123C69' }: { name: string; size?: number; color?: string }) {
    switch (name) {
        case 'Farmer/Vyapari': return <FarmerIcon size={size} color={color} />
        case 'Buyer': return <BuyerIcon size={size} color={color} />
        case 'Transporter': return <TransporterIcon size={size} color={color} />
        case 'Bill Calculator': return <CalculatorIcon size={size} color={color} />
        case 'AgriPay': return <WalletIcon size={size} color={color} />
        case 'AgriSocial': return <SocialIcon size={size} color={color} />
        case 'Ledger': return <LedgerIcon size={size} color={color} />
        default: return <FarmerIcon size={size} color={color} />
    }
}
