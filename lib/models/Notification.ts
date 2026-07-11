import mongoose from 'mongoose'

// Activity-feed notifications (likes, comments, follows, mentions, DMs).

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who did it
    type: {
        type: String,
        enum: ['like', 'comment', 'follow', 'mention', 'message', 'comment_like', 'story', 'booking_request', 'booking_status'],
        required: true,
    },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    commentId: { type: mongoose.Schema.Types.ObjectId },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    text: { type: String, default: '' }, // preview text (e.g. comment body, message body)
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
})

NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, isRead: 1 })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
