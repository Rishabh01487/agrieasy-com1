/**
 * Database index verification + creation script.
 *
 * Run with: node scripts/ensure-indexes.js
 *
 * This script connects to MongoDB and calls ensureIndexes() on every model
 * to create all defined indexes. Safe to run multiple times — MongoDB
 * no-ops if the index already exists.
 *
 * Indexes are critical for handling 20,000-50,000 req/s — without them,
 * MongoDB does full collection scans which are O(n) and will collapse
 * under load.
 */

const mongoose = require('mongoose')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  console.log('Connecting to MongoDB...')
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  })
  console.log('Connected.\n')

  const models = [
    { name: 'User', path: 'lib/models/User' },
    { name: 'Listing', path: 'lib/models/Listing' },
    { name: 'Booking', path: 'lib/models/Booking' },
    { name: 'Vehicle', path: 'lib/models/Vehicle' },
    { name: 'BuyerVehicle', path: 'lib/models/BuyerVehicle' },
    { name: 'Post', path: 'lib/models/Post' },
    { name: 'Wallet', path: 'lib/models/Wallet' },
    { name: 'Transaction', path: 'lib/models/Transaction' },
    { name: 'Notification', path: 'lib/models/Notification' },
    { name: 'Billing', path: 'lib/models/Billing' },
    { name: 'Ledger', path: 'lib/models/Ledger' },
    { name: 'Follow', path: 'lib/models/Follow' },
    { name: 'Conversation', path: 'lib/models/Conversation' },
    { name: 'Story', path: 'lib/models/Story' },
    { name: 'Highlight', path: 'lib/models/Highlight' },
    { name: 'Collection', path: 'lib/models/Collection' },
    { name: 'PayLater', path: 'lib/models/PayLater' },
    { name: 'AuditLog', path: 'lib/models/AuditLog' },
  ]

  let totalCreated = 0
  let totalSkipped = 0

  for (const { name, path } of models) {
    try {
      const model = require(`@/lib/models/${name}`).default
      if (!model || !model.collection) {
        console.log(`  ⚠ ${name}: model not found or no collection`)
        continue
      }

      const indexes = model.schema.indexes()
      if (indexes.length === 0) {
        console.log(`  ○ ${name}: no indexes defined`)
        continue
      }

      console.log(`  Creating ${indexes.length} indexes for ${name}...`)
      await model.createCollection().catch(() => {})
      await model.syncIndexes()
      console.log(`  ✅ ${name}: ${indexes.length} indexes OK`)
      totalCreated += indexes.length
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`)
    }
  }

  console.log(`\nDone. ${totalCreated} indexes verified across ${models.length} collections.`)
  await mongoose.disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
