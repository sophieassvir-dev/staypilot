import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const base = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

  if (!code) return NextResponse.redirect(`${base}/gmail?status=error`)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${base}/api/gmail/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) return NextResponse.redirect(`${base}/gmail?status=error`)

  const data = await res.json()
  const db = getDb()

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'gmail_tokens',
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    })
  )

  return NextResponse.redirect(`${base}/gmail?status=connected`)
}
