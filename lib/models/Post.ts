import mongoose from 'mongoose'

const CommentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
})

const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['post', 'krishiclip'], required: true },
    mediaUrl: { type: String, default: '' },          // primary media URL (image / video / YouTube)
    mediaUrls: [{ type: String }],                     // carousel — up to 10 images/videos
    mediaType: { type: String, enum: ['image', 'video', 'youtube', 'text'], default: 'text' },
    caption: { type: String, maxlength: 2200, default: '' },
    hashtags: [{ type: String }],
    category: {
        type: String,
        enum: ['farming', 'agritrading', 'technique', 'equipment', 'weather', 'livestock', 'organic', 'general'],
        default: 'general',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedCount: { type: Number, default: 0 },
    sharedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharedCount: { type: Number, default: 0 },
    comments: [CommentSchema],
    commentsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    location: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    // Ranked-feed scoring helpers
    rankScore: { type: Number, default: 0 },
}, { timestamps: true })

PostSchema.index({ userId: 1, createdAt: -1 })
PostSchema.index({ type: 1, createdAt: -1 })
PostSchema.index({ hashtags: 1 })
PostSchema.index({ category: 1 })
PostSchema.index({ rankScore: -1 })

// Auto-update rankScore before save. Instagram-like ranking: recency + engagement.
PostSchema.pre('save', function (this: any) {
    if (this.isModified('likesCount') || this.isModified('commentsCount') || this.isModified('savedCount') || this.isModified('sharedCount') || this.isModified('createdAt')) {
        const ageHours = (Date.now() - (this.createdAt?.getTime?.() || Date.now())) / 3_600_000
        const recency = Math.max(0, 1 - ageHours / 168) // decays over a week
        const engagement = (this.likesCount || 0) * 5 + (this.commentsCount || 0) * 8 + (this.savedCount || 0) * 6 + (this.sharedCount || 0) * 10
        this.rankScore = Math.round((engagement + recency * 50) * 100) / 100
    }
})

export default mongoose.models.Post || mongoose.model('Post', PostSchema)
