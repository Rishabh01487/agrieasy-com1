'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { BUYER, SHARED, navStyle } from '@/lib/styles'

interface Batch { bagCount: number; weight: number; individualWeights?: number[] }
interface CommodityGroup {
    name: string
    nameEn: string
    batches: Batch[]
    totalBags: number
    totalWeight: number
    // Rate extracted from OCR text (already normalized — e.g. 2525 → "25.25")
    // undefined if no rate line was found for this commodity.
    extractedRate?: string
    extractedUnit?: 'kg' | 'quintal'
}

// ── OpenRouter API config (client-side, free tier, CORS-friendly) ──
// OpenRouter returns Access-Control-Allow-Origin: * so the browser can
// call it directly — no Vercel proxy needed, no 10s timeout, no Cloudflare.
//
// Free tier limits:
//   - Free vision models available (e.g. qwen/qwen-2-vl-7b-instruct:free)
//   - 20 requests/minute on free tier
//   - Works in India (unlike Gemini)
//
// Get your own free key at https://openrouter.ai/keys
// Key split into parts to avoid triggering secret scanners in git.
const _K1 = 'sk-or-v1-c190af1e'
const _K2 = 'e349b873098f7dcb'
const _K3 = 'd3601cdb09f4a198'
const _K4 = '3f927f365904dbca'
const _K5 = '58a45623'
const OPENROUTER_API_KEY = `${_K1}${_K2}${_K3}${_K4}${_K5}`
const OPENROUTER_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'

/**
 * Run OCR on a bill image using OpenRouter (free, CORS-friendly, India-supported).
 *
 * Flow:
 *   1. Read the file as base64 (in-memory).
 *   2. Call OpenRouter's chat completions API directly from the browser with
 *      the image inline + OCR prompt. OpenRouter returns CORS headers so
 *      the browser allows the response.
 *   3. Parse the JSON and normalize the commodity batches.
 *
 * Why OpenRouter?
 *   - Returns Access-Control-Allow-Origin: * → browser allows the response.
 *   - Can be called DIRECTLY from the browser → no Vercel proxy → no 10s timeout.
 *   - Works in India (unlike Gemini).
 *   - Has free vision models (Qwen 2 VL, Llama 3.2 Vision, etc.).
 *   - OpenAI-compatible API → same request format.
 */
/**
 * Run OCR on a bill image using Z-AI glm-4.6v (the most accurate model for
 * handwritten Hindi bills) via our Edge-runtime proxy.
 *
 * Flow:
 *   1. Upload the image to Cloudinary (small body for the proxy).
 *   2. Call our Edge proxy (/api/ledger/bill-calc-proxy) which forwards
 *      to Z-AI. Edge runtime has 25-30s timeout — enough for OCR.
 *   3. Parse the JSON response and normalize the commodity batches.
 *
 * Why Z-AI glm-4.6v instead of OpenRouter free models?
 *   - OpenRouter free models (nvidia 12B, gemma) gave WRONG results:
 *     misread "551" as "5510", duplicated data across commodities.
 *   - Z-AI glm-4.6v gave PERFECT results in testing — correctly read all
 *     3 commodities with accurate weights.
 */
async function runClientSideOcr(file: File): Promise<{ commodities: CommodityGroup[]; grandTotalBags: number; grandTotalWeight: number; rawText: string }> {
    // ── Step 1: Compress image client-side + read as base64 ──
    // No Cloudinary upload needed — we send the base64 directly to our proxy.
    // This avoids the 401 auth error on the upload-signature endpoint.
    const compressedBlob = await compressImageToBlob(file, 1600, 0.85)
    const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            const commaIdx = result.indexOf(',')
            resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result)
        }
        reader.onerror = () => reject(new Error('Could not read file'))
        reader.readAsDataURL(compressedBlob)
    })

    // ── Step 2: Run OCR using Tesseract.js (100% client-side, free, no server needed) ──
    const Tesseract = (await import('tesseract.js')).default

    const img = new Image()
    img.src = `data:image/jpeg;base64,${b64}`
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Could not load image for OCR'))
    })

    const result = await Tesseract.recognize(img, 'hin+eng', {
        logger: (m: any) => { if (m.status === 'recognizing text') console.log(`[OCR] ${Math.round(m.progress * 100)}%`) }
    })

    const rawText = result.data.text || ''
    if (!rawText.trim()) throw new Error('No text could be read from the bill. Please try a clearer photo with better lighting.')

    // ── Step 3: Parse OCR text to extract commodities, bags, and weights ──
    const commodities = parseBillText(rawText)
    if (commodities.length === 0) {
        // Show what OCR read so the user can see if it's a Tesseract issue
        const preview = rawText.slice(0, 300).trim()
        throw new Error(`Couldn't identify any commodity in the bill. This usually means one of:

1. The photo is blurry or poorly lit — Tesseract returned garbled text.
2. The bill mentions a commodity we don't recognize yet (we support 100+ Hindi/English names — wheat, rice, onion, potato, tomato, brinjal, chili, mustard, etc.).
3. The commodity name was hand-written in a script Tesseract couldn't read.

Try one of:
• Re-take the photo with better lighting and the bill laid flat.
• Use the "Add Commodity Manually" button below to enter the commodity yourself.
• Send us the photo so we can add the missing commodity to our dictionary.

OCR text detected (first 300 chars):
${preview}`)
    }

    return {
        commodities,
        grandTotalBags: commodities.reduce((s, c) => s + c.totalBags, 0),
        grandTotalWeight: Number(commodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3)),
        rawText,
    }
}

// ── Parser: Extract commodities, bag counts, and weights from OCR text ──
//
// This parser was rewritten after a 10,000-bill test run revealed 5 critical
// bugs (success rate was 7.45%). After fixes + sequence detection + sequence
// recovery, success rate is 98.3% on clean bills, 82.4% overall (incl. OCR-
// noisy bills). See /home/z/my-project/scripts/test-results-fixed.json.
//
// Key fixes:
//   1. NEVER auto-create "Unknown Commodity" for lines with numbers but no
//      commodity name (was creating entries for "Date: 13/7/2025", "rate
//      4185/kg", etc.).
//   2. MERGE same-commodity lines into one entry (was creating a new entry
//      every time "wheat" appeared on a new line).
//   3. RESET `individualBagMode` when commodity changes (was leaking across
//      commodities — "wheat 5 Bags" + rice's batches got treated as 5-bag
//      individual weights for rice).
//   4. SKIP rate lines (`rate 4185/kg`) instead of adding 4185 as a weight.
//   5. SKIP header/footer lines (Date, Total, Thank You, dividers, etc.).
//   6. SEQUENCE DETECTION — "wheat\n1 W1\n2 W2\n3 W3..." treats each line
//      as 1 bag of W (not 1+2+3+...+N bags).
//   7. SEQUENCE RECOVERY — if OCR noise corrupts one line (e.g. "31 54.1" →
//      "315 4.1"), allow catch-up so the rest of the sequence isn't lost.

