import type { CSSProperties } from 'react'

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

export function FarmerIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/logo-farmer.png" alt="Farmer" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}
export function BuyerIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/logo-buyer.png" alt="Buyer" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}
export function TransporterIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/logo-transporter.png" alt="Transporter" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}
export function CalculatorIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/logo-billcalc.png" alt="Bill Calculator" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}
export function WalletIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/logo-agripay.png" alt="EasyPay" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}
export function SocialIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/agrisocial-logo.png" alt="AgriSocial" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}
export function LedgerIcon({ size = 32, color = '#31372B', style }: IconProps) {
    return <img src="/logo-ledger.png" alt="Ledger" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover', ...style }} />
}

export function CardIcon({ name, size = 32, color = '#31372B' }: { name: string; size?: number; color?: string }) {
    switch (name) {
        case 'Farmer': case 'Farmer/Vyapari': return <FarmerIcon size={size} color={color} />
        case 'Buyer': return <BuyerIcon size={size} color={color} />
        case 'Transporter': return <TransporterIcon size={size} color={color} />
        case 'Bill Calculator': return <CalculatorIcon size={size} color={color} />
        case 'AgriPay': case 'EasyPay': return <WalletIcon size={size} color={color} />
        case 'AgriSocial': return <SocialIcon size={size} color={color} />
        case 'Ledger': return <LedgerIcon size={size} color={color} />
        default: return <FarmerIcon size={size} color={color} />
    }
}

// ── Tab bar icon registry ──
export function TabIcon({ name, size = 24, color = '#31372B' }: { name: string; size?: number; color?: string }) {
    switch (name) {
        case 'home': return <img src="/logo-home.png" alt="Home" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover' }} />
        case 'search': return <span style={{ fontSize: size, color }}>🔍</span>
        case 'calendar': return <img src="/logo-bookings.png" alt="Bookings" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover' }} />
        case 'location': return <span style={{ fontSize: size, color }}>📍</span>
        case 'clipboard': return <img src="/logo-commodities.png" alt="Commodities" width={size} height={size} style={{ borderRadius: size * 0.15, objectFit: 'cover' }} />
        case 'truck': return <TransporterIcon size={size} color={color} />
        case 'wallet': return <WalletIcon size={size} color={color} />
        case 'social': return <SocialIcon size={size} color={color} />
        default: return <span style={{ fontSize: size }}>🏠</span>
    }
}
