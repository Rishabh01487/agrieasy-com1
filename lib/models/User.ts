import mongoose from 'mongoose'
import { encrypt, decrypt } from '@/lib/encryption'
import { validateAadhar, validateDrivingLicense } from '@/lib/validators'

const encryptedString = {
  type: String,
  set(this: any, v: string) {
    if (!v || v.includes(':')) return v
    try { return encrypt(v) } catch {
      console.warn('ENCRYPTION_KEY not set — storing plaintext')
      return v
    }
  },
  get(this: any, v: string) {
    if (!v || !v.includes(':')) return v
    try { return decrypt(v) } catch { return v }
  },
}

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer', 'transporter', 'driver'], required: true },
  address: { type: String, required: true },

  // Profile (Instagram-style)
  profilePic: { type: String, default: '' },   // Cloudinary URL
  bio: { type: String, maxlength: 500, default: '' },
  upiId: { type: String, default: '' },         // UPI ID for direct payments (e.g., farmer@paytm)

  // Farmer specific
  aadharNumber: encryptedString,
  farmerName: { type: String },
  // Farmer's primary location — captured on first dashboard visit after
  // registration. `farmerAddress` is the human-readable string the farmer
  // picks from the autocomplete; `location` holds the lat/lng used for
  // distance-based buyer discovery.
  farmerAddress: { type: String, default: '' },
  hasSetupLocation: { type: Boolean, default: false },

  // Buyer specific
  firmName: { type: String },
  gstin: { type: String },
  commoditiesInterested: [{ type: String }],
  // Buyer profile photos — visiting card (business card) and shop front
  // Both optional Cloudinary URLs the buyer can add/edit from their profile page.
  visitingCardPhoto: { type: String, default: '' },
  shopPhoto: { type: String, default: '' },

  // Transporter specific
  transporterCompanyName: { type: String },
  transporterGstin: { type: String },
  fleetSize: { type: Number },

  // Driver specific
  licenseNumber: encryptedString,
  driverName: { type: String },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  location: {
    latitude: Number,
    longitude: Number,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { toJSON: { getters: true }, toObject: { getters: true } })

UserSchema.pre('validate', function(this: any) {
  if (this.aadharNumber && this.isModified('aadharNumber')) {
    const r = validateAadhar(this.aadharNumber)
    if (!r.valid) throw new Error(r.message)
  }
  if (this.licenseNumber && this.isModified('licenseNumber')) {
    const r = validateDrivingLicense(this.licenseNumber)
    if (!r.valid) throw new Error(r.message)
  }
})

UserSchema.index({ role: 1 })
UserSchema.index({ createdAt: -1 })

export default mongoose.models.User || mongoose.model('User', UserSchema)