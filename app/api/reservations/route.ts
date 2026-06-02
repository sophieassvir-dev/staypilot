import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { differenceInDays } from 'date-fns'
import { autoGenerateLockCode } from '@/lib/ttlock'

export async function GET(req: NextRequest) {
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('property_id')
  const query = propertyId
    ? 'SELECT r.*, p.name as property_name FROM reservations r JOIN properties p ON r.property_id = p.id WHERE r.property_id = ? ORDER BY r.checkin_date DESC'
    : 'SELECT r.*, p.name as property_name FROM reservations r JOIN properties p ON r.property_id = p.id ORDER BY r.checkin_date DESC'
  const reservations = propertyId
    ? db.prepare(query).all(propertyId)
    : db.prepare(query).all()
  return NextResponse.json(reservations)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const nights = differenceInDays(new Date(body.checkout_date), new Date(body.checkin_date))
  const total = nights * body.price_per_night

  const result = db.prepare(`
    INSERT INTO reservations (property_id, guest_name, guest_email, guest_phone,
      checkin_date, checkout_date, nights, price_per_night, total_revenue,
      platform, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.property_id, body.guest_name, body.guest_email || null, body.guest_phone || null,
    body.checkin_date, body.checkout_date, nights, body.price_per_night, total,
    body.platform || 'airbnb', body.status || 'confirmed', body.notes || null
  )

  const id = result.lastInsertRowid as number
  await autoGenerateLockCode(id, db)
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id)
  return NextResponse.json(reservation, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { id, ical_uid, ...fields } = body

  const allowed = ['status', 'guest_name', 'guest_email', 'guest_phone', 'price_per_night', 'total_revenue', 'notes', 'lock_code']
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k))
  if (updates.length === 0) return NextResponse.json({ ok: true })

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ')
  const values = updates.map(([, v]) => v)

  if (id) {
    db.prepare(`UPDATE reservations SET ${setClauses} WHERE id = ?`).run(...values, id)
  } else if (ical_uid) {
    db.prepare(`UPDATE reservations SET ${setClauses} WHERE ical_uid = ?`).run(...values, ical_uid)
  } else {
    return NextResponse.json({ error: 'id or ical_uid required' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
