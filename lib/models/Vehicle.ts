import mongoose from 'mongoose'

const VehicleSchema = new mongoose.Schema({
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleType: {
    type: String,
    enum: ['mini-truck', 'pickup-van', 'truck', 'tractor-trolley', 'tempo'],
    required: true,
  },
  registrationNumber: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true }, // in kg
  pricePerKm: { type: Number, required: true },
  availability: { type: Boolean, default: true },

  // Driver info
  driverName: { type: String, required: true },
  driverPhone: { type: String, required: true },
  driverLicense: { type: String, required: true },
  driverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional link to driver account

  currentLocation: {
    latitude: Number,
    longitude: Number,
  },
  // When this vehicle becomes available again. Set when the vehicle is
  // dispatched on a booking — null/undefined means available immediately.
  // Farmers searching for vehicles will see "Available from HH:MM" if this
  // is in the future, and can still book it for a later pickup time.
  availableFrom: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

VehicleSchema.index({ transporterId: 1 })
VehicleSchema.index({ vehicleType: 1, availability: 1 })
VehicleSchema.index({ capacity: 1 })

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema)