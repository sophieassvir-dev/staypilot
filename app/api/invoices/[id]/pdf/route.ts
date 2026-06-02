import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoiceDocument from '@/lib/invoice-pdf'
import { createElement } from 'react'
import { Invoice } from '@/lib/types'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function getSetting(db: ReturnType<typeof getDb>, key: string, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? fallback
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(id)) as Invoice | undefined
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const legalName = getSetting(db, 'legal_name', 'Mon Hébergement')
  const siret = getSetting(db, 'siret', '000 000 000 00000')
  const legalAddress = getSetting(db, 'legal_address', '')
  const legalCity = getSetting(db, 'legal_city', '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(InvoiceDocument, {
    invoiceNumber: invoice.invoice_number,
    issuedAt: invoice.issued_at,
    legalName,
    siret,
    legalAddress,
    legalCity,
    guestName: invoice.guest_name,
    guestEmail: invoice.guest_email,
    propertyName: invoice.property_name,
    propertyAddress: invoice.property_address,
    propertyCity: invoice.property_city,
    acquittee: invoice.acquittee === 1,
    checkinDate: invoice.checkin_date,
    checkoutDate: invoice.checkout_date,
    nights: invoice.nights,
    pricePerNight: invoice.price_per_night,
    total: invoice.total,
  }) as Parameters<typeof renderToBuffer>[0]

  const pdfBuffer = await renderToBuffer(doc)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
    },
  })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(id)) as Invoice | undefined
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (!invoice.guest_email) return NextResponse.json({ error: 'Pas d\'email voyageur' }, { status: 400 })

  const legalName = getSetting(db, 'legal_name', 'Mon Hébergement')
  const siret = getSetting(db, 'siret', '000 000 000 00000')
  const legalAddress = getSetting(db, 'legal_address', '')
  const legalCity = getSetting(db, 'legal_city', '')

  const doc = createElement(InvoiceDocument, {
    invoiceNumber: invoice.invoice_number,
    issuedAt: invoice.issued_at,
    legalName, siret, legalAddress, legalCity,
    guestName: invoice.guest_name,
    guestEmail: invoice.guest_email,
    propertyName: invoice.property_name,
    propertyAddress: invoice.property_address,
    propertyCity: invoice.property_city,
    acquittee: invoice.acquittee === 1,
    checkinDate: invoice.checkin_date,
    checkoutDate: invoice.checkout_date,
    nights: invoice.nights,
    pricePerNight: invoice.price_per_night,
    total: invoice.total,
  }) as Parameters<typeof renderToBuffer>[0]

  const pdfBuffer = await renderToBuffer(doc)

  const checkinFr = new Date(invoice.checkin_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const checkoutFr = new Date(invoice.checkout_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const guestFirstName = invoice.guest_name.split(' ')[0]

  const contactEmail = db.prepare(`
    SELECT p.contact_email FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = (SELECT reservation_id FROM invoices WHERE id = ?)
  `).get(Number(id)) as { contact_email: string | null } | undefined

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailErr } = await resend.emails.send({
    from: 'StayPilot <noreply@sophassiste.fr>',
    replyTo: contactEmail?.contact_email ?? undefined,
    to: invoice.guest_email,
    subject: `Votre facture ${invoice.invoice_number} — ${invoice.property_name}`,
    html: `
      <p>Bonjour ${guestFirstName},</p>
      <p>J'espère que votre séjour à <strong>${invoice.property_name}</strong> du ${checkinFr} au ${checkoutFr} vous a plu !</p>
      <p>Vous trouverez en pièce jointe votre facture <strong>${invoice.invoice_number}</strong>.</p>
      <p>N'hésitez pas à me contacter si vous avez la moindre question.</p>
      <p>À bientôt, j'espère ! 😊</p>
      <p>Sophie — Les Embruns</p>
    `,
    attachments: [{ filename: `facture-${invoice.invoice_number}.pdf`, content: pdfBuffer }],
  })

  if (emailErr) return NextResponse.json({ error: emailErr.message }, { status: 500 })

  db.prepare('UPDATE invoices SET email_sent = 1, email_sent_at = ? WHERE id = ?').run(new Date().toISOString(), Number(id))

  return NextResponse.json({ ok: true })
}
