import mongoose from 'mongoose'

// Collection — a named group of saved posts (Instagram-style saved collections)
const CollectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 100 },
  coverPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // first post in collection = cover
  postIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

CollectionSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.Collection || mongoose.model('Collection', CollectionSchema)
