import mongoose from 'mongoose'

const BuyerVehicleSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleType: {
    type: String,
    enum: ['mini-truck', 'pickup-van', 'truck', 'tractor-trolley', 'tempo', 'tractor', 'other'],
    required: true,
  },
  vehicleDisplayName: { type: String, default: '' },  // e.g. "Tata Ace", "Mahindra Pickup"
  registrationNumber: { type: String, required: true },
  capacityKg: { type: Number, required: true, min: 0 },   // max payload in kg
  driverName: { type: String, default: '' },
  driverPhone: { type: String, default: '' },

  // Freight the buyer charges the farmer for using this vehicle.
  // freightType:
  //   - 'free'      → farmer pays nothing (buyer absorbs cost)
  freightType: {
    type: String,
    enum: ['free', 'flat', 'per_km'],
    default: 'free',
  },
  freightAmount: { type: Number, default: 0, min: 0 },

  availability: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  notes: { type: String, maxlength: 500, default: '' },  // e.g. "Available Mon-Sat, 8am-6pm"

  baseLocation: { type: String, default: '' },
  baseGeoLocation: {
    latitude: Number,
    longitude: Number,
  },
  // When this vehicle becomes available again — same semantics as
  availableFrom: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

BuyerVehicleSchema.index({ buyerId: 1, createdAt: -1 })
BuyerVehicleSchema.index({ availability: 1 })
BuyerVehicleSchema.index({ capacityKg: 1 })

export default mongoose.models.BuyerVehicle || mongoose.model('BuyerVehicle', BuyerVehicleSchema)
