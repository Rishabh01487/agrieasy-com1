import mongoose from 'mongoose'

const ListingSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commodity: { type: String, required: true },
  variety: { type: String },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  pricePerUnit: { type: Number, required: true },
  quality: { type: String },
  paymentConditions: { type: String },
  description: { type: String, maxlength: 2000 },
  firmLocation: { type: String },
  shopPhoto: { type: String, default: '' },
  images: [{ type: String }],
  location: { type: String, default: '' },  // location string (e.g. "APMC Market, Pune, MH")
  geoLocation: {                              // optional geo coordinates for maps
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