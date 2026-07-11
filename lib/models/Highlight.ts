import mongoose from 'mongoose'

const HighlightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 50 },
  coverImage: { type: String, default: '' },  // Cloudinary URL (first story's media)
  stories: [{
    mediaUrl: String,
    mediaType: { type: String, enum: ['image', 'video'] },
    caption: { type: String, default: '' },
    createdAt: Date,
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

HighlightSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.Highlight || mongoose.model('Highlight', HighlightSchema)
