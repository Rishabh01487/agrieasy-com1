import mongoose from 'mongoose'

/**
 * Stores each individual PWA install as a separate document.
 * This lets us track:
 *   - Total installs (count of documents)
 *   - Installs over time (group by date)
 *   - Installs by platform (Android / iOS / Desktop)
 *   - Unique installs (by deviceId, to avoid double-counting re-installs)
 *
 * A separate "counter" approach would be simpler but loses historical detail.
 * Per-install records let us build charts later (installs/day, installs/platform).
 */
const MetricSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['pwa_install'],
    required: true,
    index: true,
  },
  // Anonymous device fingerprint — prevents double-counting if the same
  // user reinstalls. Generated client-side from userAgent + screen size +
  // timezone hash. NOT personally identifiable.
  deviceId: { type: String, default: '', index: true },
  // Parsed platform: 'android' | 'ios' | 'desktop-chrome' | 'desktop-edge' | 'desktop-firefox' | 'other'
  platform: { type: String, default: 'unknown' },
  // Raw userAgent for debugging (truncated to 200 chars)
  userAgent: { type: String, default: '', maxlength: 200 },
  // Browser language (e.g. 'en-US', 'hi-IN')
  language: { type: String, default: '' },
  // Optional: if the user was logged in when they installed
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

MetricSchema.index({ type: 1, createdAt: -1 })
MetricSchema.index({ type: 1, deviceId: 1 }, { unique: true })

export default mongoose.models.Metric || mongoose.model('Metric', MetricSchema)
