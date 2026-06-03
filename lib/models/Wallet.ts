import mongoose from 'mongoose'
import { encrypt, decrypt } from '@/lib/encryption'

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
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } })

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema)
