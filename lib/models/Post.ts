import mongoose from 'mongoose'

const CommentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
})

const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['post', 'krishiclip'], required: true },
    mediaUrl: { type: String, default: '' },          // image URL or video/YT URL
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
    comments: [CommentSchema],
    commentsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    location: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

PostSchema.index({ userId: 1, createdAt: -1 })
PostSchema.index({ type: 1, createdAt: -1 })
PostSchema.index({ hashtags: 1 })
PostSchema.index({ category: 1 })

export default mongoose.models.Post || mongoose.model('Post', PostSchema)
