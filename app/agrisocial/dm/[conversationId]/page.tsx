'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import AgriSocialDM from '../page'

export default function AgriSocialDMConversation({ params }: { params: Promise<{ conversationId: string }> }) {
    const { conversationId } = use(params)
    const router = useRouter()
    useEffect(() => {
        router.replace(`/agrisocial/dm?conversationId=${conversationId}`)
    }, [conversationId, router])
    return <AgriSocialDM />
}
