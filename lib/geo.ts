/**
 * Tiny Nominatim geocoder — used to convert a human-readable address string
 * (e.g. "APMC Market, Pune, Maharashtra") into lat/lng so we can compute
 * distance from the farmer to the buyer's listing.
 *
 * Free tier via OpenStreetMap — no API key required. We respect their
 * usage policy: max 1 request per second, identify with a Referer/User-Agent.
 */

interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 3) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=in&limit=1&addressdetails=0`
    const res = await fetch(url, {
      headers: {
        // Nominatim asks for a recognizable User-Agent
        'User-Agent': 'AgriEasy/1.0 (agrieasy.app)',
        'Accept-Language': 'en',
      },
      // Don't hang the request forever — geocoding is best-effort
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
    if (!Array.isArray(data) || data.length === 0) return null
    const hit = data[0]
    const latitude = parseFloat(hit.lat)
    const longitude = parseFloat(hit.lon)
    if (isNaN(latitude) || isNaN(longitude)) return null
    return { latitude, longitude, displayName: hit.display_name }
  } catch {
    return null
  }
}

/**
 * Haversine distance between two lat/lng points, in kilometres.
 * Used to find buyers within a given radius of the farmer.
 */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371 // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
