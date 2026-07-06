import mongoose from 'mongoose'

const BookingSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  quantity: { type: Number, required: true },
  pickupLocation: { type: String, required: true },
  deliveryLocation: { type: String, required: true },
  estimatedDistance: { type: Number },
  status: { type: String, enum: ['pending', 'confirmed', 'in-transit', 'delivered', 'cancelled'], default: 'pending' },
  estimatedArrivalTime: { type: Date },
  actualArrivalTime: { type: Date },
  trackingUpdates: [
    {
      timestamp: Date,
      location: { latitude: Number, longitude: Number },
      status: String,
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

BookingSchema.index({ farmerId: 1, createdAt: -1 })
BookingSchema.index({ buyerId: 1, createdAt: -1 })
BookingSchema.index({ listingId: 1 })
BookingSchema.index({ vehicleId: 1 })
BookingSchema.index({ status: 1, createdAt: -1 })

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema)