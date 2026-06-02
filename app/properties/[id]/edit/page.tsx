'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    name: '', address: '', city: '', max_guests: 2,
    wifi_name: '', wifi_password: '', checkin_time: '16:00', checkout_time: '11:00',
    cleaner_name: '', cleaner_email: '', owner_name: '', owner_email: '',
    contact_email: '', commission_rate: 20, platforms: 'airbnb',
    notes: '', ical_url: '', guide_url: '',
  })

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then(r => r.json())
      .then(data => { setForm(f => ({ ...f, ...data })); setFetching(false) })
  }, [id])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) router.push(`/properties/${id}`)
    else setLoading(false)
  }

  const field = (label: string, name: string, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>{label}</label>
      <input
        type={type} name={name} placeholder={placeholder}
        value={(form as Record<string, string | number>)[name] as string ?? ''}
        onChange={handle}
        style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', background: 'white' }}
      />
    </div>
  )

  if (fetching) return <div style={{ color: '#94a3b8', padding: 40 }}>Chargement...</div>

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 24 }}>✏️ Modifier le bien</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>Informations générales</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {field('Nom du bien', 'name', 'text', 'Les Embruns')}
            {field('Adresse', 'address', 'text', '12 rue de la plage')}
            {field('Ville', 'city', 'text', 'Villers-sur-Mer')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('Nombre max de personnes', 'max_guests', 'number')}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Plateforme</label>
                <select name="platforms" value={form.platforms} onChange={handle} style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', background: 'white' }}>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                  <option value="airbnb,booking">Airbnb + Booking</option>
                  <option value="autres">Autres</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>📧 Email de contact</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
            Adresse utilisée en réponse aux emails envoyés aux voyageurs (factures, messages auto).
          </p>
          {field('Votre email de contact', 'contact_email', 'email', 'sophie@exemple.fr')}
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>Check-in / Check-out</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            {field('Heure check-in', 'checkin_time', 'time')}
            {field('Heure check-out', 'checkout_time', 'time')}
            {field('Wifi — Réseau', 'wifi_name', 'text', 'Embruns-5G')}
            {field('Wifi — Mot de passe', 'wifi_password')}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>🧹 Prestataire ménage</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {field('Nom du prestataire', 'cleaner_name')}
            {field('Email prestataire', 'cleaner_email', 'email')}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>Propriétaire (si client géré)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {field('Nom du propriétaire', 'owner_name')}
            {field('Email propriétaire', 'owner_email', 'email')}
            {field('Commission (%)', 'commission_rate', 'number')}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>🔄 Synchronisation iCal</h2>
          {field('URL iCal Airbnb', 'ical_url', 'url', 'https://www.airbnb.fr/calendar/ical/...')}
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>📖 Guide du logement</h2>
          {field('URL du guide', 'guide_url', 'url', 'https://notion.so/mon-guide-logement')}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : '✅ Enregistrer'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.push(`/properties/${id}`)}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
