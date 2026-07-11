#!/usr/bin/env node
/**
 * Safer comment cleanup — only strips:
 *   1. JSDoc block comments (/** ... *\/) that appear at TOP-OF-FILE or
 *      ABOVE-FUNCTION level (not between interface fields)
 *   2. Inline comments with markers: FIX:, CRITICAL:, NOTE:, HACK:, TODO:,
 *      FIXME:, WORKAROUND:, XXX:, "back compat", "legacy", "backward compat"
 *   3. Explanatory inline comments that describe the next line of code
 *
 * Preserves:
 *   - Block comments inside interfaces/types (between fields)
 *   - Section dividers (// ── Section ──)
 *   - eslint-disable / @ts-ignore pragmas
 *   - License headers
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx'])

const INLINE_NOISE = /^\s*\/\/\s*(FIX|CRITICAL|NOTE|HACK|TODO|FIXME|WORKAROUND|XXX|back[ -]?compat|legacy|backward[ -]?compat)[:\s]/i
const SECTION_DIVIDER = /^\s*\/\/\s*[─═\-_=]{3,}/
const PRAGMA = /^\s*\/\/\s*(eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck|prettier-ignore|istanbul ignore)/i

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git' || entry.name === 'scripts') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (EXTS.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

/**
 * Determine if a position is "inside" an interface/type/object block by
 * scanning backwards for the opening keyword and checking brace depth.
 */
function isInsideBlock(lines, lineIdx) {
  // Walk backwards — if we hit `interface X {` or `type X = {` or `({` at
  // a lower indent before we hit a top-level statement, we're inside.
  let depth = 0
  for (let i = lineIdx; i >= 0; i--) {
    const line = lines[i]
    const opens = (line.match(/{/g) || []).length
    const closes = (line.match(/}/g) || []).length
    depth += opens - closes
    if (depth > 0) {
      // Check if the opening line is an interface/type declaration
      for (let j = i; j >= Math.max(0, i - 3); j--) {
        if (/^\s*(export\s+)?(interface|type)\s+\w+/.test(lines[j])) return true
      }
      // Otherwise it's a function/object block — not "inside an interface"
      return false
    }
    if (depth < 0) return false
  }
  return false
}

function stripBlockCommentsSafely(content) {
  const lines = content.split('\n')
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Detect start of /** block comment
    if (line.match(/^\s*\/\*\*/)) {
      // Find the end of the block
      let endIdx = i
      const block = []
      for (let j = i; j < lines.length; j++) {
        block.push(lines[j])
        if (lines[j].includes('*/')) {
          endIdx = j
          break
        }
      }

      // Is this a license header? (first non-empty content in file)
      const preceding = lines.slice(0, i).filter(l => l.trim() !== '' && !l.trim().startsWith('//'))
      const isLicense = preceding.length === 0
      if (isLicense) {
        for (let j = i; j <= endIdx; j++) result.push(lines[j])
        i = endIdx + 1
        continue
      }

      // Is this block sitting inside an interface/type declaration?
      // Check by looking at what comes BEFORE the block in the current scope
      const insideInterface = isInsideBlock(result, result.length - 1)
      if (insideInterface) {
        for (let j = i; j <= endIdx; j++) result.push(lines[j])
        i = endIdx + 1
        continue
      }

      // Otherwise — drop the block comment
      i = endIdx + 1
      continue
    }

    result.push(line)
    i++
  }
  return result.join('\n')
}

function stripInlineNoise(content) {
  const lines = content.split('\n')
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (PRAGMA.test(line)) {
      result.push(line)
      continue
    }
    if (SECTION_DIVIDER.test(line)) {
      result.push(line)
      continue
    }
    if (INLINE_NOISE.test(line)) {
      continue  // drop
    }

    // Explanatory inline comments — only strip if clearly describing next line
    if (trimmed.startsWith('//') && !trimmed.startsWith('//!')) {
      const commentText = trimmed.slice(2).trim()
      const words = commentText.split(/\s+/).filter(Boolean)
      const looksLikeExplanation = words.length >= 4 ||
        /^(Fetch|Get|Set|Update|Create|Delete|Remove|Add|Check|Validate|Parse|Build|Send|Return|Compute|Calculate|Generate|Make|Ensure|Prevent|Allow|Skip|Force|Try|Handle|Convert|Extract|Strip|Sanitize|Normalize|Map|Reduce|Filter|Iterate|Loop|Walk)\b/i.test(commentText)

      if (looksLikeExplanation) {
        const next = lines[i + 1]
        if (next && !next.trim().startsWith('//') && next.trim() !== '' && !next.trim().startsWith('*/')) {
          continue  // drop
        }
      }
    }

    result.push(line)
  }
  return result.join('\n')
}

function collapseBlankLines(content) {
  return content.replace(/\n{4,}/g, '\n\n\n')
}

const files = walk(ROOT)
let changed = 0
let totalStripped = 0

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8')
  let cleaned = stripBlockCommentsSafely(original)
  cleaned = stripInlineNoise(cleaned)
  cleaned = collapseBlankLines(cleaned)

  if (cleaned !== original) {
    const removedLines = original.split('\n').length - cleaned.split('\n').length
    totalStripped += removedLines
    changed++
    if (!DRY_RUN) fs.writeFileSync(file, cleaned)
    console.log(`${DRY_RUN ? '[dry-run]' : '[cleaned]'} ${path.relative(ROOT, file)} — ${removedLines} lines`)
  }
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done. ${changed} files changed, ${totalStripped} lines stripped.`)
