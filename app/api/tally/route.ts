import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface TallyField {
  key: string
  label: string
  type: string
  value: unknown
}

interface TallyPayload {
  eventType: string
  data: {
    responseId: string
    formId: string
    fields: TallyField[]
  }
}

function getField(fields: TallyField[], label: string): string {
  const field = fields.find(f => f.label.toLowerCase().trim() === label.toLowerCase().trim())
  return field?.value != null ? String(field.value) : ''
}

function extractDate(datetime: string): string {
  if (!datetime) return ''
  return datetime.split('T')[0]
}

export async function POST(req: NextRequest) {
  const payload = await req.json() as TallyPayload

  if (payload.eventType !== 'FORM_RESPONSE') {
    return NextResponse.json({ ok: true })
  }

  const fields = payload.data.fields
  const email = getField(fields, 'Adresse mail').toLowerCase().trim()
  const nom = getField(fields, 'Nom')
  const prenom = getField(fields, 'Prénom')
  const prenom2 = getField(fields, 'Prénom 2e voyageur')
  const phone = getField(fields, 'Numéro de téléphone')
  const nbVoyageurs = getField(fields, 'Nombre de voyageurs')
  const hasMinorRaw = getField(fields, 'Un des voyageurs est-il mineurs ?')
  const animal = getField(fields, "Présence d'un animal")
  const needsPetEquipRaw = getField(fields, 'Avez-vous besoin de gamelles et d\'un tapis ?')
  const petName = getField(fields, "Nom de l'animal")
  const petDescription = getField(fields, 'Quel animal et quelle taille ?')
  const commentaires = getField(fields, 'Commentaires du voyageur')
  const arriveeRaw = getField(fields, "Date et heure d'arrivée")
  const departRaw = getField(fields, 'Date et heure de départ')
  const checkinDate = extractDate(arriveeRaw)

  if (!checkinDate) {
    return NextResponse.json({ error: 'Date manquante' }, { status: 400 })
  }

  const db = getDb()

  // 1. Essai par email + date (si l'email est connu dans la réservation)
  let reservation = email ? db.prepare(`
    SELECT r.*, p.name as property_name, p.guide_url, p.checkin_time
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE LOWER(r.guest_email) = ? AND r.checkin_date = ? AND r.status = 'confirmed'
    LIMIT 1
  `).get(email, checkinDate) as Record<string, string> | undefined : undefined

  // 2. Fallback : correspondance par date d'arrivée seule
  if (!reservation && checkinDate) {
    reservation = db.prepare(`
      SELECT r.*, p.name as property_name, p.guide_url, p.checkin_time
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE r.checkin_date = ? AND r.status = 'confirmed'
      LIMIT 1
    `).get(checkinDate) as Record<string, string> | undefined
  }

  const arriveeTime = arriveeRaw?.includes('T') ? arriveeRaw.split('T')[1]?.substring(0, 5) : null
  const departureTime = departRaw?.includes('T') ? departRaw.split('T')[1]?.substring(0, 5) : null
  const hasMinor = hasMinorRaw?.toLowerCase() === 'oui' ? 1 : hasMinorRaw?.toLowerCase() === 'non' ? 0 : null
  const needsPetEquip = needsPetEquipRaw?.toLowerCase() === 'oui' ? 1 : needsPetEquipRaw?.toLowerCase() === 'non' ? 0 : null

  if (reservation) {
    const notesFromTally = commentaires || null

    db.prepare(`
      UPDATE reservations
      SET guest_phone          = COALESCE(guest_phone, ?),
          guest_email          = COALESCE(?, guest_email),
          guest_count          = ?,
          guest2_firstname     = ?,
          has_minor            = ?,
          has_animal           = ?,
          arrival_time         = ?,
          departure_time       = ?,
          needs_pet_equipment  = ?,
          pet_name             = ?,
          pet_description      = ?,
          tally_filled         = 1,
          notes = CASE
            WHEN ? IS NULL THEN notes
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE notes || char(10) || '---' || char(10) || ?
          END
      WHERE id = ?
    `).run(
      phone || reservation.guest_phone,
      email || null,
      nbVoyageurs ? parseInt(nbVoyageurs) : null,
      prenom2 || null,
      hasMinor,
      animal || null,
      arriveeTime || null,
      departureTime || null,
      needsPetEquip,
      petName || null,
      petDescription || null,
      notesFromTally, notesFromTally, notesFromTally,
      reservation.id
    )
  }

  const guestFirstName = prenom || nom || 'voyageur'

  const tpl = reservation
    ? db.prepare("SELECT * FROM message_templates WHERE property_id = ? AND trigger = 'tally_welcome' AND active = 1 LIMIT 1").get(reservation.property_id) as Record<string, string> | undefined
    : undefined

  const vars: Record<string, string> = {
    '{{prenom}}': guestFirstName,
    '{{nom_complet}}': `${prenom} ${nom}`.trim(),
    '{{logement}}': reservation?.property_name || 'votre logement',
    '{{guide_url}}': reservation?.guide_url || '',
    '{{date_arrivee}}': reservation?.checkin_date || '',
    '{{date_depart}}': reservation?.checkout_date || '',
  }
  const replaceVars = (text: string) => Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), text)

  const subject = tpl ? replaceVars(tpl.subject) : 'Merci pour votre réponse'
  const emailBody = tpl ? replaceVars(tpl.body) : `Bonjour ${guestFirstName}, merci pour votre réponse !`

  const notifId = db.prepare(`
    INSERT INTO notifications (property_id, reservation_id, type, recipient, subject, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    reservation?.property_id ?? null,
    reservation?.id ?? null,
    'tally_welcome',
    email,
    subject,
    emailBody
  ).lastInsertRowid

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'StayPilot <noreply@sophassiste.fr>',
        to: email,
        subject,
        text: emailBody,
      })
      db.prepare('UPDATE notifications SET sent = 1, sent_at = datetime("now") WHERE id = ?').run(notifId)
    } catch {
      // email en file d'attente, déjà enregistré en BDD
    }
  }

  return NextResponse.json({ ok: true, matched: !!reservation })
}
