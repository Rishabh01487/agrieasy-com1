import mongoose from 'mongoose'

/**
 * BuyerVehicle — a vehicle that a buyer owns and offers to farmers for
 * transporting produce to the buyer's shop / godown.
 *
 * Unlike transporter vehicles (which charge per km), buyer vehicles can
 * optionally be free — the buyer covers the freight as an incentive for
 * farmers to sell to them.
 */
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
  //   - 'flat'      → farmer pays `freightAmount` once per trip
  //   - 'per_km'    → farmer pays `freightAmount` × distance
  freightType: {
    type: String,
    enum: ['free', 'flat', 'per_km'],
    default: 'free',
  },
  freightAmount: { type: Number, default: 0, min: 0 },

  availability: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  notes: { type: String, maxlength: 500, default: '' },  // e.g. "Available Mon-Sat, 8am-6pm"

  // Where this vehicle is typically based (used for distance display).
  baseLocation: { type: String, default: '' },
  baseGeoLocation: {
    latitude: Number,
    longitude: Number,
  },
  // When this vehicle becomes available again — same semantics as
  // Vehicle.availableFrom. Set when the buyer dispatches the vehicle on
  // a booking. Farmers see "Available from HH:MM" if this is in the future.
  availableFrom: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

BuyerVehicleSchema.index({ buyerId: 1, createdAt: -1 })
BuyerVehicleSchema.index({ availability: 1 })
BuyerVehicleSchema.index({ capacityKg: 1 })

export default mongoose.models.BuyerVehicle || mongoose.model('BuyerVehicle', BuyerVehicleSchema)
