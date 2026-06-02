'use client'
import { useState, useEffect } from 'react'

interface Template {
  id: number
  name: string
  trigger: string
  delay_hours: number | null
  send_hour: number | null
  subject: string
  body: string
  active: number
}

const TRIGGER_LABELS: Record<string, string> = {
  tally_reminder: '10 jours avant (si formulaire non rempli)',
  pre_checkin: '3 jours avant l\'arrivée',
  checkin_codes: 'Jour d\'arrivée à 15h',
  post_first_night: 'Lendemain de l\'arrivée à 9h',
  pre_checkout: 'Veille du départ',
  checkout_day: 'Jour du départ',
  post_checkout: 'Lendemain du départ',
}

const VARIABLES = ['{{prenom}}', '{{nom_complet}}', '{{logement}}', '{{date_arrivee}}', '{{date_depart}}', '{{heure_arrivee}}', '{{heure_depart}}', '{{code_acces}}', '{{guide_url}}', '{{tally_url}}', '{{video_serrure}}']

function TemplateEditor({ tpl, onSaved }: { tpl: Template; onSaved: () => void }) {
  const [subject, setSubject] = useState(tpl.subject)
  const [body, setBody] = useState(tpl.body)
  const [active, setActive] = useState(!!tpl.active)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tpl.id, subject, body }),
    })
    setSaving(false)
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 2000)
  }

  const toggle = async () => {
    const next = !active
    setActive(next)
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tpl.id, active: next }),
    })
    onSaved()
  }

  return (
    <div style={{ border: '1px solid var(--lavender)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: active ? 'white' : '#f8f8fb' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={e => { e.stopPropagation(); toggle() }}
            style={{
              width: 36, height: 20, borderRadius: 10, background: active ? 'var(--violet)' : '#cbd5e1',
              position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: active ? 18 : 3, width: 14, height: 14,
              borderRadius: '50%', background: 'white', transition: 'left 0.2s',
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--violet)' }}>{tpl.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{TRIGGER_LABELS[tpl.trigger] || tpl.trigger}</div>
          </div>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: 16, borderTop: '1px solid var(--lavender)', background: 'white' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Objet</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Message</label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)} rows={12}
              style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {VARIABLES.map(v => (
              <span
                key={v} onClick={() => setBody(b => b + v)}
                style={{ fontSize: '0.72rem', background: '#ede9fe', color: 'var(--violet)', padding: '2px 8px', borderRadius: 20, cursor: 'pointer', fontFamily: 'monospace' }}
              >{v}</span>
            ))}
          </div>
          <button className="btn-primary" onClick={save} disabled={saving} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
            {saved ? '✅ Enregistré !' : saving ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MessagesAutoPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ sent: number; log: string[] } | null>(null)
  const [tallyUrl, setTallyUrl] = useState('https://tally.so/r/mVygQ6')
  const [videoUrl, setVideoUrl] = useState('https://youtu.be/lnPeEwGudZg')
  const [saving, setSaving] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [siret, setSiret] = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [legalCity, setLegalCity] = useState('')
  const [savingLegal, setSavingLegal] = useState(false)
  const [savedLegal, setSavedLegal] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  const loadTemplates = async () => {
    const res = await fetch('/api/messages')
    const data = await res.json()
    setTemplates(data)
  }

  useEffect(() => { loadTemplates() }, [])

  const run = async () => {
    setRunning(true)
    setResult(null)
    const res = await fetch('/api/scheduler', { method: 'POST' })
    const data = await res.json()
    setResult(data)
    setRunning(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tally_url: tallyUrl, video_serrure_url: videoUrl }),
    })
    setSaving(false)
  }

  const saveLegal = async () => {
    setSavingLegal(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legal_name: legalName, siret, legal_address: legalAddress, legal_city: legalCity }),
    })
    setSavingLegal(false)
    setSavedLegal(true)
    setTimeout(() => setSavedLegal(false), 3000)
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 8 }}>
        💬 Messages automatiques
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 32 }}>
        StayPilot envoie automatiquement les bons messages au bon moment pour chaque réservation.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>✉️ Templates de messages</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
          Clique sur un message pour modifier son contenu. Les variables entre <code style={{ background: '#ede9fe', padding: '1px 4px', borderRadius: 4 }}>{'{{'}…{'}}'}</code> sont remplacées automatiquement.
        </p>
        {templates.map(tpl => (
          <TemplateEditor key={tpl.id} tpl={tpl} onSaved={loadTemplates} />
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 4 }}>🧾 Infos légales (factures)</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
          Ces infos apparaissent sur toutes les factures générées.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Nom légal</label>
              <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Prénom NOM"
                style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>SIRET</label>
              <input type="text" value={siret} onChange={e => setSiret(e.target.value)} placeholder="000 000 000 00000"
                style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Adresse</label>
              <input type="text" value={legalAddress} onChange={e => setLegalAddress(e.target.value)} placeholder="12 rue de la Paix"
                style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Ville + code postal</label>
              <input type="text" value={legalCity} onChange={e => setLegalCity(e.target.value)} placeholder="14000 Caen"
                style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
            </div>
          </div>
          <button className="btn-primary" onClick={saveLegal} disabled={savingLegal} style={{ alignSelf: 'flex-start' }}>
            {savedLegal ? '✅ Enregistré !' : savingLegal ? 'Enregistrement...' : '💾 Enregistrer les infos légales'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>⚙️ Paramètres messages</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>URL formulaire Tally</label>
            <input type="url" value={tallyUrl} onChange={e => setTallyUrl(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>URL vidéo serrure</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..."
              style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem' }} />
          </div>
          <button className="btn-primary" onClick={saveSettings} disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>🚀 Lancer le scheduler</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
          Se lance automatiquement toutes les heures via Vercel Cron. Tu peux aussi le déclencher manuellement.
        </p>
        <button className="btn-primary" onClick={run} disabled={running}>
          {running ? '⏳ En cours...' : '▶️ Lancer maintenant'}
        </button>

        {result && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 12 }}>
              {result.sent} message{result.sent > 1 ? 's' : ''} envoyé{result.sent > 1 ? 's' : ''}
            </div>
            {result.log.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.log.map((line, i) => (
                  <div key={i} style={{ fontSize: '0.88rem', color: '#16a34a' }}>{line}</div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Aucun message à envoyer pour le moment.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
