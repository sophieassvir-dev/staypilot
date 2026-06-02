'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  reservationId: number
  initial: {
    guest_phone: string | null
    guest_email: string | null
    guest_count: number | null
    guest2_firstname: string | null
    has_minor: number | null
    has_animal: string | null
    arrival_time: string | null
    departure_time: string | null
    needs_pet_equipment: number | null
    pet_name: string | null
    pet_description: string | null
  }
}

export default function TallyManualForm({ reservationId, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    guest_phone:        initial.guest_phone ?? '',
    guest_email:        initial.guest_email ?? '',
    guest_count:        initial.guest_count ? String(initial.guest_count) : '',
    guest2_firstname:   initial.guest2_firstname ?? '',
    has_minor:          initial.has_minor != null ? String(initial.has_minor) : '',
    has_animal:         initial.has_animal ?? 'non',
    arrival_time:       initial.arrival_time ?? '',
    departure_time:     initial.departure_time ?? '',
    needs_pet_equipment: initial.needs_pet_equipment != null ? String(initial.needs_pet_equipment) : '',
    pet_name:           initial.pet_name ?? '',
    pet_description:    initial.pet_description ?? '',
  })
  const router = useRouter()

  const save = async () => {
    setSaving(true)
    await fetch(`/api/reservations/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_phone:         form.guest_phone || null,
        guest_email:         form.guest_email || null,
        guest_count:         form.guest_count ? parseInt(form.guest_count) : null,
        guest2_firstname:    form.guest2_firstname || null,
        has_minor:           form.has_minor !== '' ? parseInt(form.has_minor) : null,
        has_animal:          form.has_animal || null,
        arrival_time:        form.arrival_time || null,
        departure_time:      form.departure_time || null,
        needs_pet_equipment: form.needs_pet_equipment !== '' ? parseInt(form.needs_pet_equipment) : null,
        pet_name:            form.pet_name || null,
        pet_description:     form.pet_description || null,
        tally_filled:        1,
      }),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const inputStyle = {
    width: '100%', border: '1px solid var(--lavender)', borderRadius: 8,
    padding: '7px 10px', fontSize: '0.88rem', color: 'var(--dark)', background: 'white',
  }
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 } as const
  const sectionStyle = { fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 12, marginBottom: 6 }

  const showAnimalFields = form.has_animal === 'oui'

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: 6, border: '1px dashed #9B06D4', background: 'white', color: '#9B06D4', cursor: 'pointer', fontWeight: 600 }}
    >
      ✏️ Saisir manuellement
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>

      <div style={sectionStyle}>Voyageurs</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Téléphone</label>
          <input style={inputStyle} type="tel" value={form.guest_phone} placeholder="06 12 34 56 78"
            onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={form.guest_email} placeholder="email@exemple.fr"
            onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Nb voyageurs</label>
          <input style={inputStyle} type="number" min="1" max="20" value={form.guest_count}
            onChange={e => setForm(f => ({ ...f, guest_count: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Prénom 2e voyageur</label>
          <input style={inputStyle} type="text" value={form.guest2_firstname} placeholder="Prénom"
            onChange={e => setForm(f => ({ ...f, guest2_firstname: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Mineur(s) parmi les voyageurs ?</label>
          <select style={inputStyle} value={form.has_minor}
            onChange={e => setForm(f => ({ ...f, has_minor: e.target.value }))}>
            <option value="">Non précisé</option>
            <option value="0">Non</option>
            <option value="1">Oui</option>
          </select>
        </div>
      </div>

      <div style={sectionStyle}>Horaires</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Heure d&apos;arrivée prévue</label>
          <input style={inputStyle} type="time" value={form.arrival_time}
            onChange={e => setForm(f => ({ ...f, arrival_time: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Heure de départ prévue</label>
          <input style={inputStyle} type="time" value={form.departure_time}
            onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} />
        </div>
      </div>

      <div style={sectionStyle}>Animal</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Présence d&apos;un animal</label>
          <select style={inputStyle} value={form.has_animal}
            onChange={e => setForm(f => ({ ...f, has_animal: e.target.value }))}>
            <option value="non">Non</option>
            <option value="oui">Oui</option>
          </select>
        </div>
        {showAnimalFields && (
          <>
            <div>
              <label style={labelStyle}>Gamelles / tapis nécessaires ?</label>
              <select style={inputStyle} value={form.needs_pet_equipment}
                onChange={e => setForm(f => ({ ...f, needs_pet_equipment: e.target.value }))}>
                <option value="">Non précisé</option>
                <option value="0">Non</option>
                <option value="1">Oui</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nom de l&apos;animal</label>
              <input style={inputStyle} type="text" value={form.pet_name} placeholder="Ex : Rex"
                onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Type et taille</label>
              <input style={inputStyle} type="text" value={form.pet_description} placeholder="Ex : Labrador 30 kg"
                onChange={e => setForm(f => ({ ...f, pet_description: e.target.value }))} />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ fontSize: '0.85rem' }}>
          {saving ? 'Enregistrement...' : '✅ Enregistrer'}
        </button>
        <button onClick={() => setOpen(false)} style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--lavender)', background: 'white', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}
