import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { seedDefaultTemplates } from '@/lib/seed'

export async function GET() {
  const db = getDb()
  const properties = db.prepare('SELECT * FROM properties WHERE active = 1 ORDER BY name').all()
  return NextResponse.json(properties)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const result = db.prepare(`
    INSERT INTO properties (name, address, city, platforms, max_guests, wifi_name, wifi_password,
      checkin_time, checkout_time, cleaner_email, cleaner_name, owner_name, owner_email, commission_rate, notes, ical_url, ical_url_booking, guide_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.address, body.city, body.platforms || 'airbnb',
    body.max_guests || 2, body.wifi_name || null, body.wifi_password || null,
    body.checkin_time || '16:00', body.checkout_time || '11:00',
    body.cleaner_email || null, body.cleaner_name || null,
    body.owner_name || null, body.owner_email || null,
    body.commission_rate || 20, body.notes || null,
    body.ical_url || null, body.ical_url_booking || null, body.guide_url || null
  )
  const id = result.lastInsertRowid as number
  seedDefaultTemplates(id)
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id)
  return NextResponse.json(property, { status: 201 })
}
