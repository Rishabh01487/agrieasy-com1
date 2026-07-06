import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true, min: 1 },
  type: {
    type: String,
    enum: ['send', 'receive', 'topup', 'bill_pay', 'booking_pay', 'refund',
           'paylater_borrow', 'paylater_repay', 'neft', 'rtgs', 'upi_pay'],
    required: true,
  },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['transfer', 'fuel', 'salary', 'booking', 'recharge', 'food', 'other',
           'paylater', 'neft', 'rtgs', 'upi'],
    default: 'other',
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'upi', 'neft', 'rtgs', 'paylater', 'cash'],
    default: 'wallet',
  },
  referenceId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paylaterId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayLater' },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

TransactionSchema.index({ fromUserId: 1, createdAt: -1 })
TransactionSchema.index({ toUserId: 1, createdAt: -1 })
TransactionSchema.index({ type: 1, createdAt: -1 })
TransactionSchema.index({ status: 1, createdAt: -1 })
TransactionSchema.index({ fromUserId: 1, type: 1 })
TransactionSchema.index({ paylaterId: 1 })

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema)
