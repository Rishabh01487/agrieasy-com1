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

// ── Home: logo image ──
export function HomeIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-home.png" alt="Home" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
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

// ── Calendar/Bookings: logo image ──
export function CalendarIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-bookings.png" alt="Bookings" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
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

// ── Clipboard/Commodities: logo image ──
export function ClipboardIcon({ size = 24, color = '#31372B', style }: IconProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-commodities.png" alt="Commodities" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
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
