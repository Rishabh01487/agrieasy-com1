'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import AgriSocialDM from '../page'

// Thin wrapper that lets us link to /agrisocial/dm/[conversationId] and
// have it open that specific conversation.
export default function AgriSocialDMConversation({ params }: { params: Promise<{ conversationId: string }> }) {
    const { conversationId } = use(params)
    const router = useRouter()
    useEffect(() => {
        router.replace(`/agrisocial/dm?conversationId=${conversationId}`)
    }, [conversationId, router])
    return <AgriSocialDM />
}
