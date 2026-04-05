import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for top-up
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // null for bill pay
  amount: { type: Number, required: true, min: 1 },
  type: {
    type: String,
    enum: ['send', 'receive', 'topup', 'bill_pay', 'booking_pay', 'refund'],
    required: true,
  },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  description: { type: String, required: true }, // e.g. "Fuel bill", "Driver salary", "To Ramesh"
  category: {
    type: String,
    enum: ['transfer', 'fuel', 'salary', 'booking', 'recharge', 'food', 'other'],
    default: 'other',
  },
  referenceId: { type: String }, // external payment ref (Razorpay order id etc.)
  razorpayOrderId: { type: String },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema)