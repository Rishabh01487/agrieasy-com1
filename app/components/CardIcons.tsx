import type { CSSProperties } from 'react'

/**
 * Flat, line-based agricultural/supply-chain icons.
 * Inspired by the user-uploaded reference images (harvesters, warehouses,
 * trucks, etc.) — flat illustration style with dark navy outlines and
 * solid fills in the AgriEasy palette.
 *
 * Palette:
 *   Navy outline:  #31372B
 *   Magenta:       #31372B
 *   Gold:          #4A5240
 *   Peach:         #E8E4D6
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

// ── Farmer/Vyapari: logo image ──
export function FarmerIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-farmer.png" alt="Farmer" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── Buyer: logo image ──
export function BuyerIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-buyer.png" alt="Buyer" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── Transporter: logo image ──
export function TransporterIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-transporter.png" alt="Transporter" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── Bill Calculator: logo image ──
export function CalculatorIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-billcalc.png" alt="Bill Calculator" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── AgriPay: logo image ──
export function WalletIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-agripay.png" alt="AgriPay" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── AgriSocial: new logo image ──
export function SocialIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/agrisocial-logo.png" alt="AgriSocial" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── Ledger: logo image ──
export function LedgerIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-ledger.png" alt="Ledger" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
    )
}

// ── Home: house with roof ──
export function HomeIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Roof */}
            <path d="M6 22 L24 8 L42 22" stroke={color} strokeWidth="2.5" fill="#31372B" />
            {/* House body */}
            <rect x="10" y="22" width="28" height="20" stroke={color} strokeWidth="2.5" fill="#fff" />
            {/* Door */}
            <rect x="20" y="30" width="8" height="12" stroke={color} strokeWidth="2" fill={color} />
            {/* Door knob */}
            <circle cx="26" cy="36" r="1" fill="#4A5240" />
            {/* Window */}
            <rect x="13" y="26" width="5" height="5" stroke={color} strokeWidth="1.5" fill="#4A5240" />
            <rect x="30" y="26" width="5" height="5" stroke={color} strokeWidth="1.5" fill="#4A5240" />
            {/* Chimney */}
            <rect x="30" y="10" width="4" height="8" stroke={color} strokeWidth="2" fill="#E8E4D6" />
        </svg>
    )
}

// ── Search: magnifying glass ──
export function SearchIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Lens */}
            <circle cx="20" cy="20" r="12" stroke={color} strokeWidth="2.5" fill="#FAF7EE" />
            {/* Lens reflection */}
            <path d="M16 14 Q14 16 14 19" stroke={color} strokeWidth="1.5" opacity="0.5" />
            {/* Handle */}
            <line x1="29" y1="29" x2="40" y2="40" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
            <line x1="29" y1="29" x2="40" y2="40" stroke="#4A5240" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

// ── Calendar: booking date ──
export function CalendarIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Calendar body */}
            <rect x="8" y="10" width="32" height="32" rx="3" stroke={color} strokeWidth="2.5" fill="#fff" />
            {/* Top bar */}
            <rect x="8" y="10" width="32" height="8" rx="3" stroke={color} strokeWidth="2.5" fill="#31372B" />
            {/* Rings */}
            <line x1="16" y1="6" x2="16" y2="14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="32" y1="6" x2="32" y2="14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            {/* Date grid dots */}
            <circle cx="16" cy="24" r="2" fill={color} />
            <circle cx="24" cy="24" r="2" fill={color} />
            <circle cx="32" cy="24" r="2" fill={color} />
            <circle cx="16" cy="31" r="2" fill="#4A5240" />
            <circle cx="24" cy="31" r="2.5" fill="#31372B" />
            <circle cx="32" cy="31" r="2" fill={color} />
            <circle cx="16" cy="38" r="2" fill={color} />
            <circle cx="32" cy="38" r="2" fill={color} />
        </svg>
    )
}

// ── Location: map pin ──
export function LocationIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Pin body */}
            <path d="M24 6 Q14 6 14 18 Q14 28 24 42 Q34 28 34 18 Q34 6 24 6 Z" stroke={color} strokeWidth="2.5" fill="#31372B" />
            {/* Inner circle */}
            <circle cx="24" cy="18" r="6" stroke={color} strokeWidth="2" fill="#fff" />
            {/* Center dot */}
            <circle cx="24" cy="18" r="2.5" fill={color} />
            {/* Ground shadow */}
            <ellipse cx="24" cy="43" rx="8" ry="2" fill={color} opacity="0.2" />
        </svg>
    )
}

// ── Clipboard: commodities list ──
export function ClipboardIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        <svg {...baseSvgProps} width={size} height={size} viewBox="0 0 48 48" style={style}>
            {/* Clipboard body */}
            <rect x="10" y="8" width="28" height="36" rx="2" stroke={color} strokeWidth="2.5" fill="#fff" />
            {/* Clip at top */}
            <rect x="18" y="4" width="12" height="8" rx="2" stroke={color} strokeWidth="2.5" fill="#31372B" />
            {/* List lines */}
            <line x1="16" y1="18" x2="32" y2="18" stroke={color} strokeWidth="2" />
            <line x1="16" y1="24" x2="32" y2="24" stroke={color} strokeWidth="2" />
            <line x1="16" y1="30" x2="28" y2="30" stroke={color} strokeWidth="2" />
            {/* Checkmarks */}
            <path d="M13 18 L14.5 19.5 L17 16.5" stroke="#4A5240" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 24 L14.5 25.5 L17 22.5" stroke="#4A5240" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* ₹ at bottom */}
            <text x="24" y="40" textAnchor="middle" fontSize="8" fill={color} fontWeight="bold">₹</text>
        </svg>
    )
}

// ── Icon registry: maps card keys to icon components ──
export function CardIcon({ name, size = 32, color = '#31372B' }: { name: string; size?: number; color?: string }) {
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

// ── Tab bar icon registry ──
export function TabIcon({ name, size = 24, color = '#31372B' }: { name: string; size?: number; color?: string }) {
    switch (name) {
        case 'home': return <HomeIcon size={size} color={color} />
        case 'search': return <SearchIcon size={size} color={color} />
        case 'calendar': return <CalendarIcon size={size} color={color} />
        case 'location': return <LocationIcon size={size} color={color} />
        case 'clipboard': return <ClipboardIcon size={size} color={color} />
        case 'truck': return <TransporterIcon size={size} color={color} />
        case 'wallet': return <WalletIcon size={size} color={color} />
        case 'social': return <SocialIcon size={size} color={color} />
        default: return <HomeIcon size={size} color={color} />
    }
}
