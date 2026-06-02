import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createPasscode, deletePasscode } from '@/lib/ttlock'

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function toTimestamp(date: string, time: string): number {
  // date = "2026-05-21", time = "16:00" → timestamp ms Europe/Paris
  const [h, m] = time.split(':').map(Number)
  const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
  return d.getTime()
}

export async function POST(req: NextRequest) {
  const { reservation_id } = await req.json()
  const db = getDb()

  const r = db.prepare(`
    SELECT r.*, p.checkin_time, p.checkout_time
    FROM reservations r JOIN properties p ON r.property_id = p.id
    WHERE r.id = ?
  `).get(Number(reservation_id)) as Record<string, string | number> | undefined

  if (!r) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

  const lockId = Number(process.env.TTLOCK_LOCK_ID)
  if (!lockId) return NextResponse.json({ error: 'TTLOCK_LOCK_ID non configuré' }, { status: 500 })

  // Supprimer l'ancien code TTLock si existant
  if (r.ttlock_pwd_id) {
    try { await deletePasscode(lockId, Number(r.ttlock_pwd_id)) } catch {}
  }

  const code = randomCode()
  const startMs = toTimestamp(String(r.checkin_date), String(r.checkin_time || '15:00'))
  const endMs = toTimestamp(String(r.checkout_date), String(r.checkout_time || '11:00'))
  const name = String(r.guest_name || '').split(' ')[0] + ' ' + String(r.checkin_date).slice(0, 7)

  try {
    const pwdId = await createPasscode(lockId, code, startMs, endMs, name)
    db.prepare('UPDATE reservations SET lock_code = ?, ttlock_pwd_id = ? WHERE id = ?')
      .run(code, pwdId, Number(reservation_id))
    return NextResponse.json({ ok: true, lock_code: code })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
