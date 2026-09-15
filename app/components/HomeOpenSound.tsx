'use client'

import { useEffect } from 'react'

/**
 * Plays ONE sound — a cinematic "ta-dum" — when the user first clicks
 * anywhere on the home page. Invisible. No buttons. No CSS.
 * Plays only ONCE per session (sessionStorage).
 */
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
        try {
            const AC = window.AudioContext || (window as any).webkitAudioContext
            if (!AC) return null
            audioCtx = new AC()
        } catch { return null }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    return audioCtx
}

function playTaff(ctx: AudioContext) {
    const now = ctx.currentTime
    const hit = now + 0.12

    const sub = ctx.createOscillator()
    const subG = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(40, hit)
    sub.frequency.exponentialRampToValueAtTime(32, hit + 0.5)
    subG.gain.setValueAtTime(0, hit)
    subG.gain.linearRampToValueAtTime(0.5, hit + 0.02)
    subG.gain.exponentialRampToValueAtTime(0.001, hit + 0.8)
    sub.connect(subG).connect(ctx.destination)
    sub.start(hit); sub.stop(hit + 1.0)

    const mid = ctx.createOscillator()
    const midG = ctx.createGain()
    mid.type = 'sine'
    mid.frequency.setValueAtTime(110, hit)
    mid.frequency.exponentialRampToValueAtTime(75, hit + 0.3)
    midG.gain.setValueAtTime(0, hit)
    midG.gain.linearRampToValueAtTime(0.4, hit + 0.02)
    midG.gain.exponentialRampToValueAtTime(0.001, hit + 0.6)
    mid.connect(midG).connect(ctx.destination)
    mid.start(hit); mid.stop(hit + 0.7)

    const brass = ctx.createOscillator()
    const brassG = ctx.createGain()
    const brassF = ctx.createBiquadFilter()
    brass.type = 'sawtooth'
    brass.frequency.setValueAtTime(220, hit)
    brass.frequency.exponentialRampToValueAtTime(165, hit + 0.15)
    brassF.type = 'lowpass'
    brassF.frequency.setValueAtTime(800, hit)
    brassF.frequency.exponentialRampToValueAtTime(300, hit + 0.2)
    brassF.Q.value = 3
    brassG.gain.setValueAtTime(0, hit)
    brassG.gain.linearRampToValueAtTime(0.15, hit + 0.01)
    brassG.gain.exponentialRampToValueAtTime(0.001, hit + 0.25)
    brass.connect(brassF).connect(brassG).connect(ctx.destination)
    brass.start(hit); brass.stop(hit + 0.3)

    const shim = ctx.createOscillator()
    const shimG = ctx.createGain()
    const shimF = ctx.createBiquadFilter()
    shim.type = 'triangle'
    shim.frequency.setValueAtTime(2400, hit)
    shim.frequency.exponentialRampToValueAtTime(1600, hit + 0.4)
    shimF.type = 'highpass'
    shimF.frequency.value = 1200
    shimG.gain.setValueAtTime(0, hit)
    shimG.gain.linearRampToValueAtTime(0.06, hit + 0.03)
    shimG.gain.exponentialRampToValueAtTime(0.001, hit + 0.5)
    shim.connect(shimF).connect(shimG).connect(ctx.destination)
    shim.start(hit); shim.stop(hit + 0.6)

    const swell = ctx.createOscillator()
    const swellG = ctx.createGain()
    const swellF = ctx.createBiquadFilter()
    swell.type = 'sine'
    swell.frequency.setValueAtTime(80, now)
    swell.frequency.linearRampToValueAtTime(220, hit)
    swellF.type = 'lowpass'
    swellF.frequency.setValueAtTime(200, now)
    swellF.frequency.linearRampToValueAtTime(1200, hit)
    swellG.gain.setValueAtTime(0, now)
    swellG.gain.linearRampToValueAtTime(0.12, hit - 0.01)
    swellG.gain.exponentialRampToValueAtTime(0.001, hit)
    swell.connect(swellF).connect(swellG).connect(ctx.destination)
    swell.start(now); swell.stop(hit)
}

export default function HomeOpenSound() {
    useEffect(() => {
        if (typeof window === 'undefined') return
        let played = sessionStorage.getItem('agrieasy_open_sound') === '1'

        const onFirstClick = () => {
            if (played) return
            played = true
            sessionStorage.setItem('agrieasy_open_sound', '1')
            const ctx = getCtx()
            if (!ctx) return
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => setTimeout(() => playTaff(ctx), 30)).catch(() => {})
            } else {
                playTaff(ctx)
            }
        }

        document.addEventListener('click', onFirstClick, { once: true, passive: true })
        document.addEventListener('touchstart', onFirstClick, { once: true, passive: true })

        return () => {
            document.removeEventListener('click', onFirstClick)
            document.removeEventListener('touchstart', onFirstClick)
        }
    }, [])

    return null
}
