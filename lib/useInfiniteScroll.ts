'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export function useInfiniteScroll<T>({
    fetcher,
    initialPage = 1,
    threshold = 300,
    enabled = true,
}: {
    fetcher: (page: number) => Promise<{ items: T[]; hasMore: boolean }>
    initialPage?: number
    threshold?: number
    enabled?: boolean
}) {
    const [items, setItems] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [error, setError] = useState('')
    const pageRef = useRef(initialPage)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    const loadPage = useCallback(async (pageNum: number, append: boolean) => {
        try {
            if (append) setLoadingMore(true)
            else setLoading(true)
            setError('')
            const result = await fetcher(pageNum)
            setItems(prev => append ? [...prev, ...result.items] : result.items)
            setHasMore(result.hasMore)
            pageRef.current = pageNum
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load')
            setHasMore(false)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [fetcher])

    useEffect(() => {
        if (!enabled) return
        void loadPage(initialPage, false)
    }, [enabled, initialPage, loadPage])

    // Load next page
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        void loadPage(pageRef.current + 1, true)
    }, [loadingMore, hasMore, loadPage])

    const reset = useCallback(() => {
        pageRef.current = initialPage
        setItems([])
        setHasMore(true)
        void loadPage(initialPage, false)
    }, [initialPage, loadPage])

    useEffect(() => {
        if (!sentinelRef.current || !enabled) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore()
                }
            },
            { rootMargin: `${threshold}px` }
        )
        observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [hasMore, loadingMore, loadMore, threshold, enabled])

    return {
        items,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        reset,
        sentinelRef,
    }
}
