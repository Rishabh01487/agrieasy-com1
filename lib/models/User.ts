import mongoose from 'mongoose'
import { encrypt, decrypt } from '@/lib/encryption'
import { validateAadhar, validateDrivingLicense } from '@/lib/validators'

const encryptedString = {
  type: String,
  set(this: any, v: string) {
    if (!v || v.includes(':')) return v
    return encrypt(v)
  },
  get(this: any, v: string) {
    if (!v || !v.includes(':')) return v
    return decrypt(v)
  },
}

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer', 'transporter', 'driver'], required: true },
  address: { type: String, required: true },

  // Farmer specific
  aadharNumber: encryptedString,
  farmerName: { type: String },

  // Buyer specific
  firmName: { type: String },
  gstin: { type: String },
  commoditiesInterested: [{ type: String }],

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

UserSchema.pre('validate', function(next) {
  if (this.aadharNumber && this.isModified('aadharNumber')) {
    const r = validateAadhar(this.aadharNumber)
    if (!r.valid) return next(new Error(r.message))
  }
  if (this.licenseNumber && this.isModified('licenseNumber')) {
    const r = validateDrivingLicense(this.licenseNumber)
    if (!r.valid) return next(new Error(r.message))
  }
  next()
})

export default mongoose.models.User || mongoose.model('User', UserSchema)