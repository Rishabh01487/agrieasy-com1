import mongoose from 'mongoose'

const BillingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commodity: { type: String, required: true },
  weightReceived: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  transportationCost: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
})

BillingSchema.index({ farmerId: 1, createdAt: -1 })
BillingSchema.index({ buyerId: 1, createdAt: -1 })
BillingSchema.index({ bookingId: 1 })
BillingSchema.index({ status: 1 })

export default mongoose.models.Billing || mongoose.model('Billing', BillingSchema)