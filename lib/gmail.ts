import Database from 'better-sqlite3'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1'

interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export function isGmailConnected(db: Database.Database): boolean {
  return !!db.prepare('SELECT key FROM settings WHERE key = ?').get('gmail_tokens')
}

export async function getValidAccessToken(db: Database.Database): Promise<string | null> {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('gmail_tokens') as { value: string } | undefined
  if (!row) return null

  const tokens: StoredTokens = JSON.parse(row.value)

  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()

  const newTokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(newTokens), 'gmail_tokens')
  return newTokens.access_token
}

const MONTHS_FR: Record<string, number> = {
  janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
}

function parseFrenchDate(day: string, month: string, emailDate: Date): string {
  const m = MONTHS_FR[month.toLowerCase().normalize('NFC')]
  if (!m) return ''
  const d = parseInt(day)
  // L'année est celle du mail : si le mois est dans les 3 mois après la réception → même année, sinon année+1
  let year = emailDate.getFullYear()
  const candidate = new Date(year, m - 1, d)
  // Si la date est plus de 30 jours AVANT la réception du mail, c'est l'année suivante
  if (candidate.getTime() < emailDate.getTime() - 30 * 24 * 3600 * 1000) year++
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export interface ParsedAirbnbEmail {
  guestName: string
  guestFirstName: string
  checkinDate: string
  checkoutDate: string
  nights: number
  adults: number
  confirmationCode: string
  pricePerNight: number
  hostEarnings: number
  guestMessage: string
  propertyNameRaw: string
}

export function parseAirbnbEmail(body: string, emailDate: Date = new Date()): ParsedAirbnbEmail | null {
  try {
    // Dates sur une ligne : "Arrivée    Départ\n\nlun. 10 août    sam. 15 août"
    const datesLineMatch = body.match(
      /Arriv[eé]e\s+D[eé]part\s+([a-zéûîôà]+\.\s*\d+\s+[a-zéûîôàâùü]+)\s+([a-zéûîôà]+\.\s*\d+\s+[a-zéûîôàâùü]+)/i
    )

    let checkinDate = ''
    let checkoutDate = ''

    if (datesLineMatch) {
      const arrParts = datesLineMatch[1].match(/(\d+)\s+([a-zéûîôàâùü]+)/i)
      const depParts = datesLineMatch[2].match(/(\d+)\s+([a-zéûîôàâùü]+)/i)
      if (arrParts) checkinDate = parseFrenchDate(arrParts[1], arrParts[2], emailDate)
      if (depParts) checkoutDate = parseFrenchDate(depParts[1], depParts[2], emailDate)
    }

    if (!checkinDate || !checkoutDate) return null

    const nights = Math.round(
      (new Date(checkoutDate).getTime() - new Date(checkinDate).getTime()) / 86_400_000
    )

    const adultsMatch = body.match(/(\d+)\s+adultes?/)
    const adults = adultsMatch ? parseInt(adultsMatch[1]) : 1

    // Code de confirmation en MAJUSCULES
    const codeMatch = body.match(/CODE DE CONFIRMATION\s+([A-Z0-9]+)/)
    const confirmationCode = codeMatch?.[1] || ''

    // Prix : "76,00 € x 5 nuits"
    const priceMatch = body.match(/([\d,]+)\s*€\s*x\s*(\d+)\s*nuits?/)
    const pricePerNight = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0

    // Revenus hôte — "Vous gagnez 270,90 €" (peut être sur même ligne ou ligne suivante)
    const earningsMatch = body.match(/[Vv]ous gagnez[\s\n ]+([\d \s,]+)\s*€/i)
    const hostEarnings = earningsMatch
      ? parseFloat(earningsMatch[1].replace(/[\s ]/g, '').replace(',', '.'))
      : 0  // 0 = non trouvé, sera calculé via commission dans le sync

    // Nom du voyageur — après l'URL de réservation
    const nameAfterUrl = body.match(/hosting\/reservations\/details\/[A-Z0-9]+[^\n]*\s{2,}([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zA-ZÀ-ÿ -]+)/)
    // Ou avant "Identité vérifiée"
    const nameBeforeId = body.match(/([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zA-ZÀ-ÿ]+ [A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zA-ZÀ-ÿ]+)\s*\n.*[Ii]dentit[eé]/)
    const guestName = (nameBeforeId?.[1] || nameAfterUrl?.[1] || '').trim()

    // Message voyageur
    const msgMatch = body.match(/Bonjour,?\s*\n([\s\S]*?)\n(?:Cordialement|Envoyez)/)
    const guestMessage = msgMatch?.[1]?.trim() || ''

    return {
      guestName,
      guestFirstName: guestName.split(' ')[0] || '',
      checkinDate,
      checkoutDate,
      nights,
      adults,
      confirmationCode,
      pricePerNight,
      hostEarnings,
      guestMessage,
      propertyNameRaw: '',
    }
  } catch {
    return null
  }
}

function decodeBase64(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8')
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê').replace(/&agrave;/g, 'à').replace(/&ugrave;/g, 'ù')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function fetchEmailBody(messageId: string, accessToken: string): Promise<{ body: string; emailDate: Date }> {
  const res = await fetch(`${GMAIL_BASE}/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const msg = await res.json()

  const emailDate = msg.internalDate
    ? new Date(parseInt(msg.internalDate))
    : new Date()

  let plainText = ''
  let htmlText = ''

  function extractParts(payload: Record<string, unknown>): void {
    const mimeType = payload.mimeType as string
    const body = payload.body as { data?: string } | undefined

    if (mimeType === 'text/plain' && body?.data) {
      plainText = decodeBase64(body.data)
    } else if (mimeType === 'text/html' && body?.data) {
      htmlText = decodeBase64(body.data)
    }

    const parts = payload.parts as Record<string, unknown>[] | undefined
    if (parts) {
      for (const part of parts) extractParts(part)
    }
  }

  extractParts(msg.payload || {})

  const body = (plainText.length > 200 && plainText.includes('Arrivée'))
    ? plainText
    : (htmlText ? stripHtml(htmlText) : plainText)

  return { body, emailDate }
}
