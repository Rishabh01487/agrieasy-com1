import mongoose from 'mongoose'

// Ledger entry — a single financial record for any role.
// type field determines the direction and meaning:
//   - 'bill'         : Buyer uploads a bill (photo) after weighing farmer's goods.
//                      Buyer owes farmer money. Shows as a debit for buyer, credit for farmer.
//   - 'invoice'      : Transporter issues an invoice for freight service.
//                      Buyer (or farmer) owes transporter money.
//   - 'earning'      : Income received (farmer selling crops, transporter getting paid).
//   - 'expense'      : Money spent (buyer paying farmer, farmer paying transporter).
//   - 'commission'   : Platform commission (optional, for future).

const LedgerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // owner of this ledger entry
  type: { type: String, enum: ['bill', 'invoice', 'earning', 'expense', 'commission'], required: true },
  counterpartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  counterpartyName: { type: String, default: '' },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  // Financial details
  amount: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 0 },        // kg / quintal / ton involved
  unit: { type: String, default: 'kg' },
  pricePerUnit: { type: Number, default: 0 },
  commodity: { type: String, default: '' },
  billPhoto: { type: String, default: '' },       // Cloudinary URL
  // Status
  status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
  // Description / notes
  description: { type: String, maxlength: 1000, default: '' },
  dueDate: { type: Date },
  paidAt: { type: Date },
  // Metadata
  role: { type: String, enum: ['farmer', 'buyer', 'transporter'], required: true },  // role of the userId owner
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

LedgerSchema.index({ userId: 1, createdAt: -1 })
LedgerSchema.index({ userId: 1, type: 1, createdAt: -1 })
LedgerSchema.index({ userId: 1, status: 1 })
LedgerSchema.index({ counterpartyId: 1 })

export default mongoose.models.Ledger || mongoose.model('Ledger', LedgerSchema)
