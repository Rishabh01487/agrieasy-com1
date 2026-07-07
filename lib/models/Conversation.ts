import mongoose from 'mongoose'

// Direct-message conversation between 2 participants.
// For group chats in the future, change `participants` to allow >2.

const MessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, maxlength: 2000, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'text' },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

const ConversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    messages: [MessageSchema],
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageText: { type: String, default: '' },
}, { timestamps: true })

ConversationSchema.index({ participants: 1 })
ConversationSchema.index({ lastMessageAt: -1 })

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema)
