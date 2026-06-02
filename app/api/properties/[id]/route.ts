import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(Number(id))
  if (!property) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
  return NextResponse.json(property)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const body = await req.json()

  const allowed = [
    'name', 'address', 'city', 'platforms', 'max_guests',
    'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time',
    'cleaner_email', 'cleaner_name', 'owner_name', 'owner_email',
    'contact_email', 'commission_rate', 'notes', 'ical_url', 'guide_url',
  ]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (updates.length === 0) return NextResponse.json({ ok: true })

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ')
  const values = updates.map(([, v]) => v ?? null)

  db.prepare(`UPDATE properties SET ${setClauses} WHERE id = ?`).run(...values, Number(id))
  return NextResponse.json({ ok: true })
}
