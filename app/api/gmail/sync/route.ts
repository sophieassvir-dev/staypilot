import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getValidAccessToken, fetchEmailBody, parseAirbnbEmail } from '@/lib/gmail'
import { autoGenerateLockCode } from '@/lib/ttlock'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1'

export async function POST() {
  const db = getDb()
  const token = await getValidAccessToken(db)
  if (!token) return NextResponse.json({ error: 'Gmail non connecté' }, { status: 401 })

  const q = encodeURIComponent('from:airbnb subject:"réservation confirmée"')
  const messages: { id: string }[] = []
  let pageToken: string | undefined

  do {
    const url = `${GMAIL_BASE}/users/me/messages?q=${q}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`
    const searchRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const searchData = await searchRes.json()

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Erreur Gmail API', detail: searchData }, { status: 502 })
    }

    messages.push(...(searchData.messages || []))
    pageToken = searchData.nextPageToken
  } while (pageToken)
  let created = 0
  let updated = 0
  let skipped = 0
  const debugLog: string[] = [`${messages.length} mail(s) trouvé(s)`]

  const properties = db.prepare('SELECT id, name, commission_rate FROM properties WHERE active = 1').all() as { id: number; name: string; commission_rate: number }[]

  let firstBodySample = ''

  for (const { id } of messages) {
    const already = db.prepare('SELECT id FROM gmail_synced WHERE message_id = ?').get(id)
    if (already) { skipped++; debugLog.push(`${id}: déjà traité`); continue }

    const { body, emailDate } = await fetchEmailBody(id, token)
    if (!body) { skipped++; debugLog.push(`${id}: corps vide`); continue }

    if (!firstBodySample) {
      const idx = body.indexOf('Arriv')
      firstBodySample = idx >= 0 ? body.slice(Math.max(0, idx - 200), idx + 600) : body.slice(0, 1000)
    }

    const parsed = parseAirbnbEmail(body, emailDate)
    if (!parsed?.checkinDate) { skipped++; debugLog.push(`${id}: parsing échoué`); continue }
    debugLog.push(`${id}: ${parsed.guestName} ${parsed.checkinDate}`)

    // Trouver le bien correspondant par mots-clés dans le corps
    const bodyLower = body.toLowerCase()
    const property = properties.find(p =>
      p.name.toLowerCase().split(' ').slice(0, 2).every(w => w.length > 2 && bodyLower.includes(w))
    ) || properties[0]

    // Chercher une réservation existante sur ces dates
    const existing = property
      ? db.prepare('SELECT * FROM reservations WHERE checkin_date = ? AND property_id = ?').get(parsed.checkinDate, property.id) as Record<string, unknown> | undefined
      : undefined

    if (existing) {
      db.prepare('UPDATE reservations SET guest_name = ?, notes = ? WHERE id = ?').run(
        parsed.guestName || existing.guest_name,
        [existing.notes, parsed.guestMessage].filter(Boolean).join('\n') || null,
        existing.id
      )
      updated++
    } else if (property) {
      const gross = parsed.pricePerNight * parsed.nights
      const commission = property.commission_rate ?? 20
      const totalRevenue = parsed.hostEarnings > 0 ? parsed.hostEarnings : gross * (1 - commission / 100)
      const ins = db.prepare(`
        INSERT INTO reservations
          (property_id, guest_name, checkin_date, checkout_date, nights,
           price_per_night, total_revenue, platform, status, notes, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'airbnb', 'confirmed', ?, 'gmail')
      `).run(
        property.id, parsed.guestName, parsed.checkinDate, parsed.checkoutDate,
        parsed.nights, parsed.pricePerNight, totalRevenue,
        parsed.guestMessage || null
      )
      await autoGenerateLockCode(Number(ins.lastInsertRowid), db)
      created++
    } else {
      skipped++
    }

    db.prepare('INSERT OR IGNORE INTO gmail_synced (message_id) VALUES (?)').run(id)
  }

  return NextResponse.json({ ok: true, created, updated, skipped, debug: debugLog, sample: firstBodySample })
}