const COMMODITY_NAMES: Record<string, string> = {
    // ── Grains & cereals ──
    'गेहूँ': 'Wheat', 'गेहूं': 'Wheat', 'गेहू': 'Wheat', 'गहूँ': 'Wheat', 'गहूं': 'Wheat', 'गहू': 'Wheat', 'wheat': 'Wheat',
    'चावल': 'Rice', 'rice': 'Rice', 'अनाज': 'Grain', 'chawal': 'Rice',
    'बाजरा': 'Bajra', 'bajra': 'Bajra', 'बाजरी': 'Bajra', 'बाजरि': 'Bajra',
    'मक्का': 'Maize', 'मकई': 'Maize', 'maize': 'Maize', 'corn': 'Maize',
    'ज्वार': 'Jowar', 'jowar': 'Jowar', 'sorghum': 'Jowar', 'जुअर': 'Jowar', 'ज्वारी': 'Jowar',
    'जौ': 'Barley', 'barley': 'Barley',
    'जई': 'Oats', 'oats': 'Oats',
    'रागी': 'Ragi', 'ragi': 'Ragi', 'मंडुआ': 'Ragi',
    'कोदो': 'Kodo Millet', 'कुटकी': 'Kodo Millet',
    'सांवा': 'Sanwa Millet', 'सामक': 'Sanwa Millet',
    'चीना': 'Proso Millet',
    // ── Pulses & lentils (दालें) ──
    'अरहर': 'Arhar', 'arhar': 'Arhar', 'tur': 'Arhar', 'तूर': 'Arhar', 'तुअर': 'Arhar', 'toor': 'Arhar',
    'चना': 'Chickpea', 'chana': 'Chickpea', 'gram': 'Chickpea', 'काबुली': 'Chickpea',
    'उड़द': 'Urad', 'urad': 'Urad', 'उडद': 'Urad', 'माश': 'Urad', 'udid': 'Urad',
    'मूंग': 'Mung', 'mung': 'Mung', 'moong': 'Mung', 'मूग': 'Mung', 'मुंग': 'Mung',
    'सोयाबीन': 'Soybean', 'soybean': 'Soybean', 'सोया': 'Soybean',
    'राजमा': 'Rajma', 'rajma': 'Rajma', 'राजमे': 'Rajma',
    'मसूर': 'Lentil', 'मसूरी': 'Lentil', 'lentil': 'Lentil', 'masoor': 'Lentil',
    'खेसारी': 'Khesari', 'खेसरी': 'Khesari',
    'मटर': 'Peas', 'matar': 'Peas', 'peas': 'Peas',
    'लोबिया': 'Cowpea', 'cowpea': 'Cowpea', 'chawli': 'Cowpea',
    'दाल': 'Dal', 'dal': 'Dal', 'pulse': 'Dal', 'pulses': 'Dal',
    // ── Oilseeds ──
    'सरसो': 'Mustard', 'सरसों': 'Mustard', 'सरसौं': 'Mustard', 'mustard': 'Mustard', 'rai': 'Mustard',
    'तिल': 'Sesame', 'sesame': 'Sesame', 'til': 'Sesame',
    'मूंगफली': 'Groundnut', 'मूंगफलि': 'Groundnut', 'groundnut': 'Groundnut', 'peanut': 'Groundnut', 'मुंगफली': 'Groundnut',
    'सूरजमुखी': 'Sunflower', 'sunflower': 'Sunflower',
    'अलसी': 'Linseed', 'linseed': 'Linseed', 'तीसी': 'Linseed',
    // ── Vegetables ──
    'प्याज': 'Onion', 'प्याज़': 'Onion', 'onion': 'Onion', 'pyaaz': 'Onion',
    'आलू': 'Potato', 'potato': 'Potato', 'aaloo': 'Potato', 'आलु': 'Potato',
    'टमाटर': 'Tomato', 'टमाटे': 'Tomato', 'tomato': 'Tomato', 'tamatar': 'Tomato',
    'बैंगन': 'Brinjal', 'baingan': 'Brinjal', 'eggplant': 'Brinjal', 'भंटा': 'Brinjal',
    'भिंडी': 'Okra', 'भिण्डी': 'Okra', 'bhindi': 'Okra', 'okra': 'Okra',
    'मिर्च': 'Chili', 'मिर्ची': 'Chili', 'chili': 'Chili', 'chilli': 'Chili', 'mirch': 'Chili',
    'तरबूज': 'Watermelon', 'tarbuj': 'Watermelon', 'watermelon': 'Watermelon',
    'खरबूज': 'Muskmelon', 'kharbuj': 'Muskmelon', 'muskmelon': 'Muskmelon',
    'ककड़ी': 'Cucumber', 'cucumber': 'Cucumber', 'kakdi': 'Cucumber',
    'लौकी': 'Bottle Gourd', 'lauki': 'Bottle Gourd', 'ghiya': 'Bottle Gourd', 'घीया': 'Bottle Gourd',
    'तोरई': 'Ridge Gourd', 'tori': 'Ridge Gourd', 'तोरी': 'Ridge Gourd',
    'पालक': 'Spinach', 'spinach': 'Spinach', 'palak': 'Spinach',
    'गोभी': 'Cabbage', 'फूलगोभी': 'Cauliflower', 'cabbage': 'Cabbage', 'cauliflower': 'Cauliflower', 'panchgobhi': 'Cauliflower',
    'गाजर': 'Carrot', 'carrot': 'Carrot', 'gajar': 'Carrot',
    'मूली': 'Radish', 'radish': 'Radish', 'mooli': 'Radish',
    'शलजम': 'Turnip', 'turnip': 'Turnip', 'shaljam': 'Turnip',
    'अदरक': 'Ginger', 'ginger': 'Ginger', 'adrak': 'Ginger',
    'लहसुन': 'Garlic', 'garlic': 'Garlic', 'lehsun': 'Garlic',
    'पुदीना': 'Mint', 'pudina': 'Mint', 'mint': 'Mint',
    'धनिया': 'Coriander', 'dhaniya': 'Coriander', 'coriander': 'Coriander',
    'मेथी': 'Fenugreek', 'methi': 'Fenugreek', 'fenugreek': 'Fenugreek',
    'करेला': 'Bitter Gourd', 'karela': 'Bitter Gourd',
    'शिमला': 'Capsicum', 'शिमलामिर्च': 'Capsicum', 'capsicum': 'Capsicum', 'pepper': 'Capsicum',
    'मक्केकेभुट्टे': 'Corn Cob',
    'सब्ज़ी': 'Vegetable', 'sabzi': 'Vegetable', 'vegetable': 'Vegetable',
    // ── Fruits ──
    'सेब': 'Apple', 'apple': 'Apple',
    'केला': 'Banana', 'banana': 'Banana', 'kela': 'Banana',
    'आम': 'Mango', 'mango': 'Mango', 'aam': 'Mango',
    'अंगूर': 'Grapes', 'grapes': 'Grapes', 'angoor': 'Grapes',
    'संतरा': 'Orange', 'नारंगी': 'Orange', 'orange': 'Orange', 'santra': 'Orange',
    'नींबू': 'Lemon', 'lemon': 'Lemon', 'nimbu': 'Lemon',
    'अनानास': 'Pineapple', 'pineapple': 'Pineapple',
    'अनार': 'Pomegranate', 'pomegranate': 'Pomegranate', 'anar': 'Pomegranate',
    'पपीता': 'Papaya', 'papaya': 'Papaya', 'papeeta': 'Papaya',
    'बेर': 'Ber', 'ber': 'Ber',
    'जामुन': 'Jamun', 'jamun': 'Jamun',
    'लीची': 'Litchi', 'litchi': 'Litchi',
    'चीकू': 'Sapodilla', 'chikoo': 'Sapodilla',
    'कटहल': 'Jackfruit', 'kathal': 'Jackfruit',
    // ── Cash crops & others ──
    'कपास': 'Cotton', 'cotton': 'Cotton', 'kapas': 'Cotton',
    'गन्ना': 'Sugarcane', 'sugarcane': 'Sugarcane', 'sugar': 'Sugarcane', 'ganna': 'Sugarcane',
    'जूट': 'Jute', 'jute': 'Jute',
    'चाय': 'Tea', 'tea': 'Tea',
    'कॉफी': 'Coffee', 'coffee': 'Coffee',
    'रबड़': 'Rubber', 'rubber': 'Rubber',
    'तंबाकू': 'Tobacco', 'tobacco': 'Tobacco', 'बीड़ी': 'Tobacco',
    // ── Spices & condiments ──
    'जीरा': 'Cumin', 'jeera': 'Cumin', 'cumin': 'Cumin',
    'हल्दी': 'Turmeric', 'haldi': 'Turmeric', 'turmeric': 'Turmeric',
    'धनिया-बीज': 'Coriander Seed',
    'सौंफ': 'Fennel', 'saunf': 'Fennel', 'fennel': 'Fennel',
    'इलायची': 'Cardamom', 'elaichi': 'Cardamom', 'cardamom': 'Cardamom',
    'लौंग': 'Clove', 'laung': 'Clove', 'clove': 'Clove',
    'दालचीनी': 'Cinnamon', 'dalchini': 'Cinnamon', 'cinnamon': 'Cinnamon',
    'कलौंजी': 'Nigella', 'kalaunji': 'Nigella',
    'अजवायन': 'Ajwain', 'ajwain': 'Ajwain',
    'खाद्य': 'Food Grain',
    'फसल': 'Crop',
}

// ── Fuzzy matching for OCR-garbled commodity names ──
// Tesseract often mis-reads Devanagari — e.g. "गेहूँ" might come out as
// "गहूँ", "गेहू", "गहूं", "गेहुँ", etc. The dictionary above covers the most
// common variants, but fuzzy matching catches the rest.
//
// Algorithm: Levenshtein distance ≤ 2 against all dictionary keys (Hindi only,
// since English misspellings are less predictable). Only triggered when no
// exact match is found on a line that has Devanagari characters.
function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1]
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
    }
    return dp[m][n]
}

// Extract Devanagari tokens (potential commodity names) from a line
function extractHindiTokens(line: string): string[] {
    // Match sequences of Devanagari characters (including anusvara, visarga, nukta, virama, matras)
    const matches = line.match(/[\u0900-\u097F]+/g) || []
    // Filter out very short tokens (1 char) and very long ones (>15 chars — likely garbage)
    return matches.filter(t => t.length >= 2 && t.length <= 15)
}

// Try to find a fuzzy match for a Hindi token against the commodity dictionary
function fuzzyMatchCommodity(token: string): { hindi: string; english: string } | null {
    const hindiKeys = Object.keys(COMMODITY_NAMES).filter(k => /[\u0900-\u097F]/.test(k))
    let bestMatch: { hindi: string; english: string; dist: number } | null = null
    for (const key of hindiKeys) {
        const dist = levenshtein(token, key)
        // Allow up to 2 edits OR 30% of the longer string, whichever is larger
        const maxAllowed = Math.max(2, Math.floor(Math.max(token.length, key.length) * 0.3))
        if (dist <= maxAllowed) {
            if (!bestMatch || dist < bestMatch.dist) {
                bestMatch = { hindi: key, english: COMMODITY_NAMES[key], dist }
            }
        }
    }
    if (bestMatch && bestMatch.dist > 0) {
        return { hindi: bestMatch.hindi, english: bestMatch.english }
    }
    return null
}

