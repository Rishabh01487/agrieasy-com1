import mongoose from 'mongoose'

const PayLaterSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loanAmount: { type: Number, required: true, min: 1, max: 1000000 },
    amountDue: { type: Number, required: true },
    interestRate: { type: Number, default: 0.099 },
    interestRateDefault: { type: Number, default: 0.11 },
    borrowedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'partially_repaid', 'closed', 'defaulted'],
        default: 'active',
    },
    totalRepaid: { type: Number, default: 0 },
    lastInterestCalc: { type: Date, default: Date.now },
    transactionRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    repaymentHistory: [{
        amount: Number,
        date: { type: Date, default: Date.now },
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    }],
}, { timestamps: true })

PayLaterSchema.index({ userId: 1, status: 1 })

export default mongoose.models.PayLater || mongoose.model('PayLater', PayLaterSchema)
