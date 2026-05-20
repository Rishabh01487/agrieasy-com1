import mongoose from 'mongoose'

const WalletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    isKYC: { type: Boolean, default: false },
    agripayId: { type: String, unique: true, sparse: true },
    pin: { type: String },
    dailyLimit: { type: Number, default: 10000 },
    monthlyLimit: { type: Number, default: 100000 },
    // Bank account details
    bankName: { type: String },
    bankHolder: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankVerified: { type: Boolean, default: false },
    bankVerifiedAt: { type: Date },
    // PayLater fields
    paylaterLimit: { type: Number, default: 0 },
    paylaterUsed: { type: Number, default: 0 },
    paylaterEligible: { type: Boolean, default: false },
    paylaterCreditScore: { type: Number, default: 0 },
    paylaterMaxLimit: { type: Number, default: 1000000 },
    // UPI ID
    upiId: { type: String },
}, { timestamps: true })

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema)
