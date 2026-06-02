'use client'
import { useState, useEffect } from 'react'

interface Template {
  id: number
  name: string
  trigger: string
  delay_hours: number
  send_hour: number | null
  subject: string
  body: string
  property_name: string
  active: number
}

const TRIGGER_TIMING: Record<string, { label: string; ref: string; sign: 'before' | 'after' | 'fixed' | 'hour' }> = {
  booking_confirmed: { label: 'Dès la réservation', ref: '', sign: 'fixed' },
  tally_reminder:    { label: 'jours avant l\'arrivée', ref: 'arrivée', sign: 'before' },
  pre_checkin:       { label: 'jours avant l\'arrivée', ref: 'arrivée', sign: 'before' },
  checkin_codes:     { label: 'Jour de l\'arrivée à', ref: 'arrivée', sign: 'hour' },
  post_first_night:  { label: 'jours après l\'arrivée', ref: 'arrivée', sign: 'after' },
  pre_checkout:      { label: 'jours avant le départ', ref: 'départ', sign: 'before' },
  checkout_day:      { label: 'Jour du départ à', ref: 'départ', sign: 'hour' },
  post_checkout:     { label: 'jours après le départ', ref: 'départ', sign: 'after' },
}

const triggerLabel: Record<string, string> = {
  booking_confirmed: '✅ Réservation confirmée',
  tally_reminder: '📋 Rappel formulaire',
  pre_checkin: '🎉 Séjour bientôt',
  checkin_codes: '🔑 Codes d\'accès',
  post_first_night: '😊 Lendemain arrivée',
  pre_checkout: '🧹 Veille départ',
  checkout_day: '👋 Jour du départ',
  post_checkout: '⭐ Demande d\'avis',
}

const VARS = ['{{prenom}}', '{{logement}}', '{{date_arrivee}}', '{{date_depart}}', '{{heure_arrivee}}', '{{heure_depart}}', '{{guide_url}}', '{{tally_url}}', '{{code_acces}}', '{{video_serrure}}']

export default function MessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ subject: '', body: '', delay_hours: 0, send_hour: null as number | null })
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  const toggleActive = async (t: Template) => {
    setToggling(t.id)
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    })
    setTemplates(ts => ts.map(m => m.id === t.id ? { ...m, active: t.active ? 0 : 1 } : m))
    setToggling(null)
  }

  useEffect(() => {
    fetch('/api/messages').then(r => r.json()).then(setTemplates)
  }, [])

  const startEdit = (t: Template) => {
    setEditing(t.id)
    setForm({ subject: t.subject || '', body: t.body, delay_hours: Math.abs(t.delay_hours ?? 0) / 24, send_hour: t.send_hour ?? null })
  }

  const save = async (id: number, trigger: string) => {
    setSaving(true)
    const timing = TRIGGER_TIMING[trigger]
    const delay = timing?.sign === 'before'
      ? -(form.delay_hours * 24)
      : timing?.sign === 'after' ? form.delay_hours * 24 : 0
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject: form.subject, body: form.body, delay_hours: delay, send_hour: form.send_hour }),
    })
    setTemplates(ts => ts.map(t => t.id === id ? { ...t, subject: form.subject, body: form.body, send_hour: form.send_hour } : t))
    setEditing(null)
    setSaving(false)
  }

  const insertVar = (v: string) => {
    setForm(f => ({ ...f, body: f.body + v }))
  }

  const grouped: Record<string, Template[]> = {}
  for (const t of templates) {
    const key = t.property_name || 'Tous les biens'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(t)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 4 }}>💬 Messages automatiques</h1>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 24 }}>Clique sur ✏️ pour modifier un message.</p>

      <div className="card" style={{ marginBottom: 20, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p style={{ fontSize: '0.82rem', color: '#0369a1', marginBottom: 6, fontWeight: 600 }}>Variables disponibles :</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VARS.map(v => (
            <code key={v} style={{ background: 'white', border: '1px solid #bae6fd', borderRadius: 4, padding: '2px 6px', fontSize: '0.78rem', color: '#0369a1' }}>{v}</code>
          ))}
        </div>
      </div>

      {Object.entries(grouped).map(([propertyName, msgs]) => (
        <div key={propertyName} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--violet)', marginBottom: 12 }}>🏡 {propertyName}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgs.map(m => (
              <div key={m.id} className="card" style={{ borderLeft: `4px solid ${m.active ? 'var(--purple)' : '#cbd5e1'}`, opacity: m.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--violet)' }}>
                    {triggerLabel[m.trigger] || m.name}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => toggleActive(m)}
                      disabled={toggling === m.id}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: m.active ? '#dcfce7' : '#f1f5f9',
                        color: m.active ? '#16a34a' : '#94a3b8',
                      }}
                    >
                      {m.active ? '● Actif' : '○ Inactif'}
                    </button>
                    <button
                      onClick={() => editing === m.id ? setEditing(null) : startEdit(m)}
                      style={{ background: 'none', border: '1px solid var(--lavender)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--violet)' }}
                    >
                      {editing === m.id ? 'Annuler' : '✏️ Modifier'}
                    </button>
                  </div>
                </div>

                {editing === m.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Timing */}
                    {TRIGGER_TIMING[m.trigger]?.sign !== 'fixed' && (
                      <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>⏰ Envoi</label>
                        {TRIGGER_TIMING[m.trigger]?.sign === 'hour' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                            <span>{TRIGGER_TIMING[m.trigger].label}</span>
                            <input type="number" min={0} max={23} value={form.send_hour ?? 15}
                              onChange={e => setForm(f => ({ ...f, send_hour: parseInt(e.target.value) }))}
                              style={{ width: 60, border: '1px solid var(--lavender)', borderRadius: 6, padding: '4px 8px', fontSize: '0.88rem' }} />
                            <span>h00</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                            <input type="number" min={1} max={30} value={form.delay_hours}
                              onChange={e => setForm(f => ({ ...f, delay_hours: parseInt(e.target.value) }))}
                              style={{ width: 60, border: '1px solid var(--lavender)', borderRadius: 6, padding: '4px 8px', fontSize: '0.88rem' }} />
                            <span>{TRIGGER_TIMING[m.trigger]?.label}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Sujet</label>
                      <input
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Message</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {VARS.map(v => (
                          <button key={v} onClick={() => insertVar(v)}
                            style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: '2px 6px', fontSize: '0.72rem', cursor: 'pointer', color: '#0369a1' }}>
                            + {v}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={form.body}
                        onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                        rows={10}
                        style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }}
                      />
                    </div>
                    <button className="btn-primary" onClick={() => save(m.id, m.trigger)} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                      {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                    </button>
                  </div>
                ) : (
                  <>
                    {m.subject && <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 6 }}>Sujet : <strong>{m.subject}</strong></div>}
                    <pre style={{ fontSize: '0.82rem', color: '#475569', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8, lineHeight: 1.6, fontFamily: 'inherit' }}>
                      {m.body}
                    </pre>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
