'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
  parseISO, isBefore, isAfter, isSameDay
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface Reservation {
  id: number
  property_id: number
  property_name: string
  guest_name: string
  checkin_date: string
  checkout_date: string
  nights: number
  total_revenue: number
  lock_code: string
  platform: string
}

const PROPERTY_COLORS = [
  { bg: '#EDE9FE', border: '#7C3AED', text: '#4C1D95' },
  { bg: '#CFFAFE', border: '#0891B2', text: '#164E63' },
  { bg: '#FCE7F3', border: '#DB2777', text: '#831843' },
  { bg: '#FEF3C7', border: '#D97706', text: '#78350F' },
  { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' },
  { bg: '#FFE4E6', border: '#E11D48', text: '#881337' },
]

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [propertyColors, setPropertyColors] = useState<Record<number, typeof PROPERTY_COLORS[0]>>({})

  const fetchReservations = useCallback(async (month: Date) => {
    setLoading(true)
    const from = format(startOfMonth(month), 'yyyy-MM-dd')
    const to = format(endOfMonth(month), 'yyyy-MM-dd')
    const res = await fetch(`/api/reservations/range?from=${from}&to=${to}`)
    const data: Reservation[] = await res.json()
    setReservations(data)

    // Assign colors to properties
    const colors: Record<number, typeof PROPERTY_COLORS[0]> = {}
    let i = 0
    for (const r of data) {
      if (!colors[r.property_id]) {
        colors[r.property_id] = PROPERTY_COLORS[i % PROPERTY_COLORS.length]
        i++
      }
    }
    setPropertyColors(colors)
    setLoading(false)
  }, [])

  useEffect(() => { fetchReservations(currentMonth) }, [currentMonth, fetchReservations])

  const prev = () => setCurrentMonth(m => subMonths(m, 1))
  const next = () => setCurrentMonth(m => addMonths(m, 1))

  // Build calendar grid (Mon → Sun)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = gridStart
  while (!isAfter(d, gridEnd)) { days.push(d); d = addDays(d, 1) }

  const getReservationsForDay = (day: Date) =>
    reservations.filter(r => {
      const ci = parseISO(r.checkin_date)
      const co = parseISO(r.checkout_date)
      return !isBefore(day, ci) && isBefore(day, co)
    })

  const isCheckin = (r: Reservation, day: Date) => isSameDay(parseISO(r.checkin_date), day)
  const isCheckout = (r: Reservation, day: Date) => isSameDay(parseISO(r.checkout_date), addDays(day, 1)) ||
    isSameDay(parseISO(r.checkout_date), day)

  const totalRevenue = reservations.reduce((s, r) => s + r.total_revenue, 0)
  const totalNights = reservations.reduce((s, r) => s + r.nights, 0)

  return (
    <div>
      {/* Header navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={prev} style={{ background: 'white', border: '1px solid var(--lavender)', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', color: 'var(--violet)' }}>‹</button>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--violet)', textTransform: 'capitalize', minWidth: 200, textAlign: 'center' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button onClick={next} style={{ background: 'white', border: '1px solid var(--lavender)', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', color: 'var(--violet)' }}>›</button>
          <button onClick={() => setCurrentMonth(new Date())} style={{ background: 'var(--lavender)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--violet)', fontWeight: 600 }}>
            Aujourd&apos;hui
          </button>
        </div>

        {/* Stats du mois */}
        <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, color: 'var(--violet)', fontSize: '1.1rem' }}>{reservations.length}</div>
            <div style={{ color: '#64748b' }}>réservations</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, color: 'var(--violet)', fontSize: '1.1rem' }}>{totalNights}</div>
            <div style={{ color: '#64748b' }}>nuits louées</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, color: '#166534', fontSize: '1.1rem' }}>{totalRevenue.toFixed(0)} €</div>
            <div style={{ color: '#64748b' }}>revenus</div>
          </div>
        </div>
      </div>

      {/* Légende propriétés */}
      {Object.keys(propertyColors).length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {reservations
            .filter((r, i, arr) => arr.findIndex(x => x.property_id === r.property_id) === i)
            .map(r => {
              const c = propertyColors[r.property_id]
              return (
                <div key={r.property_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: c.border }} />
                  <span style={{ color: 'var(--dark)' }}>{r.property_name}</span>
                </div>
              )
            })}
        </div>
      )}

      {/* Grille calendrier */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* En-têtes jours */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--gradient)' }}>
          {JOURS.map(j => (
            <div key={j} style={{ padding: '10px 0', textAlign: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>{j}</div>
          ))}
        </div>

        {/* Jours */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((day, idx) => {
              const dayRes = getReservationsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 90,
                    borderRight: '1px solid var(--lavender)',
                    borderBottom: '1px solid var(--lavender)',
                    padding: '6px 4px 4px',
                    background: !isCurrentMonth ? '#fafafa' : isWeekend ? '#fdfaff' : 'white',
                    position: 'relative',
                    cursor: dayRes.length > 0 ? 'pointer' : 'default',
                  }}
                >
                  {/* Numéro du jour */}
                  <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    width: 26, height: 26, borderRadius: '50%', marginBottom: 4, marginLeft: 2,
                    background: isCurrentDay ? 'var(--purple)' : 'transparent',
                    color: isCurrentDay ? 'white' : isCurrentMonth ? 'var(--dark)' : '#cbd5e1',
                    fontSize: '0.82rem', fontWeight: isCurrentDay ? 700 : 400,
                  }}>
                    {format(day, 'd')}
                  </div>

                  {/* Réservations */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayRes.map(r => {
                      const c = propertyColors[r.property_id] || PROPERTY_COLORS[0]
                      const ci = isCheckin(r, day)
                      const co = isCheckout(r, day)
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelected(selected?.id === r.id ? null : r)}
                          title={`${r.guest_name} — ${r.property_name}`}
                          style={{
                            background: c.bg,
                            borderLeft: ci ? `3px solid ${c.border}` : 'none',
                            borderRight: co ? `3px solid ${c.border}` : 'none',
                            borderTop: `1px solid ${c.border}`,
                            borderBottom: `1px solid ${c.border}`,
                            borderRadius: ci && co ? 6 : ci ? '6px 0 0 6px' : co ? '0 6px 6px 0' : 0,
                            padding: '2px 5px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: c.text,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ci ? `🔑 ${r.guest_name.split(' ')[0]}` : co ? '🚪' : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panneau détail réservation sélectionnée */}
      {selected && (
        <div className="card" style={{ marginTop: 16, borderLeft: `4px solid ${(propertyColors[selected.property_id] || PROPERTY_COLORS[0]).border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--violet)', marginBottom: 4 }}>{selected.guest_name}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>🏡 {selected.property_name}</div>
              <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem' }}>
                <div><span style={{ color: '#64748b' }}>Arrivée</span> · <strong>{format(parseISO(selected.checkin_date), 'd MMMM', { locale: fr })}</strong></div>
                <div><span style={{ color: '#64748b' }}>Départ</span> · <strong>{format(parseISO(selected.checkout_date), 'd MMMM', { locale: fr })}</strong></div>
                <div><span style={{ color: '#64748b' }}>Durée</span> · <strong>{selected.nights} nuit{selected.nights > 1 ? 's' : ''}</strong></div>
                {selected.lock_code && <div><span style={{ color: '#64748b' }}>Code</span> · <strong style={{ color: 'var(--purple)' }}>{selected.lock_code}</strong></div>}
                {selected.total_revenue > 0 && <div><span style={{ color: '#64748b' }}>Revenus</span> · <strong style={{ color: '#166534' }}>{selected.total_revenue.toFixed(0)} €</strong></div>}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>✕</button>
          </div>
        </div>
      )}

      {/* Message si aucune réservation */}
      {!loading && reservations.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: '0.9rem' }}>
          Aucune réservation ce mois-ci
        </div>
      )}
    </div>
  )
}
