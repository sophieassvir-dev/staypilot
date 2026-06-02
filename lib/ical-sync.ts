import { getDb } from './db'
import { autoGenerateLockCode } from './ttlock'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ical = require('node-ical')

interface ICalEvent {
  type: string
  uid: string
  summary?: string
  start: Date
  end: Date
  datetype?: string
  description?: string
  status?: string
}

export interface SyncResult {
  propertyId: number
  propertyName: string
  added: number
  cancelled: number
  errors: string[]
}

// Airbnb iCal stores VALUE=DATE as UTC midnight → add 12h to get the correct calendar date
function toLocalDate(d: Date): string {
  const normalized = new Date(d.getTime() + 12 * 3600 * 1000)
  return normalized.toISOString().substring(0, 10)
}

function daysDiff(start: Date, end: Date): number {
  const s = new Date(toLocalDate(start) + 'T12:00:00Z')
  const e = new Date(toLocalDate(end) + 'T12:00:00Z')
  return Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24))
}

function extractReservationCode(description?: string): string | null {
  if (!description) return null
  const match = description.match(/reservations\/details\/([A-Z0-9]+)/)
  return match ? match[1] : null
}

async function syncFeed(
  propertyId: number,
  icalUrl: string,
  platform: string,
  result: SyncResult
): Promise<void> {
  const db = getDb()

  let events: Record<string, ICalEvent>
  try {
    events = await ical.async.fromURL(icalUrl)
  } catch (e) {
    result.errors.push(`Erreur iCal ${platform} : ${e}`)
    return
  }

  const insertRes = db.prepare(`
    INSERT OR IGNORE INTO reservations
      (property_id, guest_name, checkin_date, checkout_date, nights, price_per_night, total_revenue, platform, status, ical_uid, notes)
    VALUES (?, ?, ?, ?, ?, 0, 0, ?, 'confirmed', ?, ?)
  `)

  const cancelRes = db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE ical_uid = ? AND property_id = ?`)

  for (const event of Object.values(events)) {
    if (event.type !== 'VEVENT') continue
    if (!event.start || !event.end || !event.uid) continue

    const summary = event.summary || ''
    if (platform === 'airbnb') {
      // Airbnb : sauter les blocages manuels, n'accepter que les vraies réservations
      if (summary.toLowerCase().includes('not available') || summary.toLowerCase().includes('unavailable')) continue
      if (!summary.toLowerCase().includes('reserved') && !summary.toLowerCase().includes('réservé')) continue
    }
    // Booking.com : "CLOSED - Not available" = réservation confirmée (seul format utilisé)

    if (event.status === 'CANCELLED' || summary.toLowerCase().includes('cancelled')) {
      const r = cancelRes.run(event.uid, propertyId)
      if (r.changes > 0) result.cancelled++
      continue
    }

    const checkin = toLocalDate(event.start)
    const checkout = toLocalDate(event.end)
    const nights = daysDiff(event.start, event.end)
    if (nights <= 0) continue

    const code = extractReservationCode(event.description)
    const guestName = code
      ? `Voyageur ${platform.charAt(0).toUpperCase() + platform.slice(1)} (${code})`
      : `Voyageur ${platform.charAt(0).toUpperCase() + platform.slice(1)}`
    const notes = event.description?.split('\n')[0] || null

    const r = insertRes.run(propertyId, guestName, checkin, checkout, nights, platform, event.uid, notes)
    if (r.changes > 0) {
      result.added++
      await autoGenerateLockCode(Number(r.lastInsertRowid), db)
    }
  }
}

export async function syncProperty(propertyId: number): Promise<SyncResult> {
  const db = getDb()
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Record<string, string> | undefined
  const result: SyncResult = { propertyId, propertyName: property?.name || '', added: 0, cancelled: 0, errors: [] }

  if (!property?.ical_url && !property?.ical_url_booking) {
    result.errors.push('Aucune URL iCal configurée')
    return result
  }

  if (property.ical_url) await syncFeed(propertyId, property.ical_url, 'airbnb', result)
  if (property.ical_url_booking) await syncFeed(propertyId, property.ical_url_booking, 'booking', result)

  db.prepare("UPDATE properties SET ical_last_sync = datetime('now') WHERE id = ?").run(propertyId)
  return result
}

export async function syncAllProperties(): Promise<SyncResult[]> {
  const db = getDb()
  const properties = db.prepare('SELECT id FROM properties WHERE active = 1 AND (ical_url IS NOT NULL OR ical_url_booking IS NOT NULL)').all() as { id: number }[]
  return Promise.all(properties.map(p => syncProperty(p.id)))
}
