'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Property } from '@/lib/types'

export default function NewReservationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [form, setForm] = useState({
    property_id: '', guest_name: '', guest_email: '', guest_phone: '',
    checkin_date: '', checkout_date: '', price_per_night: '', platform: 'airbnb', notes: '',
  })

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(setProperties)
  }, [])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/reservations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, property_id: parseInt(form.property_id), price_per_night: parseFloat(form.price_per_night) }),
    })
    if (res.ok) router.push('/reservations')
    else setLoading(false)
  }

  const field = (label: string, name: string, type = 'text', required = false, placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>{label}{required && ' *'}</label>
      <input
        type={type} name={name} required={required} placeholder={placeholder}
        value={(form as Record<string, string>)[name]}
        onChange={handle}
        style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', outline: 'none', background: 'white' }}
      />
    </div>
  )

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 24 }}>📅 Nouvelle réservation</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Bien *</label>
            <select name="property_id" required value={form.property_id} onChange={handle}
              style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', background: 'white' }}>
              <option value="">Sélectionner un bien</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {field('Nom du voyageur', 'guest_name', 'text', true, 'Marie Dupont')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('Email voyageur', 'guest_email', 'email')}
              {field('Téléphone', 'guest_phone', 'tel')}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {field('Date arrivée', 'checkin_date', 'date', true)}
            {field('Date départ', 'checkout_date', 'date', true)}
            {field('Prix/nuit (€)', 'price_per_night', 'number', true, '95')}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Plateforme</label>
            <select name="platform" value={form.platform} onChange={handle}
              style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', background: 'white' }}>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking.com</option>
              <option value="direct">Direct</option>
              <option value="autres">Autres</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : '✅ Enregistrer'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.push('/reservations')}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
