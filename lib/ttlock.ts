import crypto from 'crypto'
import type { getDb } from './db'

const BASE_URL = 'https://euapi.ttlock.com'

function toTimestamp(date: string, time: string): number {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
  return d.getTime()
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

async function getToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.TTLOCK_CLIENT_ID!,
    client_secret: process.env.TTLOCK_CLIENT_SECRET!,
    username: process.env.TTLOCK_USERNAME!,
    password: md5(process.env.TTLOCK_PASSWORD!),
  })

  const res = await fetch(`${BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error(data.msg || data.errmsg || 'Auth TTLock échouée')
  return data.access_token
}

export async function listLocks(): Promise<{ lockId: number; lockName: string; lockAlias: string }[]> {
  const token = await getToken()
  const params = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID!,
    accessToken: token,
    pageNo: '1',
    pageSize: '20',
    date: String(Date.now()),
  })

  const res = await fetch(`${BASE_URL}/v3/lock/list?${params}`)
  const data = await res.json()
  if (data.errcode && data.errcode !== 0) throw new Error(data.errmsg || 'Erreur liste serrures')
  return (data.list || []).map((l: Record<string, unknown>) => ({
    lockId: l.lockId,
    lockName: l.lockName,
    lockAlias: l.lockAlias,
  }))
}

export async function createPasscode(
  lockId: number,
  passcode: string,
  startMs: number,
  endMs: number,
  name?: string
): Promise<number> {
  const token = await getToken()
  const params = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID!,
    accessToken: token,
    lockId: String(lockId),
    keyboardPwdType: '3',
    keyboardPwd: passcode,
    keyboardPwdName: name || passcode,
    startDate: String(startMs),
    endDate: String(endMs),
    addType: '2',
    date: String(Date.now()),
  })

  const res = await fetch(`${BASE_URL}/v3/keyboardPwd/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()
  if (data.errcode && data.errcode !== 0) throw new Error(data.errmsg || 'Erreur création code')
  return data.keyboardPwdId
}

export async function autoGenerateLockCode(
  reservationId: number,
  db: ReturnType<typeof getDb>
): Promise<void> {
  const lockId = Number(process.env.TTLOCK_LOCK_ID)
  if (!lockId) return

  const r = db.prepare(`
    SELECT r.*, p.checkin_time, p.checkout_time
    FROM reservations r JOIN properties p ON r.property_id = p.id
    WHERE r.id = ?
  `).get(reservationId) as Record<string, string | number> | undefined
  if (!r) return

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const startMs = toTimestamp(String(r.checkin_date), String(r.checkin_time || '15:00'))
  const endMs = toTimestamp(String(r.checkout_date), String(r.checkout_time || '11:00'))
  const name = String(r.guest_name || '').split(' ')[0] + ' ' + String(r.checkin_date).slice(0, 7)

  try {
    const pwdId = await createPasscode(lockId, code, startMs, endMs, name)
    db.prepare('UPDATE reservations SET lock_code = ?, ttlock_pwd_id = ? WHERE id = ?')
      .run(code, pwdId, reservationId)
  } catch {
    db.prepare('UPDATE reservations SET lock_code = ? WHERE id = ?').run(code, reservationId)
  }
}

export async function deletePasscode(lockId: number, keyboardPwdId: number): Promise<void> {
  const token = await getToken()
  const params = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID!,
    accessToken: token,
    lockId: String(lockId),
    keyboardPwdId: String(keyboardPwdId),
    deleteType: '2',
    date: String(Date.now()),
  })

  await fetch(`${BASE_URL}/v3/keyboardPwd/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
}
