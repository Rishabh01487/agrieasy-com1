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

ListingSchema.index({ buyerId: 1, createdAt: -1 })
ListingSchema.index({ isActive: 1, createdAt: -1 })
ListingSchema.index({ commodity: 1 })
ListingSchema.index({ location: 1 })
ListingSchema.index({ '$**': 'text' })

export default mongoose.models.Listing || mongoose.model('Listing', ListingSchema)