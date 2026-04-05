import mongoose from 'mongoose'

const ListingSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commodity: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  pricePerUnit: { type: Number, required: true },
  quality: { type: String },
  paymentConditions: { type: String },
  firmLocation: { type: String },
  location: {
    latitude: Number,
    longitude: Number,
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export default mongoose.models.Listing || mongoose.model('Listing', ListingSchema)