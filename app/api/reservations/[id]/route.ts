import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM reservations WHERE id = ?').run(Number(id))
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const body = await req.json()

  const allowed = ['guest_phone', 'guest_email', 'guest_count', 'guest2_firstname', 'has_minor', 'has_animal', 'arrival_time', 'departure_time', 'needs_pet_equipment', 'pet_name', 'pet_description', 'tally_filled', 'notes', 'status']
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (updates.length === 0) return NextResponse.json({ ok: true })

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ')
  const values = updates.map(([, v]) => v)

  db.prepare(`UPDATE reservations SET ${setClauses} WHERE id = ?`).run(...values, Number(id))
  return NextResponse.json({ ok: true })
}
