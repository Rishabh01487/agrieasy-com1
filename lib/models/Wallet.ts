import mongoose from 'mongoose'
import { encrypt, decrypt } from '@/lib/encryption'
import { validateUpiId } from '@/lib/validators'

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

const WalletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    isKYC: { type: Boolean, default: false },
    agripayId: { type: String, unique: true, sparse: true },
    pin: { type: String },
    dailyLimit: { type: Number, default: 10000 },
    monthlyLimit: { type: Number, default: 100000 },
    bankName: encryptedString,
    bankHolder: encryptedString,
    accountNumber: encryptedString,
    ifscCode: { type: String },
    bankVerified: { type: Boolean, default: false },
    bankVerifiedAt: { type: Date },
    paylaterLimit: { type: Number, default: 0 },
    paylaterUsed: { type: Number, default: 0 },
    paylaterEligible: { type: Boolean, default: false },
    paylaterCreditScore: { type: Number, default: 0 },
    paylaterMaxLimit: { type: Number, default: 1000000 },
    upiId: encryptedString,
    razorpayFundAccountId: { type: String },
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } })

WalletSchema.pre('validate', function(this: any) {
  if (this.upiId && this.isModified('upiId')) {
    const r = validateUpiId(this.upiId)
    if (!r.valid) throw new Error(r.message)
  }
})

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema)
