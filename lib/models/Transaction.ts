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
  paylaterId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayLater' },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema)
