'use client'

import { useEffect, useRef, useCallback } from 'react'

const SOUND_BASE = '/sounds'
const STORAGE_KEY = 'agrieasy_sounds_enabled'

type SoundName = 'ta-dum' | 'click'

let audioContext: AudioContext | null = null
let soundsEnabled = true

if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) soundsEnabled = stored === 'true'
}

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        } catch {
            return null
        }
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {})
    }
    return audioContext
}

const buffers: Partial<Record<SoundName, AudioBuffer>> = {}

async function loadSound(ctx: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
    if (buffers[name]) return buffers[name]!
    try {
        const res = await fetch(`${SOUND_BASE}/${name}.wav`)
        if (!res.ok) return null
        const arrayBuffer = await res.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        buffers[name] = audioBuffer
        return audioBuffer
    } catch {
        return null
    }
}

export async function playSound(name: SoundName, volume = 0.5) {
    if (!soundsEnabled) return
    const ctx = getAudioContext()
    if (!ctx) return
    const buffer = await loadSound(ctx, name)
    if (!buffer) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gainNode = ctx.createGain()
    gainNode.gain.value = volume
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(0)
}

export function isSoundEnabled(): boolean {
    return soundsEnabled
}

export function toggleSound(): boolean {
    soundsEnabled = !soundsEnabled
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(soundsEnabled))
    }
    return soundsEnabled
}

export function useAppOpenSound() {
    const playedRef = useRef(false)
    useEffect(() => {
        if (playedRef.current) return
        playedRef.current = true
        const playOnce = () => {
            playSound('ta-dum', 0.4)
            document.removeEventListener('click', playOnce)
            document.removeEventListener('touchstart', playOnce)
            document.removeEventListener('keydown', playOnce)
        }
        const timer = setTimeout(() => {
            document.addEventListener('click', playOnce, { once: true })
            document.addEventListener('touchstart', playOnce, { once: true })
            document.addEventListener('keydown', playOnce, { once: true })
        }, 500)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('click', playOnce)
            document.removeEventListener('touchstart', playOnce)
            document.removeEventListener('keydown', playOnce)
        }
    }, [])
}
