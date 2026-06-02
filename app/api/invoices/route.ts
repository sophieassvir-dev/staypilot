import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoiceDocument from '@/lib/invoice-pdf'
import { createElement } from 'react'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function getSetting(db: ReturnType<typeof getDb>, key: string, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? fallback
}

function propertyPrefix(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // supprimer accents
    .replace(/^(les?|la|l'|l'|une?|des?)\s+/i, '') // supprimer articles français
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // garder lettres et chiffres seulement
    .slice(0, 8) // max 8 caractères
}

function nextInvoiceNumber(db: ReturnType<typeof getDb>, propertyName: string): string {
  const year = new Date().getFullYear()
  const prefix = propertyPrefix(propertyName)
  const pattern = `${prefix}-${year}-%`
  const row = db.prepare(
    "SELECT MAX(CAST(SUBSTR(invoice_number, ?) AS INTEGER)) as max_seq FROM invoices WHERE invoice_number LIKE ?"
  ).get(prefix.length + 7, pattern) as { max_seq: number | null }
  const seq = String((row.max_seq ?? 0) + 1).padStart(3, '0')
  return `${prefix}-${year}-${seq}`
}

export async function GET() {
  const db = getDb()
  const invoices = db.prepare('SELECT * FROM invoices ORDER BY issued_at DESC').all()
  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const { reservation_id, send_email, acquittee = true } = await req.json()

    const res = db.prepare(`
      SELECT r.*, p.name as property_name, p.address as property_address, p.city as property_city,
             p.contact_email as property_contact_email
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = ?
    `).get(reservation_id) as Record<string, string | number> | undefined

    if (!res) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

    const legalName = getSetting(db, 'legal_name', 'Mon Hébergement')
    const siret = getSetting(db, 'siret', '000 000 000 00000')
    const legalAddress = getSetting(db, 'legal_address', '')
    const legalCity = getSetting(db, 'legal_city', '')

    const invoiceNumber = nextInvoiceNumber(db, String(res.property_name))
    const issuedAt = new Date().toISOString()

    // Générer le PDF en premier (avant d'enregistrer en BDD)
    const docProps = {
      invoiceNumber,
      issuedAt,
      legalName,
      siret,
      legalAddress,
      legalCity,
      guestName: String(res.guest_name),
      guestEmail: res.guest_email ? String(res.guest_email) : null,
      propertyName: String(res.property_name),
      propertyAddress: res.property_address ? String(res.property_address) : null,
      propertyCity: res.property_city ? String(res.property_city) : null,
      acquittee: acquittee === true || acquittee === 1,
      checkinDate: String(res.checkin_date),
      checkoutDate: String(res.checkout_date),
      nights: Number(res.nights),
      pricePerNight: Number(res.price_per_night),
      total: Number(res.total_revenue),
    }

    const doc = createElement(InvoiceDocument, docProps) as Parameters<typeof renderToBuffer>[0]
    const pdfBuffer = await renderToBuffer(doc)

    // Enregistrer la facture
    const info = db.prepare(`
      INSERT INTO invoices
        (reservation_id, invoice_number, guest_name, guest_email, property_name,
         property_address, property_city, checkin_date, checkout_date, nights,
         price_per_night, total, acquittee, issued_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reservation_id, invoiceNumber, res.guest_name, res.guest_email ?? null,
      res.property_name, res.property_address ?? null, res.property_city ?? null,
      res.checkin_date, res.checkout_date, res.nights,
      res.price_per_night, res.total_revenue, acquittee ? 1 : 0, issuedAt
    )

    const invoiceId = info.lastInsertRowid

    // Envoyer par email (échec silencieux : la facture est quand même générée)
    let emailSent = false
    if (send_email && res.guest_email) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const checkinFr = new Date(String(res.checkin_date)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const checkoutFr = new Date(String(res.checkout_date)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const guestFirstName = String(res.guest_name).split(' ')[0]
      const { error: emailErr } = await resend.emails.send({
        from: 'StayPilot <noreply@sophassiste.fr>',
        replyTo: res.property_contact_email ? String(res.property_contact_email) : undefined,
        to: String(res.guest_email),
        subject: `Votre facture ${invoiceNumber} — ${res.property_name}`,
        html: `
          <p>Bonjour ${guestFirstName},</p>
          <p>J'espère que votre séjour à <strong>${res.property_name}</strong> du ${checkinFr} au ${checkoutFr} vous a plu !</p>
          <p>Vous trouverez en pièce jointe votre facture <strong>${invoiceNumber}</strong>.</p>
          <p>N'hésitez pas à me contacter si vous avez la moindre question.</p>
          <p>À bientôt, j'espère ! 😊</p>
          <p>Sophie — Les Embruns</p>
        `,
        attachments: [{ filename: `facture-${invoiceNumber}.pdf`, content: pdfBuffer }],
      })
      if (emailErr) {
        return NextResponse.json({
          ok: true, invoiceId, invoiceNumber, emailSent: false,
          emailError: emailErr.message,
          pdfBuffer: Array.from(pdfBuffer),
        })
      }
      db.prepare('UPDATE invoices SET email_sent = 1, email_sent_at = ? WHERE id = ?')
        .run(new Date().toISOString(), invoiceId)
      emailSent = true
    }

    return NextResponse.json({ ok: true, invoiceId, invoiceNumber, emailSent, pdfBuffer: Array.from(pdfBuffer) })
  } catch (err) {
    console.error('Erreur génération facture:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