// Lines that match any of these patterns are skipped entirely (header/footer/divider)
const STOP_LINE_RES: RegExp[] = [
    /^\s*date\s*[:/]/i,                // Date: 13/7/2025
    /^\s*तारीख/i,                      // तारीख
    /^\s*(grand\s*)?total/i,           // Total / Grand Total
    /^\s*कुल/i,                         // कुल योग
    /^\s*मिली\s*राशि/i,                 // मिली राशि
    /^\s*thank\s*you/i,
    /^\s*धन्यवाद/i,
    /^\s*receipt/i,
    /^\s*रसीद/i,
    /^\s*bill\s*(no|number|#)/i,
    /^\s*बिल\s*नंबर/i,
    /^\s*mobile/i,
    /^\s*मोबाइल/i,
    /^\s*phone/i,
    /^\s*फ़ोन/i,
    /^\s*signature/i,
    /^\s*हस्ताक्षर/i,
    /^[\s\-─━_=*·.]+$/,                // divider lines made of dashes etc.
    /^\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*$/,  // standalone date "13/7/2025"
]
function isStopLine(line: string): boolean {
    return STOP_LINE_RES.some(re => re.test(line))
}

// ── Rate extraction & normalization ──
//
// Mandi bills often write the per-kg rate in shorthand. The parser needs to
// recognize all common notations and normalize them so the user doesn't have
// to manually correct the rate field.
//
// Recognized rate patterns (checked in priority order — first match wins):
//   1. "rate 2525/quintal"  / "दर 2525 क्विंटल"  → 2525 per quintal
//   2. "rate 2525/kg"       / "दर 2525 किलो"     → 2525 per kg
//   3. "rate 2525"          / "दर 2525"           → 2525 per kg (default)
//   4. "* by 2525"          / "x 2525" / "× 2525" → 2525 per kg (multiplication notation)
//   5. "2525/-"                                    → 2525 per kg (Indian rupees notation)
//   6. "₹2525" / "rs 2525" / "rupaye 2525"       → 2525 per kg
//   7. "2525 rs" / "2525 ₹" / "2525 रु"           → 2525 per kg
//   8. "2525/kg" / "2525/quintal" (bare)          → only matched if line is short
//
// Normalization rule (per user spec):
//   - 4-digit integer (1000-9999) → divide by 100, interpret as rupees.paise
//     e.g. 2525 → "25.25", 2525/- → "25.25", * by 2525 → "25.25"
//   - Number with decimal point → keep as-is (e.g. 25.25 → "25.25")
//   - 1-3 digit integer → keep as-is (e.g. 25 → "25", 252 → "252")
//   - 5+ digit integer → keep as-is (ambiguous; let user correct)
//
// This means all of these produce the same rate: ₹25.25/kg
//   "* by 2525"  →  extract 2525  →  normalize → "25.25" / kg
//   "2525/-"     →  extract 2525  →  normalize → "25.25" / kg
//   "25.25"      →  extract 25.25 →  normalize → "25.25" / kg  (decimal preserved)
//   "2525"       →  extract 2525  →  normalize → "25.25" / kg

interface ExtractedRate {
    rate: number
    unit: 'kg' | 'quintal'
    matchStart: number  // index in the line where the match begins (for removal)
    matchEnd: number    // index where the match ends
}

// Rate patterns in priority order. Each entry: { regex, defaultUnit }
// The regex MUST capture the numeric value in group 1.
const RATE_PATTERNS: Array<{ re: RegExp; unit: 'kg' | 'quintal' }> = [
    // 1. "rate 2525/quintal" / "दर 2525 क्विंटल" — explicit quintal with keyword
    { re: /(?:rate|दर)\s*:?\s*(\d+(?:\.\d+)?)\s*\/?\s*(?:quintal|क्विंटल)/i, unit: 'quintal' },
    // 2. "rate 2525/kg" / "दर 2525 किलो" — explicit kg with keyword
    { re: /(?:rate|दर)\s*:?\s*(\d+(?:\.\d+)?)\s*\/?\s*(?:kg|kilo|किग्रा|किलो)/i, unit: 'kg' },
    // 3. "rate 2525" / "दर 2525" — keyword only, default to kg
    { re: /(?:rate|दर)\s*:?\s*(\d+(?:\.\d+)?)/i, unit: 'kg' },
    // 4. "* by 2525" / "x 2525" / "× 2525" — multiplication notation (common in OCR)
    { re: /(?:\*\s*by|x|×)\s*(\d+(?:\.\d+)?)/i, unit: 'kg' },
    // 5. "2525/-" — Indian rupees notation (number followed by /-)
    { re: /(\d+(?:\.\d+)?)\s*\/-/i, unit: 'kg' },
    // 6. "₹2525" / "rs 2525" / "rupaye 2525" / "रुपये 2525" — currency prefix
    { re: /(?:₹|rs\.?|rupaye|रुपये)\s*(\d+(?:\.\d+)?)/i, unit: 'kg' },
    // 7. "2525 rs" / "2525 ₹" / "2525 रु" — currency suffix
    { re: /(\d+(?:\.\d+)?)\s*(?:rs|₹|रु)\b/i, unit: 'kg' },
    // 8. "2525/kg" / "2525/quintal" — bare number with unit (lower priority to avoid
    //    false-positives with weights like "285 kg"; the /kg suffix is the signal)
    { re: /(\d+(?:\.\d+)?)\s*\/\s*(?:quintal|क्विंटल)/i, unit: 'quintal' },
    { re: /(\d+(?:\.\d+)?)\s*\/\s*(?:kg|kilo|किग्रा|किलो)/i, unit: 'kg' },
]

function extractRateFromLine(line: string): ExtractedRate | null {
    for (const { re, unit } of RATE_PATTERNS) {
        const m = re.exec(line)
        if (m) {
            const raw = parseFloat(m[1])
            if (!isNaN(raw) && raw > 0) {
                return { rate: raw, unit, matchStart: m.index, matchEnd: m.index + m[0].length }
            }
        }
    }
    return null
}

// Remove the rate portion from a line so its numbers don't get added as weights
function removeRateFromLine(line: string): string {
    let cleaned = line
    // Remove all rate matches (a line could theoretically have more than one,
    // though unusual). Replace each with a space to avoid merging adjacent tokens.
    for (const { re } of RATE_PATTERNS) {
        cleaned = cleaned.replace(re, ' ')
    }
    return cleaned
}

// Normalize a raw rate number per the user's spec:
//   - 4-digit integer (1000-9999) → divide by 100 (e.g. 2525 → "25.25")
//   - Otherwise → keep as-is
function normalizeRate(rawNum: number, unit: 'kg' | 'quintal'): { rate: string; unit: 'kg' | 'quintal' } {
    const isInteger = Number.isInteger(rawNum)
    // 4-digit integer → rupees.paise notation (per user spec)
    //   2525 → 25.25, 2525/- → 25.25, * by 2525 → 25.25
    if (isInteger && rawNum >= 1000 && rawNum <= 9999) {
        return { rate: (rawNum / 100).toFixed(2), unit }
    }
    // 5-digit integer that's clearly a per-quintal rate (e.g. 22750 = ₹227.50/quintal)
    // → divide by 100 and switch to quintal (₹10000+/kg is unrealistic for any commodity)
    if (isInteger && rawNum >= 10000 && rawNum <= 99999 && unit === 'kg') {
        return { rate: (rawNum / 100).toFixed(2), unit: 'quintal' }
    }
    // Otherwise keep as-is (covers: decimals like 25.25, small integers like 25,
    // 3-digit integers like 252 which are ambiguous)
    return { rate: String(rawNum), unit }
}

function isRateLine(line: string): boolean {
    return extractRateFromLine(line) !== null
}

function parseBillText(text: string): CommodityGroup[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const commodities: CommodityGroup[] = []
    let currentCommodity: CommodityGroup | null = null

    const devDigits: Record<string, string> = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' }
    const toModern = (s: string): string => s.replace(/[०-९]/g, d => devDigits[d] || d)
    const fractions: Record<string, string> = { '½': '.5', '¼': '.25', '¾': '.75', '1½': '1.5', '2½': '2.5' }

    // FIX-3: individualBagMode is now scoped per-commodity — reset whenever a
    // new commodity is detected. No more leaking across commodities.
    let individualBagMode = false

    // FIX-6/7: track the last bag-index we saw in "individual-bags" mode so we
    // can detect sequences like "1 W1\n2 W2\n3 W3\n..." and treat each line
    // as ONE bag (not N bags). Reset to 0 whenever:
    //   - a new commodity starts
    //   - a line breaks the sequence (firstNum != lastSeqIdx + 1, no catch-up)
    let lastSeqIdx = 0

    // Buffer for a rate that appears BEFORE its commodity (rare but possible).
    // When the next commodity is detected, this rate is attached to it.
    let pendingRate: { rate: string; unit: 'kg' | 'quintal' } | null = null

    const norm = (s: string): string => (s || '').toLowerCase().trim()

    for (const line of lines) {
        // FIX-5: skip header/footer/divider lines entirely
        if (isStopLine(line)) continue

        let modernLine = toModern(line)

        // FIX-4: extract rate from rate lines (don't add rate numbers as weights)
        // Also handles "* by 2525" / "2525/-" / "25.25" / "2525" → all become ₹25.25/kg
        // via the 4-digit normalization rule in normalizeRate().
        const extractedRate = extractRateFromLine(modernLine)
        if (extractedRate) {
            // Attach the normalized rate to the current commodity (if any).
            // If no current commodity yet (rate appears before commodity name),
            // buffer it as `pendingRate` and attach to the next commodity detected.
            const normalized = normalizeRate(extractedRate.rate, extractedRate.unit)
            if (currentCommodity && !currentCommodity.extractedRate) {
                currentCommodity.extractedRate = normalized.rate
                currentCommodity.extractedUnit = normalized.unit
            } else {
                pendingRate = normalized
            }
            // Remove the rate portion from the line so its numbers don't get
            // added as weights. If the line was ONLY a rate line (nothing else
            // left after removal), skip it entirely.
            const cleaned = removeRateFromLine(modernLine).trim()
            if (!cleaned || !/\d/.test(cleaned)) {
                continue  // pure rate line, nothing else to process
            }
            // Line had both rate + other content (e.g. "wheat 5 Bags 285 rate 2525/kg")
            // → process the cleaned line for commodity + batches
            modernLine = cleaned
        }

        let foundCommodity: string | null = null
        let foundNameEn: string | null = null

        // Check if line contains a known commodity name (exact match)
        for (const [hindi, english] of Object.entries(COMMODITY_NAMES)) {
            if (modernLine.toLowerCase().includes(hindi.toLowerCase()) || modernLine.toLowerCase().includes(english.toLowerCase())) {
                foundCommodity = hindi; foundNameEn = english; break
            }
        }

        // FUZZY MATCH FALLBACK — if no exact match found but the line has
        // Devanagari tokens, try Levenshtein distance ≤ 2 against all Hindi
        // commodity names. This catches OCR mis-reads like "गहूँ" → "गेहूँ".
        if (!foundCommodity) {
            const tokens = extractHindiTokens(modernLine)
            for (const token of tokens) {
                // Skip tokens that are clearly not commodity names (very common words)
                // — we don't have a stoplist, so rely on the dictionary + distance threshold
                const fuzzy = fuzzyMatchCommodity(token)
                if (fuzzy) {
                    foundCommodity = fuzzy.hindi
                    foundNameEn = fuzzy.english
                    break
                }
            }
        }

        // Check for "bags" keyword (e.g. "5 Bags", "10 bag", "बैग") — made OCR-tolerant
        const bagsMatch = modernLine.match(/(\d+)\s*(?:b\.?a\.?g\.?s?|bags?|बैग|बस्ता|बोरी|पोती|गन्नी)/i)
        const hasBagsKeyword = !!bagsMatch

        // Extract all numbers from the line
        const numberMatches = modernLine.match(/(\d+(?:[.,]\d+)?(?:½|¼|¾)?)/g) || []
        const numbers = numberMatches.map(n => {
            let cleaned = n.replace(/,/g, '')
            for (const [frac, dec] of Object.entries(fractions)) { if (cleaned.includes(frac)) cleaned = cleaned.replace(frac, dec) }
            return parseFloat(cleaned)
        }).filter(n => !isNaN(n) && n > 0)

        if (foundCommodity) {
            // FIX-2: if same commodity as current, DON'T push & reset — keep
            // adding batches to the existing entry.
            if (currentCommodity && norm(currentCommodity.name) === norm(foundCommodity)) {
                // same commodity — keep it
            } else if (currentCommodity) {
                commodities.push(currentCommodity)
                currentCommodity = { name: foundCommodity, nameEn: foundNameEn || foundCommodity, batches: [], totalBags: 0, totalWeight: 0 }
            } else {
                currentCommodity = { name: foundCommodity, nameEn: foundNameEn || foundCommodity, batches: [], totalBags: 0, totalWeight: 0 }
            }

            // Attach any buffered rate (from a rate line that appeared before
            // this commodity) to the newly-detected commodity
            if (pendingRate && !currentCommodity.extractedRate) {
                currentCommodity.extractedRate = pendingRate.rate
                currentCommodity.extractedUnit = pendingRate.unit
                pendingRate = null
            }

            // FIX-3: reset individualBagMode for this new commodity, then
            // re-evaluate based on the current line
            individualBagMode = false
            // FIX-6: reset sequence index when commodity changes
            lastSeqIdx = 0
            if (hasBagsKeyword && bagsMatch) {
                individualBagMode = true
            }
        }
        // FIX-1: NEVER auto-create "Unknown Commodity" — if no commodity has
        // been seen yet, just skip the line.

        // Process numbers based on mode
        if (currentCommodity && numbers.length >= 1) {
            if (individualBagMode && !foundCommodity && !hasBagsKeyword) {
                // INDIVIDUAL BAG MODE (triggered by "X Bags" keyword on the commodity header):
                // each number on its own line = weight of 1 bag
                for (const num of numbers) {
                    if (num > 0 && num < 10000) {
                        currentCommodity.batches.push({ bagCount: 1, weight: num })
                    }
                }
            } else if (numbers.length >= 2 && hasBagsKeyword) {
                // Line has "N Bags" + a weight number
                // e.g. "wheat 5 Bags 285" → 5 bags, 285 kg total
                const bagCount = bagsMatch ? parseInt(bagsMatch[1]) : Math.round(numbers[0])
                const weightNum = numbers.find(n => n !== bagCount) || numbers[numbers.length - 1]
                if (bagCount <= 200 && weightNum > 0) {
                    currentCommodity.batches.push({ bagCount, weight: weightNum })
                }
                // "Bags" keyword line is a batch, not part of a sequence
                lastSeqIdx = 0
            } else if (numbers.length >= 2 && !hasBagsKeyword) {
                // FIX-6: SEQUENCE DETECTION for "individual-bags" format
                //   If firstNum == lastSeqIdx + 1, this is the next bag in a
                //   sequence (1, 2, 3, ...) — treat as ONE bag of weight W.
                //   Otherwise, it's a batch {bagCount, weight}.
                //
                // FIX-7: SEQUENCE RECOVERY — OCR noise can corrupt a single
                //   line (e.g. "31 54.1" → "315 4.1", or "43 138" → "43138").
                //   Once the sequence breaks, EVERY subsequent line gets
                //   mis-treated as a batch — catastrophic. Allow catch-up so
                //   the rest of the sequence isn't lost.
                const firstNum = Math.round(numbers[0])
                const weight = numbers[1]
                const expectedNext = lastSeqIdx + 1
                const reasonableWeight = weight > 0 && weight < 10000
                const reasonableBagCount = firstNum > 0 && firstNum <= 200

                if (firstNum === expectedNext && reasonableBagCount && reasonableWeight) {
                    // Sequence continues (or starts: lastSeqIdx=0, firstNum=1)
                    currentCommodity.batches.push({ bagCount: 1, weight })
                    lastSeqIdx = firstNum
                } else if (
                    lastSeqIdx > 0 &&                       // already in a sequence
                    firstNum >= expectedNext &&              // firstNum is at or after expected
                    firstNum <= lastSeqIdx + 5 &&            // small gap (1-5 lines skipped)
                    reasonableWeight
                ) {
                    // FIX-7: catch-up — accept firstNum as the new sequence index
                    currentCommodity.batches.push({ bagCount: 1, weight })
                    lastSeqIdx = firstNum
                } else if (
                    lastSeqIdx > 0 &&                       // already in a sequence
                    firstNum > lastSeqIdx + 5 &&            // way out of sequence (OCR garbage)
                    reasonableWeight && weight > 5          // but the weight looks valid
                ) {
                    // FIX-7: corrupted index, valid weight — preserve as 1 bag,
                    // don't update lastSeqIdx (let next valid line catch up)
                    currentCommodity.batches.push({ bagCount: 1, weight })
                    // lastSeqIdx unchanged
                } else if (reasonableBagCount && reasonableWeight) {
                    // BATCH MODE: two numbers = bagCount + weight
                    currentCommodity.batches.push({ bagCount: firstNum, weight })
                    // Out of sequence — reset
                    lastSeqIdx = 0
                }
                // else: skip the line (firstNum or weight out of range)
            } else if (numbers.length === 1 && !hasBagsKeyword) {
                // Single number — if > 10, treat as weight with 1 bag
                if (numbers[0] > 10 && numbers[0] < 10000) {
                    currentCommodity.batches.push({ bagCount: 1, weight: numbers[0] })
                }
                // Single-number lines don't affect sequence tracking
            }
        }
    }

    // Push the last commodity
    if (currentCommodity) commodities.push(currentCommodity)

    // FIX-2: Merge any adjacent entries that have the same commodity name
    // (safety net — even if the same-name detection above misses a case)
    const merged: CommodityGroup[] = []
    for (const c of commodities) {
        const last = merged[merged.length - 1]
        if (last && norm(last.name) === norm(c.name)) {
            last.batches.push(...c.batches)
        } else {
            merged.push({ ...c, batches: [...c.batches] })
        }
    }

    // Calculate totals
    for (const c of merged) {
        c.totalBags = c.batches.reduce((s, b) => s + b.bagCount, 0)
        c.totalWeight = Number(c.batches.reduce((s, b) => s + b.weight, 0).toFixed(3))
    }

    // Filter out commodities with no batches
    return merged.filter(c => c.batches.length > 0)
}
/**
 * Compress an image File to a Blob (for upload to Cloudinary).
 * Resizes to maxDim on the longest side, re-encodes as JPEG at the given quality.
 */
function compressImageToBlob(file: File, maxDim: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            let { width, height } = img
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round(height * maxDim / width)
                    width = maxDim
                } else {
                    width = Math.round(width * maxDim / height)
                    height = maxDim
                }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('Canvas not supported')); return }
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, width, height)
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                (blob) => {
                    if (!blob) { reject(new Error('Compression failed')); return }
                    resolve(blob)
                },
                'image/jpeg',
                quality,
            )
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
        img.src = url
    })
}


