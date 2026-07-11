import mongoose from 'mongoose'

const BookingSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // the transporter/driver assigned
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },  // primary listing (optional — multi-commodity bookings may span multiple listings)
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },  // transporter vehicle (optional)
  buyerVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerVehicle' },  // buyer's own vehicle (optional)

  // Multi-commodity support — each item represents one commodity the farmer
  // is selling to this buyer in this trip.
  commodities: [
    {
      listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },     // in kg
      numberOfBags: { type: Number, default: 0 },
      pricePerUnit: { type: Number, default: 0 },     // agreed price at booking time
    },
  ],
  // Aggregated quantity across all commodities (denormalized for easy queries)
  totalQuantity: { type: Number, default: 0 },

  commodity: { type: String, default: '' },  // legacy — kept for backward compat with single-commodity bookings
  quantity: { type: Number },                // legacy — kept for backward compat

  pickupLocation: { type: String, required: true },
  deliveryLocation: { type: String, required: true },
  estimatedDistance: { type: Number },

  // Freight charged for this booking (computed from vehicle's freight type +
  // distance, or 0 for free buyer vehicles).
  freightAmount: { type: Number, default: 0 },
  freightType: { type: String, enum: ['free', 'flat', 'per_km', 'transporter'], default: 'transporter' },

  status: { type: String, enum: ['pending', 'confirmed', 'in-transit', 'delivered', 'cancelled'], default: 'pending' },
  // Free-text note from transporter/driver — e.g. "Leaving in 30 min, ETA 4pm"
  driverNote: { type: String, maxlength: 500, default: '' },
  estimatedArrivalTime: { type: Date },
  actualArrivalTime: { type: Date },

  // ── Driver counter-offer ─────────────────────────────────────────
  // When the transporter/driver cannot make the farmer's requested pickup
  // time, they can counter-offer an alternative. The farmer can accept or
  // reject the counter-offer.
  driverResponse: {
    type: String,
    enum: ['pending', 'accepted', 'counter-offered', 'rejected'],
    default: 'pending',
  },
  driverOfferedTime: { type: Date },  // the alternative pickup time proposed by driver

  // ── Payment on delivery ──────────────────────────────────────────
  // After the commodity is weighed at the buyer's shop, the buyer enters
  // the final bill (may differ from the agreed estimate). Then the buyer
  // pays via AgriPay wallet / AgriPay UPI / direct UPI / netbanking / cash.
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'billed', 'pending', 'paid', 'failed'],
    default: 'unpaid',
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'agripay-upi', 'direct-upi', 'netbanking', 'cash'],
  },
  billAmount: { type: Number, default: 0 },        // final amount entered by buyer after weighing
  billNote: { type: String, maxlength: 500, default: '' },  // e.g. "Actual weight 495 kg"
  paymentAmount: { type: Number, default: 0 },     // amount actually paid (may differ if partial)
  paidAt: { type: Date },
  paymentRef: { type: String, default: '' },       // wallet txn id / UPI ref / etc.

  // Live driver location for real-time tracking
  driverLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date,
  },
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