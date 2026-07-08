'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useInfiniteScroll — reusable hook for paginated infinite scrolling.
 *
 * Usage:
 *   const { items, loading, hasMore, loadMore, reset } = useInfiniteScroll({
 *     fetcher: async (page: number) => { ... return { items, hasMore } },
 *     initialPage: 1,
 *     threshold: 200,  // px from bottom to trigger next load
 *   })
 *
 * The hook auto-loads the first page on mount, then loads subsequent pages
 * when the user scrolls within `threshold` pixels of the bottom of the
 * scroll container (or window).
 */
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

    // Load a specific page
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

    // Load first page on mount
    useEffect(() => {
        if (!enabled) return
        void loadPage(initialPage, false)
    }, [enabled, initialPage, loadPage])

    // Load next page
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        void loadPage(pageRef.current + 1, true)
    }, [loadingMore, hasMore, loadPage])

    // Reset (e.g., when filter changes)
    const reset = useCallback(() => {
        pageRef.current = initialPage
        setItems([])
        setHasMore(true)
        void loadPage(initialPage, false)
    }, [initialPage, loadPage])

    // IntersectionObserver for auto-loading when sentinel is visible
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