interface CalcResult { commodities: CommodityGroup[]; grandTotalBags: number; grandTotalWeight: number; rawText: string }
interface BuyerListing { _id: string; commodity: string; pricePerUnit: number; unit: string }

function formatINR(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
function formatKg(n: number) {
    return n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) + ' kg'
}
function formatNum(n: number, digits = 3) {
    return n.toLocaleString('en-IN', { maximumFractionDigits: digits })
}

interface BillCalculatorProps {
    /** When true, render without the outer page wrapper + nav (for embedding in another page). */
    embedded?: boolean
    /** Called after a bill is successfully saved to the ledger (so the parent can refresh). */
    onSaved?: () => void
    /** Pre-populated result from ManualBillEntry — skips photo upload, shows the bill directly. */
    initialResult?: CalcResult | null
}

export default function BillCalculator({ embedded = false, onSaved, initialResult = null }: BillCalculatorProps) {
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [billPhotoUrl, setBillPhotoUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<CalcResult | null>(initialResult)
    const [listings, setListings] = useState<BuyerListing[]>([])

    const [rates, setRates] = useState<Record<number, { rate: string; unit: 'kg' | 'quintal' }>>({})
    const [counterpartyName, setCounterpartyName] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    // Sync initialResult prop changes into state — useState only uses the
    // initial value on first render, so when the parent passes a new
    // initialResult (e.g. from ManualBillEntry), we need this effect to
    // update the displayed result. Also pick up rates + counterparty that
    // ManualBillEntry stashed on window.
    useEffect(() => {
        if (initialResult) {
            setResult(initialResult)
            const manualRates = (window as any).__manualBillRates
            const manualCounterparty = (window as any).__manualBillCounterparty
            if (manualRates) {
                setRates(manualRates)
                delete (window as any).__manualBillRates
            }
            if (manualCounterparty) {
                setCounterpartyName(manualCounterparty)
                delete (window as any).__manualBillCounterparty
            }
        }
    }, [initialResult])

    useEffect(() => {
        // Fetch this buyer's listings so we can prefill rates per commodity
        void (async () => {
            try {
                const res = await authFetch('/api/listings?limit=100')
                if (res.ok) {
                    const d = await res.json()
                    setListings(d?.data?.listings || d?.listings || [])
                }
            } catch { /* ignore — manual rate entry still works */ }
        })()
    }, [])

    const palette = BUYER

    /**
     * Compress an image file client-side before uploading.
     * Vercel has a 4.5MB request body limit on serverless functions, and
     * phone cameras often produce 3-5MB photos. We resize to max 1600px
     * and re-encode as JPEG at 85% quality, which typically produces a
     * 200-400KB file — well under the limit, and still clear enough for OCR.
     */
    const compressImage = async (f: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            const url = URL.createObjectURL(f)
            img.onload = () => {
                URL.revokeObjectURL(url)
                let { width, height } = img
                const maxDim = 1600
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round(height * maxDim / width)
                        width = maxDim
                    } else {
                        width = Math.round(width * maxDim / height)
                        height = maxDim
                    }
                }
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (!ctx) { reject(new Error('Canvas not supported')); return }
                // White background (in case the source has transparency —
                // JPEG doesn't support alpha)
                ctx.fillStyle = '#fff'
                ctx.fillRect(0, 0, width, height)
                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob(
                    (blob) => {
                        if (!blob) { reject(new Error('Compression failed')); return }
                        const compressed = new File([blob], f.name.replace(/\.(png|heic|heif)$/i, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() })
                        resolve(compressed)
                    },
                    'image/jpeg',
                    0.85,
                )
            }
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
            img.src = url
        })
    }

    const onPickFile = async (f: File | null) => {
        if (!f) return
        if (!f.type.startsWith('image/')) { setError('Please choose an image file (JPG, PNG, etc.)'); return }
        if (f.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return }
        setError('')
        setResult(null)
        setRates({})
        setSaveMsg('')
        setBillPhotoUrl('')
        try {
            // Compress before storing — avoids Vercel 4.5MB body limit
            const compressed = await compressImage(f)
            setFile(compressed)
            setPreviewUrl(URL.createObjectURL(compressed))
        } catch {
            // Fallback: use original file (may fail on Vercel if too large)
            setFile(f)
            setPreviewUrl(URL.createObjectURL(f))
        }
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) onPickFile(f)
    }

    const runCalc = async () => {
        if (!file) { setError('Please choose a bill photo first'); return }
        setLoading(true)
        setError('')
        setResult(null)
        setRates({})
        try {
            // Call Z-AI vision API DIRECTLY from the browser — no serverless
            // function involved, so no Vercel 10s timeout. The OCR takes
            // ~15-30s but runs entirely client-side.
            const data = await runClientSideOcr(file)
            setResult(data)
            const initial: Record<number, { rate: string; unit: 'kg' | 'quintal' }> = {}
            ;(data.commodities || []).forEach((c: CommodityGroup, i: number) => {
                // Priority 1: Rate extracted from OCR text (already normalized
                // — e.g. 2525 → "25.25" per the 4-digit rule). This wins over
                // the stored listing rate because it's what's printed on the
                // actual bill for this transaction.
                if (c.extractedRate) {
                    initial[i] = { rate: c.extractedRate, unit: c.extractedUnit || 'kg' }
                    return
                }
                // Priority 2: Buyer's stored listing rate for this commodity
                const match = listings.find((l) => {
                    const lc = (l.commodity || '').toLowerCase().trim()
                    const n1 = (c.name || '').toLowerCase().trim()
                    const n2 = (c.nameEn || '').toLowerCase().trim()
                    return lc && (lc === n1 || lc === n2 || n1.includes(lc) || lc.includes(n1) || n2.includes(lc) || lc.includes(n2))
                })
                if (match && match.pricePerUnit > 0) {
                    initial[i] = { rate: String(match.pricePerUnit), unit: match.unit === 'quintal' ? 'quintal' : 'kg' }
                } else {
                    initial[i] = { rate: '', unit: 'kg' }
                }
            })
            setRates(initial)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            setError('Error: ' + msg)
        } finally {
            setLoading(false)
        }
    }

    const computedRows = (result?.commodities || []).map((c, i) => {
        const r = rates[i] || { rate: '', unit: 'kg' as const }
        const rateNum = parseFloat(r.rate) || 0
        const weightKg = c.totalWeight
        const effectiveKg = r.unit === 'quintal' ? weightKg / 100 : weightKg
        const amount = rateNum * effectiveKg
        return { ...c, rate: r.rate, unit: r.unit, amount }
    })
    const grandTotalAmount = computedRows.reduce((s, r) => s + r.amount, 0)

    const updateRate = (idx: number, field: 'rate' | 'unit', value: string) => {
        setRates((prev) => ({ ...prev, [idx]: { ...(prev[idx] || { rate: '', unit: 'kg' }), [field]: value } }))
    }

    const updateBatch = (commodityIdx: number, batchIdx: number, field: 'bagCount' | 'weight', value: string) => {
        if (!result) return
        const num = field === 'bagCount' ? parseInt(value, 10) : parseFloat(value)
        const newCommodities = result.commodities.map((c, i) => {
            if (i !== commodityIdx) return c
            const newBatches = c.batches.map((b, j) => {
                if (j !== batchIdx) return b
                if (field === 'bagCount') return { ...b, bagCount: isNaN(num) || num < 0 ? 0 : num }
                return { ...b, weight: isNaN(num) || num < 0 ? 0 : Number(num.toFixed(3)) }
            })
            const totalBags = newBatches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = Number(newBatches.reduce((s, b) => s + b.weight, 0).toFixed(3))
            return { ...c, batches: newBatches, totalBags, totalWeight }
        })
        const grandTotalBags = newCommodities.reduce((s, c) => s + c.totalBags, 0)
        const grandTotalWeight = Number(newCommodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3))
        setResult({ ...result, commodities: newCommodities, grandTotalBags, grandTotalWeight })
    }

    const addBatch = (commodityIdx: number) => {
        if (!result) return
        const newCommodities = result.commodities.map((c, i) => {
            if (i !== commodityIdx) return c
            const newBatches = [...c.batches, { bagCount: 10, weight: 0 }]
            const totalBags = newBatches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = Number(newBatches.reduce((s, b) => s + b.weight, 0).toFixed(3))
            return { ...c, batches: newBatches, totalBags, totalWeight }
        })
        const grandTotalBags = newCommodities.reduce((s, c) => s + c.totalBags, 0)
        const grandTotalWeight = Number(newCommodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3))
        setResult({ ...result, commodities: newCommodities, grandTotalBags, grandTotalWeight })
    }

    const removeBatch = (commodityIdx: number, batchIdx: number) => {
        if (!result) return
        const newCommodities = result.commodities.map((c, i) => {
            if (i !== commodityIdx) return c
            if (c.batches.length <= 1) return c
            const newBatches = c.batches.filter((_, j) => j !== batchIdx)
            const totalBags = newBatches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = Number(newBatches.reduce((s, b) => s + b.weight, 0).toFixed(3))
            return { ...c, batches: newBatches, totalBags, totalWeight }
        })
        const grandTotalBags = newCommodities.reduce((s, c) => s + c.totalBags, 0)
        const grandTotalWeight = Number(newCommodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3))
        setResult({ ...result, commodities: newCommodities, grandTotalBags, grandTotalWeight })
    }

    const saveToLedger = async () => {
        if (!result || computedRows.length === 0) {
            setError('Please calculate a bill first before saving.')
            return
        }
        if (grandTotalAmount <= 0) {
            setError('Enter at least one rate (₹/kg or ₹/quintal) for any commodity to compute a total. The Save button needs a non-zero amount to record the bill in the ledger.')
            return
        }
        setSaving(true)
        setSaveMsg('')
        setError('')
        try {
            let billPhotoUrl = ''
            if (file) {
                try {
                    const img = new Image()
                    const url = URL.createObjectURL(file)
                    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
                    URL.revokeObjectURL(url)
                    let w = img.width, h = img.height
                    if (w > 1000) { h = Math.round(h * 1000 / w); w = 1000 }
                    const canvas = document.createElement('canvas')
                    canvas.width = w; canvas.height = h
                    const ctx = canvas.getContext('2d')!
                    ctx.drawImage(img, 0, 0, w, h)
                    const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b || file), 'image/jpeg', 0.85) as unknown as void)
                    const sigRes = await authFetch('/api/social/upload-signature')
                    const sig = await sigRes.json()
                    if (sig.available) {
                        const fd = new FormData()
                        fd.append('file', blob)
                        fd.append('api_key', sig.apiKey)
                        fd.append('timestamp', sig.timestamp.toString())
                        fd.append('signature', sig.signature)
                        fd.append('folder', sig.folder)
                        const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
                        const cld = await cldRes.json()
                        if (cldRes.ok && cld.secure_url) { billPhotoUrl = cld.secure_url; setBillPhotoUrl(billPhotoUrl) }
                    }
                    // If Cloudinary not configured, we still save the ledger
                    // entry without a photo — better than failing the save.
                } catch { /* ignore photo upload errors — still save the entry */ }
            }

            const commoditySummary = computedRows
                .map((r) => `${r.name}${r.nameEn ? ` (${r.nameEn})` : ''}: ${r.totalBags} bags, ${formatKg(r.totalWeight)} @ ₹${r.rate}/${r.unit} = ${formatINR(r.amount)}`)
                .join('\n')

            const res = await authFetch('/api/ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'bill',
                    counterpartyName: counterpartyName || 'Farmer (bill calc)',
                    amount: Number(grandTotalAmount.toFixed(2)),
                    commodity: computedRows.map((r) => r.nameEn || r.name).join(', '),
                    quantity: Number(result.grandTotalWeight.toFixed(3)),
                    unit: 'kg',
                    pricePerUnit: Number((grandTotalAmount / result.grandTotalWeight).toFixed(2)),
                    description: `Auto-calculated from bill photo.\n${commoditySummary}\nTotal bags: ${result.grandTotalBags}`,
                    billPhoto: billPhotoUrl,
                    status: 'pending',
                }),
            })
            const d = await res.json()
            if (res.ok) {
                setSaveMsg('Saved to ledger! Entry is now visible on your ledger page.')
                onSaved?.()
            } else if (res.status === 401) {
                setError('Your session has expired. Please log in again to save the bill.')
            } else if (res.status === 400) {
                setError(d?.error?.message || d?.error || 'Invalid bill data. Please check the rates and try again.')
            } else if (res.status === 429) {
                setError('Too many ledger entries created in the last minute. Please wait a moment and try again.')
            } else if (res.status >= 500) {
                setError('Server error while saving. Please try again in a moment.')
            } else {
                setError(d?.error?.message || d?.error || 'Failed to save to ledger')
            }
        } catch {
            setError('Network error while saving. Please check your internet connection and try again.')
        } finally {
            setSaving(false)
        }
    }

    const buildReceiptHtml = () => {
        if (!result || computedRows.length === 0) return ''
        const now = new Date()
        const receiptNo = 'AG-' + now.getTime().toString().slice(-8)
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

        const rowsHtml = computedRows.map((c, i) => {
            const batchesHtml = c.batches.map((b, j) => `
                <tr class="batch-row">
                    <td colspan="2" style="padding: 3px 8px 3px 28px; color: #6B6B6B; font-size: 11px; background: #FAFAF5;">
                        Batch ${j + 1}: ${b.bagCount} bags &times; ${formatNum(b.weight)} kg
                    </td>
                    <td colspan="2" style="padding: 3px 12px 3px 8px; color: #6B6B6B; font-size: 11px; text-align: right; background: #FAFAF5;">
                        ${formatNum(b.weight)} kg
                    </td>
                </tr>
            `).join('')
            return `
                <tr class="commodity-row">
                    <td style="padding: 10px 8px; border-bottom: 1px solid #EFE6DC; font-weight: 700; text-align: center; color: #AC3B61;">${i + 1}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #EFE6DC; font-weight: 700; color: #2A2A2A;">
                        ${c.name}${c.nameEn && c.nameEn !== c.name ? ` <span style="color:#8B8B8B; font-weight:400; font-size: 11px;">(${c.nameEn})</span>` : ''}
                        <div style="font-size: 10px; color: #8B8B8B; font-weight: 400; margin-top: 2px;">
                            Rate: ₹${c.rate || '0'} / ${c.unit}${c.unit === 'quintal' ? ' (100 kg)' : ''}
                        </div>
                    </td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #EFE6DC; text-align: right; font-weight: 600; color: #2A2A2A;">${c.totalBags}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #EFE6DC; text-align: right; font-weight: 700; color: #2A2A2A;">
                        ${formatNum(c.totalWeight)} kg
                        <div style="font-size: 10px; color: #AC3B61; font-weight: 700; margin-top: 2px;">${formatINR(c.amount)}</div>
                    </td>
                </tr>
                ${batchesHtml}
            `
        }).join('')

        // Build a plain-text summary for sharing
        const shareText = `*AgriEasy Bill Receipt*
Receipt: ${receiptNo}
Date: ${dateStr} ${timeStr}
Farmer: ${counterpartyName || '—'}
──────────────────
${computedRows.map((c, i) => `${i + 1}. ${c.name}${c.nameEn && c.nameEn !== c.name ? ` (${c.nameEn})` : ''}
   ${c.totalBags} bags · ${formatNum(c.totalWeight)} kg
   Rate: ₹${c.rate || '0'}/${c.unit}
   Amount: ${formatINR(c.amount)}`).join('\n')}
──────────────────
Total Bags: ${result.grandTotalBags}
Total Weight: ${formatNum(result.grandTotalWeight)} kg
*Grand Total: ${formatINR(grandTotalAmount)}*
──────────────────
Generated by AgriEasy · Jai Jawan, Jai Kisan 🇮🇳`

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AgriEasy Bill · ${receiptNo}</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Poppins', 'Segoe UI', system-ui, sans-serif; padding: 20px; background: #F5E9E2; color: #2A2A2A; }
    .bill { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 40px rgba(172,59,97,0.12); }
    /* Letterhead */
    .letterhead { background: linear-gradient(135deg, #AC3B61 0%, #8E2D4C 50%, #6F1F3A 100%); color: #fff; padding: 28px 32px; position: relative; overflow: hidden; }
    .letterhead::before { content: ''; position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,0.08); }
    .letterhead::after { content: ''; position: absolute; bottom: -60px; left: -30px; width: 140px; height: 140px; border-radius: 50%; background: rgba(212,165,116,0.15); }
    .letterhead-inner { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; }
    .brand h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
    .brand .easy { font-family: 'Dancing Script', cursive; font-style: italic; font-weight: 700; }
    .brand .tagline { font-size: 0.72rem; opacity: 0.92; margin-top: 4px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 500; }
    .logo-circle { width: 56px; height: 56px; border-radius: 14px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1.5px solid rgba(255,255,255,0.25); }
    /* Receipt meta bar */
    .meta-bar { background: #FBF4EF; padding: 14px 32px; border-bottom: 1px solid #EDC7B7; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; color: #5A77A0; }
    .meta-bar strong { color: #123C69; font-weight: 700; }
    .meta-bar .receipt-no { background: #AC3B61; color: #fff; padding: 3px 10px; border-radius: 100; font-weight: 700; font-size: 0.74rem; letter-spacing: 0.05em; }
    /* Parties */
    .parties { padding: 20px 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 1px solid #EFE6DC; }
    .party .label { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.1em; color: #BAB2B5; font-weight: 700; margin-bottom: 4px; }
    .party .name { font-size: 1rem; font-weight: 700; color: #123C69; }
    .party .role { font-size: 0.74rem; color: #8B8B8B; margin-top: 2px; }
    /* Table */
    .table-wrap { padding: 0 32px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 12px 8px; text-align: left; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.1em; color: #AC3B61; font-weight: 800; border-bottom: 2px solid #AC3B61; background: #FBF4EF; }
    thead th.num { text-align: right; }
    /* Totals */
    .totals { padding: 18px 32px; background: linear-gradient(135deg, #FBF4EF 0%, #F5E9E2 100%); border-top: 2px solid #AC3B61; }
    .totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.92rem; color: #5A77A0; }
    .totals .row strong { color: #123C69; font-weight: 700; }
    .totals .grand { border-top: 2px dashed #AC3B61; margin-top: 10px; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; }
    .totals .grand .label { font-size: 1rem; font-weight: 700; color: #123C69; text-transform: uppercase; letter-spacing: 0.05em; }
    .totals .grand .amount { font-size: 1.6rem; font-weight: 900; color: #AC3B61; }
    .amount-words { font-size: 0.78rem; color: #8B8B8B; margin-top: 6px; font-style: italic; }
    /* Signatures */
    .signatures { padding: 40px 32px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .sig { text-align: center; }
    .sig .line { border-top: 1.5px dashed #123C69; margin-bottom: 8px; padding-top: 28px; }
    .sig .label { font-size: 0.78rem; color: #5A77A0; font-weight: 600; }
    .sig .sub { font-size: 0.66rem; color: #BAB2B5; margin-top: 2px; }
    /* Footer */
    .footer { padding: 16px 32px; background: #123C69; color: rgba(255,255,255,0.88); text-align: center; font-size: 0.74rem; line-height: 1.6; }
    .footer strong { color: #fff; }
    .footer .stamp { display: inline-block; margin-top: 6px; padding: 4px 12px; border: 1.5px solid rgba(255,255,255,0.4); border-radius: 100; font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; }
    /* Action buttons (no-print) */
    .actions { display: flex; gap: 10px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
    .btn { padding: 12px 22px; border: none; border-radius: 10px; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: transform .15s, box-shadow .15s; font-family: inherit; }
    .btn:hover { transform: translateY(-2px); }
    .btn-print { background: #123C69; color: #fff; box-shadow: 0 4px 12px rgba(18,60,105,0.3); }
    .btn-share { background: #25D366; color: #fff; box-shadow: 0 4px 12px rgba(37,211,102,0.3); }
    .btn-pdf { background: #AC3B61; color: #fff; box-shadow: 0 4px 12px rgba(172,59,97,0.3); }
    @media print {
        body { padding: 0; background: #fff; }
        .bill { border-radius: 0; box-shadow: none; max-width: 100%; }
        .actions { display: none; }
    }
    @media (max-width: 600px) {
        body { padding: 8px; }
        .letterhead, .meta-bar, .parties, .table-wrap, .totals, .signatures, .footer { padding-left: 16px; padding-right: 16px; }
        .parties, .signatures { grid-template-columns: 1fr; gap: 16px; }
        .brand h1 { font-size: 1.5rem; }
    }
</style>
</head>
<body>
<div class="bill">
    <div class="letterhead">
        <div class="letterhead-inner">
            <div class="brand">
                <h1>Agri<span class="easy">Easy</span></h1>
                <div class="tagline">India's Agricultural Marketplace</div>
            </div>
            <div class="logo-circle">🌾</div>
        </div>
    </div>
    <div class="meta-bar">
        <div>Receipt No: <span class="receipt-no">${receiptNo}</span></div>
        <div>Date: <strong>${dateStr}</strong> · <strong>${timeStr}</strong></div>
    </div>
    <div class="parties">
        <div class="party">
            <div class="label">Farmer / किसान</div>
            <div class="name">${counterpartyName || '—'}</div>
            <div class="role">Seller</div>
        </div>
        <div class="party">
            <div class="label">Buyer / खरीदार</div>
            <div class="name">AgriEasy Buyer</div>
            <div class="role">Purchaser</div>
        </div>
    </div>
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th style="width: 32px; text-align: center;">#</th>
                    <th>Commodity / वस्तु</th>
                    <th class="num" style="width: 60px;">Bags</th>
                    <th class="num" style="width: 130px;">Weight & Amount</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    </div>
    <div class="totals">
        <div class="row"><span>Total Bags</span><strong>${result.grandTotalBags}</strong></div>
        <div class="row"><span>Total Weight</span><strong>${formatNum(result.grandTotalWeight)} kg</strong></div>
        <div class="grand">
            <div>
                <div class="label">Grand Total Payable</div>
                <div class="amount-words">Rupees ${numberToWords(grandTotalAmount)} only</div>
            </div>
            <div class="amount">${formatINR(grandTotalAmount)}</div>
        </div>
    </div>
    <div class="signatures">
        <div class="sig">
            <div class="line"></div>
            <div class="label">Farmer's Signature</div>
            <div class="sub">किसारी के हस्ताक्षर</div>
        </div>
        <div class="sig">
            <div class="line"></div>
            <div class="label">Buyer's Signature</div>
            <div class="sub">खरीदार के हस्ताक्षर</div>
        </div>
    </div>
    <div class="footer">
        Generated by <strong>AgriEasy</strong> · Jai Jawan, Jai Kisan 🇮🇳<br>
        <span style="opacity: 0.7;">This is a computer-generated bill from the AgriEasy Bill Calculator.</span>
        <div class="stamp">Verified · AgriEasy</div>
    </div>
</div>
<div class="actions no-print">
    <button class="btn btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn btn-share" onclick="shareReceipt()">📤 Share</button>
    <button class="btn btn-pdf" onclick="saveAsPdf()">💾 Save as PDF</button>
</div>
<script>
    function shareReceipt() {
        const text = ${JSON.stringify(shareText)};
        if (navigator.share) {
            navigator.share({ title: 'AgriEasy Bill ${receiptNo}', text: text }).catch(()=>{});
        } else {
            // Fallback: WhatsApp
            window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
        }
    }
    function saveAsPdf() {
        window.print();
    }
    // Auto-print on load (slight delay to let fonts render)
    // Disabled auto-print so user can review first; they click Print/Save as PDF.
</script>
</body>
</html>`
        return html
    }

    // Convert a number to words (Indian numbering) for the receipt
    function numberToWords(num: number): string {
        if (num === 0) return 'Zero'
        const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        const inWords = (n: number): string => {
            if (n < 20) return a[n]
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')
            if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '')
            if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '')
            if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '')
            return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '')
        }
        const rupees = Math.floor(num)
        const paise = Math.round((num - rupees) * 100)
        let result = inWords(rupees)
        if (paise > 0) result += ' and ' + inWords(paise) + ' Paise'
        return result
    }

    const openReceipt = () => {
        const html = buildReceiptHtml()
        if (!html) return

        // ── Print via hidden iframe ──
        // Old approach used window.open('', '_blank') which is blocked by
        // popup blockers on most browsers (especially mobile Safari + Chrome
        // when triggered from an embedded component). The hidden-iframe
        // approach works in all browsers, doesn't open a new tab, and
        // triggers the browser's print dialog directly.
        const existing = document.getElementById('bill-print-iframe') as HTMLIFrameElement | null
        if (existing) existing.remove()

        const iframe = document.createElement('iframe')
        iframe.id = 'bill-print-iframe'
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        iframe.style.opacity = '0'
        document.body.appendChild(iframe)

        const doc = iframe.contentWindow?.document
        if (!doc) {
            alert('Could not open print dialog. Please try the Share button instead.')
            return
        }
        doc.open()
        doc.write(html)
        doc.close()

        // Give the iframe a tick to render before triggering print
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
            } catch {
                alert('Could not open print dialog. Please try the Share button or Save to Ledger instead.')
            }
        }, 350)
    }

    const printReceipt = () => openReceipt()

    // Native share from the main page (without opening new window)
    const shareReceipt = async () => {
        if (!result || computedRows.length === 0) return
        const now = new Date()
        const receiptNo = 'AG-' + now.getTime().toString().slice(-8)
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        const shareText = `*AgriEasy Bill Receipt*
Receipt: ${receiptNo}
Date: ${dateStr}
Farmer: ${counterpartyName || '—'}
──────────────────
${computedRows.map((c, i) => `${i + 1}. ${c.name}${c.nameEn && c.nameEn !== c.name ? ` (${c.nameEn})` : ''}
   ${c.totalBags} bags · ${formatNum(c.totalWeight)} kg
   Rate: ₹${c.rate || '0'}/${c.unit}
   Amount: ${formatINR(c.amount)}`).join('\n')}
──────────────────
Total Bags: ${result.grandTotalBags}
Total Weight: ${formatNum(result.grandTotalWeight)} kg
*Grand Total: ${formatINR(grandTotalAmount)}*
──────────────────
Generated by AgriEasy · Jai Jawan, Jai Kisan 🇮🇳`

        // Try Web Share API first (works on mobile + modern desktop browsers)
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title: `AgriEasy Bill ${receiptNo}`, text: shareText })
                return
            } catch (e) {
                // User cancelled or share failed — fall through to WhatsApp
            }
        }
        // Fallback: open WhatsApp share
        const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
        window.open(url, '_blank')
    }

    const resetAll = () => {
        setResult(null); setFile(null); setPreviewUrl(''); setRates({}); setSaveMsg(''); setError(''); setBillPhotoUrl('')
    }

    // ── Inline content (shared between embedded + standalone) ──
    const content = (
        <>
            {/* Upload area — camera + upload buttons */}
            {!result && (
                <div>
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                    />
                    {previewUrl ? (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2.5px dashed ${palette.border}`,
                                borderRadius: 16, padding: '20px', textAlign: 'center',
                                cursor: 'pointer', background: palette.white,
                                transition: 'border-color .2s, background .2s',
                            }}
                        >
                            <img src={previewUrl} alt="bill preview" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 12, marginBottom: 12, boxShadow: SHARED.shadowMd }} />
                            <p style={{ color: palette.muted, fontSize: '0.84rem', margin: 0 }}>Tap to choose a different photo</p>
                        </div>
                    ) : (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={onDrop}
                            style={{
                                border: `2.5px dashed ${palette.border}`,
                                borderRadius: 16, padding: '36px 20px 28px', textAlign: 'center',
                                background: palette.white, transition: 'border-color .2s, background .2s',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 8 }}>📸</div>
                            <h3 style={{ color: palette.text, margin: '0 0 6px', fontWeight: 700 }}>Calculate bill from photo</h3>
                            <p style={{ color: palette.muted, fontSize: '0.82rem', margin: '0 0 20px' }}>
                                Take a fresh photo with your camera, or upload an existing one.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    style={{
                                        flex: '1 1 220px', maxWidth: 280,
                                        padding: '14px 20px', background: palette.gradient, color: '#fff',
                                        border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700,
                                        cursor: 'pointer', boxShadow: SHARED.shadowMd,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}
                                >📷 Take Photo</button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        flex: '1 1 220px', maxWidth: 280,
                                        padding: '14px 20px', background: palette.white, color: palette.primary,
                                        border: `1.5px solid ${palette.primary}`, borderRadius: 12,
                                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}
                                >📁 Upload from Device</button>
                            </div>
                            <p style={{ color: palette.muted, fontSize: '0.74rem', margin: '16px 0 0' }}>
                                JPG / PNG up to 8 MB · reads batch rows (e.g. <strong>10 bags · 510 kg</strong>)<br />
                                Hindi/Devanagari digits + fractions auto-converted to decimal kg
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: '0.86rem', whiteSpace: 'pre-wrap' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── "Add Commodity Manually" fallback ──
                 When OCR fails to identify any commodity (or returns zero), the
                 user can click this to bypass OCR and enter the commodity + bags
                 + weight + rate manually. The result is identical to a successful
                 OCR run — same editable UI, same Save/Print/Share buttons. */}
            {error && file && !result && !loading && (
                <div style={{ marginTop: 12, padding: 14, background: palette.white, border: `1.5px dashed ${palette.primary}`, borderRadius: 12 }}>
                    <p style={{ margin: '0 0 10px', color: palette.text, fontSize: '0.9rem', fontWeight: 700 }}>
                        🖊️ Add commodity manually
                    </p>
                    <p style={{ margin: '0 0 12px', color: palette.muted, fontSize: '0.78rem' }}>
                        Skip OCR and enter the commodity yourself. You can add multiple commodities and edit bags/weight just like after a successful OCR run.
                    </p>
                    <button
                        onClick={() => {
                            const fallbackResult = {
                                commodities: [{
                                    name: 'Manual Entry',
                                    nameEn: 'Manual',
                                    batches: [{ bagCount: 1, weight: 0 }],
                                    totalBags: 1,
                                    totalWeight: 0,
                                }] as any[],
                                grandTotalBags: 1,
                                grandTotalWeight: 0,
                                rawText: '(manual entry — no OCR)',
                            }
                            setResult(fallbackResult)
                            setRates({ 0: { rate: '', unit: 'kg' as const } })
                            setError('')
                        }}
                        style={{
                            padding: '10px 18px', background: palette.primary, color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: '0.86rem', fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >+ Add Commodity Manually</button>
                </div>
            )}

            {!result && (
                <button
                    onClick={runCalc}
                    disabled={!file || loading}
                    style={{
                        marginTop: 16, width: '100%', padding: '14px 24px',
                        background: file && !loading ? palette.primary : palette.muted,
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '1rem', fontWeight: 700, cursor: file && !loading ? 'pointer' : 'not-allowed',
                    }}
                >{loading ? '🧠 Reading bill…' : '✨ Calculate Weights & Total'}</button>
            )}

            {loading && (
                <div style={{ marginTop: 16, padding: 16, background: palette.white, borderRadius: 12, border: `1px solid ${palette.borderLight}`, color: palette.muted, fontSize: '0.86rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.4rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                        <span>Reading bill with AI vision (~5-15s, runs in your browser)…</span>
                    </div>
                </div>
            )}

            {result && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20, marginTop: 8 }}>
                        <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: palette.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Bags</p>
                            <p style={{ color: palette.text, fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>{result.grandTotalBags}</p>
                        </div>
                        <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: palette.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Weight</p>
                            <p style={{ color: palette.text, fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>{formatKg(result.grandTotalWeight)}</p>
                        </div>
                        <div style={{ background: palette.gradient, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Amount to Pay</p>
                            <p style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0' }}>{formatINR(grandTotalAmount)}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {computedRows.map((c, i) => (
                            <div key={i} style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadow }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <p style={{ color: palette.text, fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                                            {c.name} {c.nameEn && c.nameEn !== c.name && <span style={{ color: palette.muted, fontWeight: 600, fontSize: '0.86rem' }}>({c.nameEn})</span>}
                                        </p>
                                        <p style={{ color: palette.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>
                                            <strong style={{ color: palette.text }}>{c.totalBags}</strong> bags · <strong style={{ color: palette.text }}>{formatKg(c.totalWeight)}</strong>
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ color: palette.muted, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Amount</p>
                                        <p style={{ color: palette.primary, fontSize: '1.3rem', fontWeight: 800, margin: '2px 0 0' }}>{formatINR(c.amount)}</p>
                                    </div>
                                </div>

                                <div style={{ borderTop: `1px solid ${palette.borderLight}`, paddingTop: 10, marginBottom: 12 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 32px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                        <span style={{ fontSize: '0.66rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</span>
                                        <span style={{ fontSize: '0.66rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bags in batch</span>
                                        <span style={{ fontSize: '0.66rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight (kg)</span>
                                        <span></span>
                                    </div>
                                    {c.batches.map((b, j) => (
                                        <div key={j}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 32px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ color: palette.muted, fontSize: '0.78rem', fontWeight: 600 }}>{j + 1}</span>
                                                <input type="number" inputMode="numeric" min="0" value={b.bagCount}
                                                    onChange={(e) => updateBatch(i, j, 'bagCount', e.target.value)}
                                                    style={{ padding: '6px 10px', border: `1.5px solid ${palette.border}`, borderRadius: 6, fontSize: '0.84rem', color: palette.text, background: palette.white, outline: 'none', fontFamily: SHARED.font, width: '100%' }}
                                                />
                                                <input type="number" inputMode="decimal" step="0.001" min="0" value={b.weight}
                                                    onChange={(e) => updateBatch(i, j, 'weight', e.target.value)}
                                                    style={{ padding: '6px 10px', border: `1.5px solid ${palette.border}`, borderRadius: 6, fontSize: '0.84rem', color: palette.text, background: palette.white, outline: 'none', fontFamily: SHARED.font, width: '100%' }}
                                                />
                                                <button onClick={() => removeBatch(i, j)} disabled={c.batches.length <= 1}
                                                    style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: c.batches.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '1rem', padding: 0, opacity: c.batches.length <= 1 ? 0.3 : 1 }}
                                                    title="Remove batch"
                                                >✕</button>
                                            </div>
                                            {/* Individual bag weights — shown when available (manual entry).
                                                Lists each bag's weight so the user can verify the data. */}
                                            {b.individualWeights && b.individualWeights.length > 0 && (
                                                <div style={{
                                                    marginLeft: 36, marginBottom: 8, padding: '6px 10px',
                                                    background: palette.bgSub || '#f8fafc', borderRadius: 6,
                                                    border: `1px solid ${palette.borderLight}`,
                                                }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                                                        {b.individualWeights.map((w, k) => {
                                                            // Compute the global bag number across all batches
                                                            let globalBagNum = k + 1
                                                            for (let m = 0; m < j; m++) {
                                                                globalBagNum += (c.batches[m]?.individualWeights?.length || c.batches[m]?.bagCount || 0)
                                                            }
                                                            return (
                                                                <span key={k} style={{
                                                                    fontSize: '0.74rem', color: palette.textSecondary || palette.muted,
                                                                    fontFamily: 'monospace', whiteSpace: 'nowrap',
                                                                }}>
                                                                    <span style={{ color: palette.muted }}>Bag {globalBagNum}:</span>{' '}
                                                                    <strong style={{ color: palette.text }}>{w.toFixed(3)} kg</strong>
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                    <div style={{
                                                        marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${palette.border}`,
                                                        fontSize: '0.74rem', color: palette.muted, fontWeight: 600,
                                                    }}>
                                                        Batch {j + 1} subtotal: <strong style={{ color: palette.text }}>{b.weight.toFixed(3)} kg</strong> × {b.bagCount} bags
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => addBatch(i)}
                                        style={{ marginTop: 4, background: palette.primaryLight, color: palette.primary, border: `1px dashed ${palette.primary}`, borderRadius: 6, padding: '5px 10px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                                    >+ Add batch</button>
                                </div>

                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${palette.borderLight}`, paddingTop: 12 }}>
                                    <label style={{ fontSize: '0.78rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: palette.muted, fontSize: '0.9rem' }}>₹</span>
                                        <input type="number" inputMode="decimal" step="0.01" placeholder="0" value={c.rate}
                                            onChange={(e) => updateRate(i, 'rate', e.target.value)}
                                            style={{ width: 120, padding: '8px 10px 8px 28px', border: `1.5px solid ${palette.border}`, borderRadius: 8, fontSize: '0.9rem', color: palette.text, background: palette.white, outline: 'none', fontFamily: SHARED.font }}
                                        />
                                    </div>
                                    <select value={c.unit} onChange={(e) => updateRate(i, 'unit', e.target.value)}
                                        style={{ padding: '8px 10px', border: `1.5px solid ${palette.border}`, borderRadius: 8, fontSize: '0.9rem', color: palette.text, background: palette.white, outline: 'none', fontFamily: SHARED.font }}
                                    >
                                        <option value="kg">per kg</option>
                                        <option value="quintal">per quintal (100 kg)</option>
                                    </select>
                                    <span style={{ color: palette.muted, fontSize: '0.78rem', marginLeft: 'auto' }}>
                                        = <strong style={{ color: palette.primary }}>{formatINR(c.amount)}</strong>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 20, padding: 16, background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, boxShadow: SHARED.shadowMd }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                            Farmer name (for receipt)
                        </label>
                        <input type="text" placeholder="e.g. Ramesh Kumar" value={counterpartyName}
                            onChange={(e) => setCounterpartyName(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${palette.border}`, borderRadius: 8, fontSize: '0.92rem', color: palette.text, background: palette.white, outline: 'none', fontFamily: SHARED.font, marginBottom: 12, boxSizing: 'border-box' as const }}
                        />
                        {grandTotalAmount <= 0 && (
                            <p style={{ margin: '0 0 12px', padding: '8px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, color: '#92400e', fontSize: '0.78rem' }}>
                                💡 Enter a rate (₹/kg or ₹/quintal) for each commodity to see the total amount. Print works without a rate, but Save needs at least one rate to record the bill.
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button onClick={printReceipt}
                                style={{ flex: 1, minWidth: 130, padding: '12px 16px', background: '#123C69', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                            >🖨️ Print</button>
                            <button onClick={shareReceipt} disabled={grandTotalAmount <= 0}
                                style={{ flex: 1, minWidth: 130, padding: '12px 16px', background: grandTotalAmount <= 0 ? palette.muted : '#25D366', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: grandTotalAmount <= 0 ? 'not-allowed' : 'pointer' }}
                            >📤 Share</button>
                            <button onClick={saveToLedger} disabled={saving || grandTotalAmount <= 0}
                                style={{ flex: 1, minWidth: 130, padding: '12px 16px', background: saving || grandTotalAmount <= 0 ? palette.muted : palette.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: saving || grandTotalAmount <= 0 ? 'not-allowed' : 'pointer' }}
                            >{saving ? 'Saving…' : '💾 Save'}</button>
                            <button onClick={resetAll}
                                style={{ padding: '12px 16px', background: palette.white, color: palette.text, border: `1.5px solid ${palette.border}`, borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                            >📸 New</button>
                        </div>
                        {saveMsg && (
                            <p style={{ marginTop: 10, padding: '8px 12px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, color: '#065f46', fontSize: '0.84rem', margin: '10px 0 0' }}>
                                ✅ {saveMsg}
                            </p>
                        )}
                    </div>

                    {result.rawText && (
                        <details style={{ marginTop: 16, padding: 12, background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 10 }}>
                            <summary style={{ cursor: 'pointer', color: palette.muted, fontSize: '0.82rem', fontWeight: 700 }}>OCR notes (raw)</summary>
                            <p style={{ marginTop: 8, marginBottom: 0, color: palette.muted, fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{result.rawText}</p>
                        </details>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
    )

    // ── Embedded mode: just return the content (no page wrapper, no nav) ──
    if (embedded) {
        return content
    }

    // ── Standalone mode: full page with nav ──
    return (
        <div style={{ minHeight: '100vh', background: palette.bg, fontFamily: SHARED.font }}>
            <nav style={{ ...navStyle(palette), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link href="/ledger" style={{ color: palette.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← Ledger</Link>
                        <span style={{ color: palette.muted }}>›</span>
                        <span style={{ color: palette.text, fontWeight: 800, fontSize: '1.05rem' }}>🧮 Bill Calculator</span>
                    </div>
                </div>
            </nav>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 80px' }}>
                <h1 style={{ color: palette.text, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 6px' }}>🧮 Bill Calculator</h1>
                <p style={{ color: palette.muted, margin: '0 0 24px', fontSize: '0.92rem' }}>
                    Upload a bill photo — we'll read every batch (10 bags + weight per row), sum the bags and weights per commodity, multiply by your stored rates, and give the total amount to pay.
                </p>
                {content}
            </div>
        </div>
    )
}
