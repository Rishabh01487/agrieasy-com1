import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer', 'transporter', 'driver'], required: true },
  address: { type: String, required: true },

  // Farmer specific
  aadharNumber: { type: String },
  farmerName: { type: String },

  // Buyer specific
  firmName: { type: String },
  gstin: { type: String },
  commoditiesInterested: [{ type: String }],

  // Transporter specific
  transporterCompanyName: { type: String },
  transporterGstin: { type: String },
  fleetSize: { type: Number },

  // Driver specific
  licenseNumber: { type: String },
  driverName: { type: String },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // which transporter the driver belongs to

  location: {
    latitude: Number,
    longitude: Number,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export default mongoose.models.User || mongoose.model('User', UserSchema)