/**
 * AgriVerse — a collection of agricultural character avatars that users can
 * pick from for their AgriSocial profile picture. Each avatar has a stable
 * `id` (used as the URL slug + storage key) and a human-readable `name`.
 *
 * Image files live at /public/agriverse/avatar_<id>.png and are served at
 * /agriverse/avatar_<id>.png (relative path, no host required).
 *
 * The profile API accepts either an absolute https URL (Cloudinary upload)
 * OR a relative /agriverse/... path (AgriVerse pick) — see
 * app/api/social/profile/route.ts.
 */

export interface AgriVerseAvatar {
  id: string
  name: string
  /** Relative path — works on any host (localhost, preview, production). */
  src: string
  /** Short tagline shown under the name in the picker. */
  tagline: string
}

export const AGRIVERSE_AVATARS: AgriVerseAvatar[] = [
  // ─── Original 5 (the ones the user provided as references) ───
  { id: 'farmer_wheat',     name: 'Farmer Wheat',     src: '/agriverse/avatar_farmer_wheat.png',     tagline: 'The Wheat Whisperer' },
  { id: 'cow_keeper',       name: 'Cow Keeper',       src: '/agriverse/avatar_cow_keeper.png',       tagline: 'Guardian of the Herd' },
  { id: 'honey_bee',        name: 'Honey Bee',        src: '/agriverse/avatar_honey_bee.png',        tagline: 'Keeper of the Hive' },
  { id: 'organic_sprout',   name: 'Organic Sprout',   src: '/agriverse/avatar_organic_sprout.png',   tagline: 'The New Growth' },
  { id: 'tractor_driver',   name: 'Tractor Driver',   src: '/agriverse/avatar_tractor_driver.png',   tagline: 'The Field Cruiser' },

  // ─── Crop & livestock farmers ───
  { id: 'rice_grower',         name: 'Rice Grower',         src: '/agriverse/avatar_rice_grower.png',         tagline: 'Paddy Steward' },
  { id: 'sugarcane_grower',    name: 'Sugarcane Grower',    src: '/agriverse/avatar_sugarcane_grower.png',    tagline: 'The Sweet Reaper' },
  { id: 'cotton_grower',       name: 'Cotton Grower',       src: '/agriverse/avatar_cotton_grower.png',       tagline: 'White Gold Weaver' },
  { id: 'tomato_grower',       name: 'Tomato Grower',       src: '/agriverse/avatar_tomato_grower.png',       tagline: 'The Red Harvest' },
  { id: 'millet_grower',       name: 'Millet Grower',       src: '/agriverse/avatar_millet_grower.png',       tagline: 'Coarse-Grain Keeper' },
  { id: 'tea_gardener',        name: 'Tea Gardener',        src: '/agriverse/avatar_tea_gardener.png',        tagline: 'Plucker of Hills' },
  { id: 'milkmaid',            name: 'Milkmaid',            src: '/agriverse/avatar_milkmaid.png',            tagline: 'Bringer of White Gold' },
  { id: 'fish_farmer',         name: 'Fish Farmer',         src: '/agriverse/avatar_fish_farmer.png',         tagline: 'Pond Master' },
  { id: 'goat_herder',         name: 'Goat Herder',         src: '/agriverse/avatar_goat_herder.png',         tagline: 'Hill Wanderer' },
  { id: 'poultry_keeper',      name: 'Poultry Keeper',      src: '/agriverse/avatar_poultry_keeper.png',      tagline: 'Keeper of the Coop' },

  // ─── Market & ecosystem entities ───
  { id: 'onion_merchant',      name: 'Onion Merchant',      src: '/agriverse/avatar_onion_merchant.png',      tagline: 'Tearful Trader' },
  { id: 'spice_merchant',      name: 'Spice Merchant',      src: '/agriverse/avatar_spice_merchant.png',      tagline: 'Master of Masala' },
  { id: 'mandi_agent',         name: 'Mandi Agent',         src: '/agriverse/avatar_mandi_agent.png',         tagline: 'Auction Whisperer' },
  { id: 'cold_storage_keeper', name: 'Cold Storage Keeper', src: '/agriverse/avatar_cold_storage_keeper.png', tagline: 'Frost Guardian' },
  { id: 'seed_seller',         name: 'Seed Seller',         src: '/agriverse/avatar_seed_seller.png',         tagline: 'Sower of Beginnings' },
]

/** Look up an avatar by id (returns undefined if not found). */
export function getAgriVerseAvatar(id: string): AgriVerseAvatar | undefined {
  return AGRIVERSE_AVATARS.find(a => a.id === id)
}

/**
 * Given a profilePic URL (which may be a Cloudinary https URL, a relative
 * /agriverse/... path, or empty), return the avatar object if the URL
 * matches a known AgriVerse avatar. Useful for showing the avatar's name
 * as a caption on the profile.
 */
export function detectAgriVerseAvatar(profilePic: string | undefined | null): AgriVerseAvatar | undefined {
  if (!profilePic) return undefined
  // Match by exact src path
  return AGRIVERSE_AVATARS.find(a => profilePic === a.src || profilePic.endsWith(`/agriverse/avatar_${a.id}.png`))
}

/**
 * Shared Avatar component — renders either:
 *  - the user's uploaded photo (https URL)
 *  - a picked AgriVerse avatar (relative /agriverse/... path)
 *  - the gradient fallback with the first initial
 *
 * Reused across profile, feed, DM, search, clips, etc. so all surfaces stay
 * in sync as the avatar system evolves.
 */
import type { CSSProperties } from 'react'

interface AvatarProps {
  url?: string | null
  name: string
  size: number
  style?: CSSProperties
  /** Click handler — used by the picker to make avatars selectable. */
  onClick?: () => void
  /** Show a ring around the avatar (e.g., active selection in picker). */
  ring?: boolean
}

export function Avatar({ url, name, size, style, onClick, ring }: AvatarProps) {
  const initial = (name || '?')[0]?.toUpperCase() || '?'
  const ringStyle: CSSProperties = ring
    ? { boxShadow: '0 0 0 3px #7091E6, 0 0 0 5px #fff' }
    : {}
  const baseStyle: CSSProperties = {
    width: size, height: size, borderRadius: '50%',
    objectFit: 'cover', border: `${Math.max(2, size / 25)}px solid #fff`,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s ease',
    ...ringStyle,
    ...style,
  }
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        onClick={onClick}
        style={baseStyle}
      />
    )
  }
  return (
    <div
      onClick={onClick}
      style={{
        ...baseStyle,
        background: 'linear-gradient(135deg, #7091E6 0%, #3D52A0 100%)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}
