import Database from 'better-sqlite3'
import { Resend } from 'resend'
import { differenceInCalendarDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface Reservation extends Record<string, string> {
  id: string
  guest_name: string
  guest_email: string
  checkin_date: string
  checkout_date: string
  checkin_time: string
  checkout_time: string
  lock_code: string
  property_name: string
  guide_url: string
  address: string
}

function replaceVars(text: string, res: Reservation, extra: Record<string, string> = {}): string {
  const vars: Record<string, string> = {
    '{{prenom}}': res.guest_name?.split(' ')[0] || '',
    '{{nom_complet}}': res.guest_name || '',
    '{{logement}}': res.property_name || '',
    '{{date_arrivee}}': format(new Date(res.checkin_date), 'd MMMM yyyy', { locale: fr }),
    '{{date_depart}}': format(new Date(res.checkout_date), 'd MMMM yyyy', { locale: fr }),
    '{{heure_arrivee}}': res.checkin_time || '16:00',
    '{{heure_depart}}': res.checkout_time || '11:00',
    '{{guide_url}}': res.guide_url || '[GUIDE À RENSEIGNER]',
    '{{code_acces}}': res.lock_code || '[CODE NON DÉFINI]',
    ...extra,
  }
  let result = text
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(k, v)
  }
  return result
}

function hasSent(db: Database.Database, reservationId: string, type: string): boolean {
  return !!db.prepare('SELECT id FROM notifications WHERE reservation_id = ? AND type = ? AND sent = 1').get(reservationId, type)
}

function tallySubmitted(db: Database.Database, reservationId: string): boolean {
  return !!db.prepare("SELECT id FROM notifications WHERE reservation_id = ? AND type = 'tally_welcome' AND sent = 1").get(reservationId)
}

async function sendMsg(
  db: Database.Database,
  res: Reservation,
  type: string,
  subject: string,
  body: string
): Promise<boolean> {
  if (!res.guest_email) return false

  const notifId = db.prepare(`
    INSERT INTO notifications (property_id, reservation_id, type, recipient, subject, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(res.property_id, res.id, type, res.guest_email, subject, body).lastInsertRowid

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'StayPilot <noreply@sophassiste.fr>',
        to: res.guest_email,
        subject,
        text: body,
      })
      db.prepare('UPDATE notifications SET sent = 1, sent_at = datetime("now") WHERE id = ?').run(notifId)
      return true
    } catch {
      return false
    }
  }
  return false
}

export async function runScheduler(db: Database.Database): Promise<{ sent: number; log: string[] }> {
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const currentHour = now.getHours()

  const tallyUrl = (db.prepare("SELECT value FROM settings WHERE key = 'tally_url'").get() as { value: string } | undefined)?.value || process.env.TALLY_FORM_URL || ''
  const videoSerrure = (db.prepare("SELECT value FROM settings WHERE key = 'video_serrure_url'").get() as { value: string } | undefined)?.value || '[LIEN VIDÉO À RENSEIGNER]'

  const reservations = db.prepare(`
    SELECT r.*, p.name as property_name, p.guide_url, p.checkin_time, p.checkout_time,
           p.address
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE r.status = 'confirmed' AND r.guest_email IS NOT NULL
  `).all() as Reservation[]

  let sent = 0
  const log: string[] = []

  for (const res of reservations) {
    const checkin = new Date(res.checkin_date)
    const checkout = new Date(res.checkout_date)
    const today = new Date(todayStr)

    const daysUntilCheckin = differenceInCalendarDays(checkin, today)
    const daysAfterCheckin = differenceInCalendarDays(today, checkin)
    const daysUntilCheckout = differenceInCalendarDays(checkout, today)
    const daysAfterCheckout = differenceInCalendarDays(today, checkout)

    const extra = { '{{tally_url}}': tallyUrl, '{{video_serrure}}': videoSerrure }

    // 1. Réservation confirmée
    if (!hasSent(db, res.id, 'msg_booking_confirmed')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'booking_confirmed' AND active = 1 AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_booking_confirmed',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — confirmation réservation`) }
      }
    }

    // 3. Rappel formulaire Tally (X j avant, si pas soumis)
    const tallyTpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'tally_reminder' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, number> | undefined
    const tallyDays = tallyTpl ? Math.abs(tallyTpl.delay_hours ?? -240) / 24 : 10
    if (daysUntilCheckin === tallyDays && !tallySubmitted(db, res.id) && !hasSent(db, res.id, 'msg_tally_reminder')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'tally_reminder' AND active = 1 AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_tally_reminder',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — rappel formulaire`) }
      }
    }

    // 4. Séjour bientôt (Xj avant)
    const preCheckinTpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'pre_checkin' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, number> | undefined
    const preCheckinDays = preCheckinTpl ? Math.abs(preCheckinTpl.delay_hours ?? -72) / 24 : 3
    if (daysUntilCheckin === preCheckinDays && !hasSent(db, res.id, 'msg_pre_checkin')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'pre_checkin' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_pre_checkin',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — séjour bientôt`) }
      }
    }

    // 5. Codes d'accès (jour J à l'heure configurée)
    const codesTpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'checkin_codes' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, number> | undefined
    const codesHour = codesTpl?.send_hour ?? 15
    if (daysUntilCheckin === 0 && currentHour >= codesHour && !hasSent(db, res.id, 'msg_checkin_codes')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'checkin_codes' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_checkin_codes',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — codes d'accès`) }
      }
    }

    // 6. Lendemain arrivée (à l'heure configurée)
    const postNightTpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'post_first_night' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, number> | undefined
    const postNightHour = postNightTpl?.send_hour ?? 9
    if (daysAfterCheckin === 1 && currentHour >= postNightHour && !hasSent(db, res.id, 'msg_post_first_night')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'post_first_night' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_post_first_night',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — lendemain arrivée`) }
      }
    }

    // 7. Veille départ
    if (daysUntilCheckout === 1 && !hasSent(db, res.id, 'msg_pre_checkout')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'pre_checkout' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_pre_checkout',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — consignes fin de séjour`) }
      }
    }

    // 8. Jour du départ
    if (daysUntilCheckout === 0 && !hasSent(db, res.id, 'msg_checkout_day')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'checkout_day' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_checkout_day',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — jour du départ`) }
      }
    }

    // 9. Lendemain départ — demande d'avis
    if (daysAfterCheckout === 1 && !hasSent(db, res.id, 'msg_post_checkout')) {
      const tpl = db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'post_checkout' AND active = 1 LIMIT 1").get(res.property_id) as Record<string, string> | undefined
      if (tpl) {
        const ok = await sendMsg(db, res, 'msg_post_checkout',
          replaceVars(tpl.subject, res, extra), replaceVars(tpl.body, res, extra))
        if (ok) { sent++; log.push(`✅ ${res.guest_name} — demande d'avis`) }
      }
    }
  }

  return { sent, log }
}
