export type FeatureFlag =
  | 'buyer_section'
  | 'farmer_section'
  | 'transporter_section'
  | 'agripay'
  | 'agrisocial'
  | 'live_tracking'
  | 'multi_commodity_bookings'
  | 'buyer_vehicles'
  | 'payment_on_delivery'
  | 'driver_counter_offer'
  | 'pwa_install'
  | 'beta_invite_codes'

interface FeatureConfig {
  description: string
  defaultEnabled: boolean
  betaOnly: boolean
}

export const FEATURE_FLAGS: Record<FeatureFlag, FeatureConfig> = {
  buyer_section: { description: 'Buyer dashboard, listings, bookings, vehicles', defaultEnabled: true, betaOnly: false },
  farmer_section: { description: 'Farmer dashboard, search, bookings, tracking', defaultEnabled: true, betaOnly: false },
  transporter_section: { description: 'Transporter dashboard, fleet, bookings, tracking', defaultEnabled: true, betaOnly: false },
  agripay: { description: 'AgriPay wallet, UPI, topup, transfer', defaultEnabled: true, betaOnly: false },
  agrisocial: { description: 'AgriSocial feed, stories, clips, DMs', defaultEnabled: true, betaOnly: false },
  live_tracking: { description: 'Live vehicle GPS tracking on map', defaultEnabled: true, betaOnly: true },
  multi_commodity_bookings: { description: 'Book multiple commodities in one trip', defaultEnabled: true, betaOnly: true },
  buyer_vehicles: { description: 'Buyer-owned vehicles with freight', defaultEnabled: true, betaOnly: true },
  payment_on_delivery: { description: 'Pay farmer after delivery (wallet/UPI/cash)', defaultEnabled: true, betaOnly: true },
  driver_counter_offer: { description: 'Driver can propose alternate pickup time', defaultEnabled: true, betaOnly: true },
  pwa_install: { description: 'Show PWA install prompt', defaultEnabled: true, betaOnly: false },
  beta_invite_codes: { description: 'Beta invite code gating', defaultEnabled: false, betaOnly: true },
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const config = FEATURE_FLAGS[flag]
  if (!config) return false

  if (typeof window === 'undefined') return config.defaultEnabled

  const envOverride = localStorage.getItem(`feature_${flag}`)
  if (envOverride === 'true') return true
  if (envOverride === 'false') return false

  return config.defaultEnabled
}

export function isBetaUser(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('beta_access') === 'true'
}

export function setBetaAccess(code: string): boolean {
  const validCodes = (process.env.NEXT_PUBLIC_BETA_CODES || '').split(',').map(c => c.trim()).filter(Boolean)
  if (validCodes.length === 0) return true
  if (validCodes.includes(code)) {
    localStorage.setItem('beta_access', 'true')
    localStorage.setItem('beta_code', code)
    return true
  }
  return false
}

export function clearBetaAccess(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('beta_access')
  localStorage.removeItem('beta_code')
}

export function setFeatureOverride(flag: FeatureFlag, enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`feature_${flag}`, String(enabled))
}

export function getFeatureOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  const overrides: Record<string, boolean> = {}
  for (const flag of Object.keys(FEATURE_FLAGS)) {
    const val = localStorage.getItem(`feature_${flag}`)
    if (val !== null) overrides[flag] = val === 'true'
  }
  return overrides
}
