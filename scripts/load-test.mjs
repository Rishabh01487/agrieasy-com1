/**
 * Custom load tester — uses HTTP keep-alive agent to reuse connections.
 * Tests how many requests/sec the AgriEasy server can handle.
 *
 * Usage: node scripts/load-test.js <concurrency> <durationSec> <path>
 * Example: node scripts/load-test.js 100 30 /
 */
import http from 'http'

const CONCURRENCY = parseInt(process.argv[2] || '100', 10)
const DURATION_SEC = parseInt(process.argv[3] || '30', 10)
const PATH = process.argv[4] || '/'

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: CONCURRENCY,
  maxFreeSockets: CONCURRENCY,
  timeout: 30000,
})

const opts = {
  host: '127.0.0.1',
  port: 3000,
  path: PATH,
  method: 'GET',
  agent,
  headers: { 'Connection': 'keep-alive' },
}

let total = 0
let errors = 0
let successes = 0
const latencies = []
const statusCounts = {}
let stop = false

function makeRequest() {
  if (stop) return
  const start = process.hrtime.bigint()
  const req = http.request(opts, (res) => {
    // Drain the body so the socket can be reused
    res.on('data', () => {})
    res.on('end', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6
      latencies.push(ms)
      total++
      statusCounts[res.statusCode] = (statusCounts[res.statusCode] || 0) + 1
      if (res.statusCode >= 200 && res.statusCode < 400) successes++
      else errors++
      if (!stop) makeRequest()  // fire next request immediately
    })
  })
  req.on('error', (e) => {
    errors++
    total++
    if (!stop) setTimeout(makeRequest, 10)  // small backoff on error
  })
  req.end()
}

console.log(`Load test: ${CONCURRENCY} concurrent keep-alive connections, ${DURATION_SEC}s, path=${PATH}`)
console.log('Starting...')

// Fire initial batch
for (let i = 0; i < CONCURRENCY; i++) makeRequest()

// Stop after duration
setTimeout(() => {
  stop = true
  setTimeout(() => {
    latencies.sort((a, b) => a - b)
    const p = (pct) => latencies[Math.floor(latencies.length * pct)]?.toFixed(2) || 'N/A'
    const avg = latencies.reduce((s, x) => s + x, 0) / (latencies.length || 1)
    console.log('\n═══════════════════════════════════════════════════')
    console.log(`  Path: ${PATH}`)
    console.log(`  Concurrency: ${CONCURRENCY} keep-alive connections`)
    console.log(`  Duration: ${DURATION_SEC}s`)
    console.log('───────────────────────────────────────────────────')
    console.log(`  Total requests:  ${total.toLocaleString()}`)
    console.log(`  Successful (2xx/3xx): ${successes.toLocaleString()}`)
    console.log(`  Errors (4xx/5xx/network): ${errors.toLocaleString()}`)
    console.log(`  Throughput: ${(total / DURATION_SEC).toFixed(0)} req/sec`)
    console.log('───────────────────────────────────────────────────')
    console.log('  Latency (ms):')
    console.log(`    Min:    ${latencies[0]?.toFixed(2) || 'N/A'}`)
    console.log(`    Avg:    ${avg.toFixed(2)}`)
    console.log(`    p50:    ${p(0.5)}`)
    console.log(`    p95:    ${p(0.95)}`)
    console.log(`    p99:    ${p(0.99)}`)
    console.log(`    Max:    ${latencies[latencies.length - 1]?.toFixed(2) || 'N/A'}`)
    console.log('───────────────────────────────────────────────────')
    console.log('  Status codes:')
    for (const [code, count] of Object.entries(statusCounts).sort()) {
      console.log(`    HTTP ${code}: ${count.toLocaleString()}`)
    }
    console.log('═══════════════════════════════════════════════════')
    process.exit(0)
  }, 1000)
}, DURATION_SEC * 1000)
