import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const templates = db.prepare(`
    SELECT mt.*, p.name as property_name
    FROM message_templates mt
    LEFT JOIN properties p ON mt.property_id = p.id
    ORDER BY mt.id
  `).all()
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const { property_id, name, trigger, delay_hours, send_hour, subject, body } = await req.json()
  const result = db.prepare(`
    INSERT INTO message_templates (property_id, name, trigger, delay_hours, send_hour, subject, body, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(property_id, name, trigger, delay_hours ?? 0, send_hour ?? null, subject, body)
  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}

export async function PATCH(req: NextRequest) {
  const db = getDb()
  const { id, subject, body, active, delay_hours, send_hour } = await req.json()
  if (active !== undefined) {
    db.prepare('UPDATE message_templates SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
  } else {
    db.prepare('UPDATE message_templates SET subject = ?, body = ?, delay_hours = ?, send_hour = ? WHERE id = ?')
      .run(subject, body, delay_hours ?? null, send_hour ?? null, id)
  }
  return NextResponse.json({ ok: true })
}
