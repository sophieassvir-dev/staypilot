import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, reservation_id } = body
  const db = getDb()

  const reservation = db.prepare(`
    SELECT r.*, p.name as property_name, p.address, p.cleaner_email, p.cleaner_name,
           p.checkin_time, p.checkout_time, p.wifi_name, p.wifi_password, p.owner_email
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = ?
  `).get(reservation_id) as Record<string, string>

  if (!reservation) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

  let recipient = ''
  let subject = ''
  let body_text = ''

  if (type === 'menage') {
    if (!reservation.cleaner_email) {
      return NextResponse.json({ error: 'Pas d\'email prestataire configuré' }, { status: 400 })
    }
    recipient = reservation.cleaner_email
    subject = `🧹 Ménage à prévoir — ${reservation.property_name}`
    body_text = `Bonjour ${reservation.cleaner_name || 'Équipe'},

Un départ est prévu le ${reservation.checkout_date} à ${reservation.checkout_time} pour ${reservation.property_name}.

📍 Adresse : ${reservation.address}
👤 Voyageur : ${reservation.guest_name}
🗓️ Départ : ${reservation.checkout_date} avant ${reservation.checkout_time}
📅 Prochain check-in : ${reservation.checkin_date}

Merci de confirmer votre disponibilité.

StayPilot`
  }

  if (type === 'message_guest') {
    if (!reservation.guest_email) {
      return NextResponse.json({ error: 'Pas d\'email voyageur' }, { status: 400 })
    }
    recipient = reservation.guest_email
    subject = body.subject || `Message concernant votre séjour — ${reservation.property_name}`
    body_text = body.message || ''
  }

  const notifId = db.prepare(`
    INSERT INTO notifications (property_id, reservation_id, type, recipient, subject, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(reservation.property_id, reservation_id, type, recipient, subject, body_text).lastInsertRowid

  if (resend && recipient) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'StayPilot <noreply@sophassiste.fr>',
        to: recipient,
        subject,
        text: body_text,
      })
      db.prepare('UPDATE notifications SET sent = 1, sent_at = datetime("now") WHERE id = ?').run(notifId)
      return NextResponse.json({ ok: true, sent: true })
    } catch {
      return NextResponse.json({ ok: true, sent: false, note: 'Email en file d\'attente' })
    }
  }

  return NextResponse.json({ ok: true, sent: false, note: 'RESEND_API_KEY non configuré — email simulé' })
}
