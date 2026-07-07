import mongoose from 'mongoose'

// Instagram-style stories — expire after 24h, viewed by list, single media per story.

const StorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    caption: { type: String, maxlength: 500, default: '' },
    duration: { type: Number, default: 5 }, // seconds to display
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
})

StorySchema.index({ userId: 1, createdAt: -1 })
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Story || mongoose.model('Story', StorySchema)
